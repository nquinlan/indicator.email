var MongoClient = require( 'mongodb' ).MongoClient

var db;

module.exports = function( url ) {

	MongoClient.connect( url, function(err, connection) {
		if(err) throw err;
		db = connection;
	});
			
	return function( req, res, next ) {
		if ( !db ) {
			return;
		}
		req.db = db;
		next();            
	}
};
