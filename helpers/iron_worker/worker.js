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

	res.on('data', function(d) {
		process.stdout.write(d);

		if(res.statusCode != 200) {
			process.exit(0);
		}
	});
});

req.end();

req.on('error', function(e) {
	process.stdout.write(e);
	process.exit(0);
});