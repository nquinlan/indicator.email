var express = require('express');
var google = require("googleapis");
var db = require ('./middleware/db');
var uuid = require('node-uuid');

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
			req.db.collection('users').insert(user, function (err, doc) {
				// Token stored, redirect to indicator page
				res.send("rockin");
			});
		});
	});
});

var server = app.listen(3000, function() {
	console.log('Listening on port %d', server.address().port);
});
