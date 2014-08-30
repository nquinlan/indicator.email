var express = require('express');
var app = express();

var google = require("googleapis");

var dotenv = require('dotenv');
dotenv.load();

var GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
var GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_ID;
var GOOGLE_REDIRECT_URL = process.env.GOOGLE_REDIRECT_URL;

var googleAuthClient = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URL);

app.get('/', function(req, res){
	res.send('indicator.email');
});

app.get('/oauth/google/authenticate', function (req, res) {
	var url = googleAuthClient.generateAuthUrl({
		scope: 'https://www.googleapis.com/auth/gmail.readonly'
	});
	res.redirect(302, url);	
});

app.get('/oauth/google', function (req, res) {
	googleAuthClient.getToken(req.params.code, function (err, tokens) {
		googleAuthClient.setCredentials(tokens);
		// store tokens in db
	});
});

var server = app.listen(3000, function() {
	console.log('Listening on port %d', server.address().port);
});
