var worker = require('node_helper');
var https = require("https");

var headers = {
	'Authorization': 'Basic ' + new Buffer(worker.params.api_user + ':' + worker.params.api_key).toString('base64')
} 

var endpoint = {
    "host": worker.params.host,
    "port": 443,
    "path": "/api/user/" + worker.params.user + "/inbox?regular=1",
    "method": "GET",
    "headers": headers
};

var req = https.request(endpoint, function(res) {
	console.log("statusCode: ", res.statusCode);

	res.on('data', function(d) {
		process.stdout.write(d);
	});
});

req.write(req_data)
req.end();

req.on('error', function(e) {
	console.error(e);
});