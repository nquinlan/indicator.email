var express = require('express');
var basicAuth = require('basic-auth-connect');
var google = require('googleapis');
var db = require ('./middleware/db');
var uuid = require('node-uuid');
var _ = require('lodash');
var async = require('async');
var iron_worker = require('iron_worker');

require('enum').register();

var dotenv = require('dotenv');
dotenv.load();

var GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
var GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
var GOOGLE_REDIRECT_URL = process.env.GOOGLE_REDIRECT_URL;
var MONGODB_URL = process.env.MONGODB_URL || process.env.MONGOHQ_URL || process.env.MONGOLAB_URI;
var IRON_WORKER_TOKEN = process.env.IRON_WORKER_TOKEN;
var IRON_WORKER_PROJECT_ID = process.env.IRON_WORKER_PROJECT_ID;
var API_CLIENT_ID = process.env.API_CLIENT_ID;
var API_CLIENT_SECRET = process.env.API_CLIENT_SECRET;
var PORT = process.env.PORT || 3000;

var googleAuthClient = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URL);
var gmail = google.gmail('v1');
var plus = google.plus('v1'); 

var worker = new iron_worker.Client({token: IRON_WORKER_TOKEN, project_id: IRON_WORKER_PROJECT_ID});

var app = express();
app.use( db(MONGODB_URL) );

var INDICATOR_CACHE_TIME =  process.env.INDICATOR_CACHE_TIME || 0;

var indicatorTypes = new Enum(['unknown', 'bad', 'good', 'okay']);

var root = __dirname;

// TEMP CATCH ALL ERROR MESSAGE
app.all('*', function (req, res, next) {
	res.error = function (code, message, more) {
		var error = {
			"error" : true,
			"message" : message
		};

		error = _.merge(error, more || {});

		res.status(code);
		res.send(error);
		res.end();
	}
	next();
});

app.get('/', function(req, res){
	req.db.collection('users').find().toArray(function(err, users) {
		console.log(users);
	});
	res.send('indicator.email');
});

app.get('/oauth/google/authenticate', function (req, res) {
	var url = googleAuthClient.generateAuthUrl({
		access_type: 'offline',
		scope: [
			'https://www.googleapis.com/auth/plus.me',
			'https://www.googleapis.com/auth/userinfo.email',
			'https://www.googleapis.com/auth/gmail.readonly'
		]
	});
	res.redirect(302, url);	
});

app.get('/oauth/google', function (req, res) {
	console.log(req.query);
	googleAuthClient.getToken(req.query.code, function (err, tokens) {
		console.log(err);
		console.log(tokens);
		googleAuthClient.setCredentials(tokens);
		plus.people.get({ userId: 'me', auth: googleAuthClient }, function(err, profile) {
			console.log(err);
			console.log(profile);
			// store tokens in db
			var user = {};
			user.tokens = {};
			user.tokens.google = tokens;
			profile.emails.forEach(function (email) {
				if(email.type == "account"){
					user.email = email.value;
				}
			});
			user.userHash = uuid.v1();
			user.lastModified = new Date();
			var userHash = user.userHash;
			var userUpsert = { 
				$set : user,
				$setOnInsert : {
					userHash : userHash
				}
			};
			delete userUpsert.$set.userHash;
			req.db.collection('users').findAndModify(
				{ email : user.email },
				[['_id','asc']],
				userUpsert,
				{ upsert: true, new: true },
				function (err, doc) {
					// Token stored, redirect to indicator page
					// Schedule Iron Worker
					if(err) {
						console.log(err);
						res.send("darn");
						return false;
					}

					console.log(doc, user);
					console.log("docHash, userHash", doc.userHash, user.userHash, userHash);


					if(doc.userHash === userHash) {
						worker.schedulesCreate(
							"poll", 
							{
								user: doc.userHash,
								host: req.get('host'),
								api_user: API_CLIENT_ID,
								api_key: API_CLIENT_SECRET
							},
							{
								"start_at" : Math.floor((new Date()).getTime()/1000),
								"run_every" : 60*60*6
							},
							function (err, workerInfo) {
								console.log(workerInfo);
								req.db.collection('users').update({ userHash : user.userHash}, { $set : { worker : workerInfo } }, function (err, doc) {});
							}
						);
						res.send("rockin, created: " + doc.userHash);
					} else {
						res.send("rockin, updated: " + doc.userHash);
					}

				
				}
			);
		});
	});
});

function getInbox (db, user, cb) {
	googleAuthClient.setCredentials(user.tokens.google);
	gmail.users.messages.list({ q: "in:inbox", userId: user.email, auth: googleAuthClient}, function (err, inbox) {
		if (err) {
			cb(err, null);
		}
		inbox.count = inbox.resultSizeEstimate;
		inbox.exact = false;
		if(!inbox.nextPageToken) {
			inbox.count = inbox.messages ? inbox.messages.length : 0;
			inbox.exact = true;
		}
		var publicInbox = { count: inbox.count, exact: inbox.exact };
		cb(null, publicInbox);
	})
}

