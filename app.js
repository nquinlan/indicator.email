var express = require('express');
var basicAuth = require('basic-auth-connect');
var google = require('googleapis');
var db = require ('./middleware/db');
var uuid = require('node-uuid');
var _ = require('lodash');
var async = require('async');

var dotenv = require('dotenv');
dotenv.load();

var GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
var GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
var GOOGLE_REDIRECT_URL = process.env.GOOGLE_REDIRECT_URL;
var MONGODB_URL = process.env.MONGODB_URL || process.env.MONGOHQ_URL;

var googleAuthClient = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URL);
var gmail = google.gmail('v1');
var plus = google.plus('v1'); 

var app = express();
app.use( db(MONGODB_URL) );

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
			console.log(user);
			var userUpsert = { 
				$set : user,
				$setOnInsert : {
					userHash : user.userHash
				},
				$currentDate: { lastModified: true }
			};
			delete userUpsert.$set.userHash;
			req.db.collection('users').update({ email : user.email }, userUpsert, { upsert: true }, function (err, doc) {
				// Token stored, redirect to indicator page
				// Schedule Iron Worker
				res.send("rockin");
			});
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

app.all('/api/*', basicAuth(process.env['API_CLIENT_ID'], process.env['API_CLIENT_SECRET']));

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


app.all('/user/:user*', userLookup)
app.get('/user/:user/indicator.:format', function (req, res) {
	getInbox(req.db, req.user, function (err, inbox) {
		var inboxes = req.db.collection('inboxes').find({ user: req.user.userHash });
		// Get Median
		inboxes.count(function(err, inboxCount){
			async.parallel({
				first:  function (callback) { getQuartile(1, req.db, req.user, inboxCount, callback) },
				second: function (callback) { getQuartile(2, req.db, req.user, inboxCount, callback) },
				third:  function (callback) { getQuartile(3, req.db, req.user, inboxCount, callback) }
			},
			function (err, quartiles) {
				console.log("quartiles", err, quartiles);
				if(inbox.count > quartiles.third) {
					res.send("RED");
				} else if(inbox.count < quartiles.first) {
					res.send("GREEN");
				} else {
					res.send("YELLOW");
				}

			});
		});
		
	});
})

var server = app.listen(3000, function() {
	console.log('Listening on port %d', server.address().port);
});