function saveInbox (db, user, inbox) {
	inbox.user = user.userHash;
	inbox.lastModified = new Date();
	db.collection('inboxes').insert(inbox, function (err, doc) {
		if(err) {
			throw err;
		}
	});
}

function userLookup (req, res, next) {
	var user = req.params.user;
	req.db.collection('users').findOne({ userHash : user }, function (err, doc) {
		if(err || doc === null) {
			res.error(401, "A user could not be found. Please specify an existing user.");
		}
		req.user = doc;
		next();
	}) 
}

app.all('/api/*', basicAuth(API_CLIENT_ID, API_CLIENT_SECRET));

app.all('/api/*', function (req, res, next) {
	res.error = function (code, message, more) {
		var error = {
			"error" : true,
			"message" : message
		};

		error = _.merge(error, more || {});

		res.status(code);
		res.send(error);
		res.end();
	}
	next();
});

app.all('/api/user/:user*', userLookup);

app.get('/api/user/:user/inbox', function (req, res) {
	getInbox(req.db, req.user, function (err, inbox) {
		inbox.api = true;
		inbox.regular = Boolean(req.query.regular);
		saveInbox(req.db, req.user, inbox);
		res.send(inbox);
	});
});

function getQuartile (q, db, user, count, cb) {
	db.collection('inboxes').findOne(
		{ user: user.userHash },
		{ count: true },
		{ 
			sort : "count",
			skip : count * q/4 - 1,
			limit : 1
		},
		function (err, doc) {
			cb(err, doc);
		}
	);
}

function sendIndicator (indicatorType, requestedFormat, res) {
	var format = "svg";
	if(requestedFormat.toLowerCase() == "png") {
		format = "png"
	}

	console.log(indicatorType);

	var indicatorName;
	switch (indicatorType) {
		case indicatorTypes.good:
			indicatorName = "good";
			break;
		case indicatorTypes.bad:
			indicatorName = "bad";
			break;
		case indicatorTypes.okay:
			indicatorName = "okay";
			break;
		case indicatorTypes.unknown:
		default:
			indicatorName = "unknown";
			break;
	}

	console.log("SENDING FILE", root + "/assets/indicators/" + indicatorName + "." + format);

	return res.sendFile(root + "/assets/indicators/" + indicatorName + "." + format, {
		maxAge : INDICATOR_CACHE_TIME
	});
}

app.all('/user/:user/indicator.:format', function (req, res, next) {
	
	var requestedFormat = req.params.format;

	res.error = function (code, message, more) {
		var error = {
			"error" : true,
			"message" : message
		};

		error = _.merge(error, more || {});

		res.set('X-Error', JSON.stringify(error));

		console.log(indicatorTypes.unknown, requestedFormat, res);
		sendIndicator(indicatorTypes.unknown, requestedFormat, res);
		return;
	}
	
	next();
});

app.all('/user/:user*', userLookup);

app.get('/user/:user', function (req, res) {
	res.send(
				'<h1>' + req.user.email + '</h1>' + 
				'<p><em>indicator.email shows the status of a user\'s inbox.</em></p>' +
				'<p><img src="./indicator.svg"></p>' +
				'<p>When a user\'s inbox is overfull the light will be red. Yellow indicates an average inbox and green a near empty one.</p>'
			);
});

app.get('/user/:user/indicator.:format', function (req, res) {
	if(!req.user) {
		return false;
	}
	
	getInbox(req.db, req.user, function (err, inbox) {
		var inboxes = req.db.collection('inboxes').find({ user: req.user.userHash });
		// Get Median
		inboxes.count(function(err, inboxCount){
			// If we have a few inboxes let's give a data driven indicator, otherwise let's use our numbers.
			if(inboxCount > 7) {
				async.parallel({
					first:  function (callback) { getQuartile(1, req.db, req.user, inboxCount, callback) },
					second: function (callback) { getQuartile(2, req.db, req.user, inboxCount, callback) },
					third:  function (callback) { getQuartile(3, req.db, req.user, inboxCount, callback) }
				},
				function (err, quartiles) {
					console.log("quartiles", err, quartiles);
					var indicatorType = indicatorTypes.unknown;
					if(err) {
						sendIndicator(indicatorType, req.params.format, res);
						return false;
					}

					if(inbox.count > quartiles.third) {
						var indicatorType = indicatorTypes.bad;
					} else if(inbox.count < quartiles.first) {
						var indicatorType = indicatorTypes.good;
					} else {
						var indicatorType = indicatorTypes.okay;
					}
					sendIndicator(indicatorType, req.params.format, res);
				});
			}else{
				if(inbox.count > 10) {
					var indicatorType = indicatorTypes.bad;
				} else if(inbox.count < 5) {
					var indicatorType = indicatorTypes.good;
				} else {
					var indicatorType = indicatorTypes.okay;
				}
				sendIndicator(indicatorType, req.params.format, res);
			}
		});
		
	});
})

var server = app.listen(PORT, function() {
	console.log('Listening on port %d', server.address().port);
});
