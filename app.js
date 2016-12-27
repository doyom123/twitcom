// app.js
'use strict'

var mysql = require('mysql');
var express = require('express');
var bodyParser = require('body-parser');
var path = require('path');
var app = express();
var connection = mysql.createConnection({
	host: '127.0.0.1',
	user: 'vagrant',
	password: '',
	database: 'twitcom'
});

connection.connect(function(err) {
	if(err) {
		console.log(err);
		return;
	}
	console.log('Connected to the database');
	app.listen(8080, function() {
		console.log('Web Server listening on port 8080');
	});
});

app.set('view engine', 'ejs');
app.set('views', './views');
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', function(req, res) {
	var query = 'SELECT * FROM Tweets ORDER BY vote_count DESC';
	connection.query(query, function(err, results) {
		if(err) {
			console.log(err);
		}
		for(var i = 0; i < results.length; i++) {
			var tweet = results[i];
			tweet.rank = i + 1;
		}
		res.render('twitcom', { tweets: results });
	});
});

app.get('/latest', function(req, res) {
	var query = 'SELECT * FROM Tweets ORDER BY submitted_at DESC';
	connection.query(query, function(err, results) {
		if(err) {
			console.log(err);
		}
		for(var i = 0; i < results.length; i++) {
			var tweet = results[i];
			tweet.rank = i + 1;
		}
		res.render('twitcom', { tweets: results });
	});
});

app.get('/random', function(req, res) {
	var query = 'SELECT * FROM Tweets ORDER BY RAND() LIMIT 50';
	connection.query(query, function(err, results) {
		if(err) {
			console.log(err);
		}
		for(var i = 0; i < results.length; i++) {
			var tweet = results[i];
			tweet.rank = i + 1;
		}
		res.render('twitcom', { tweets: results });
	});
});

app.post('/tweets/submit', function(req, res) {
	var query = 'INSERT INTO Tweets(body) VALUES(?)';
	var body = req.body.body;
	connection.query(query, [body], function(err, results) {
		if(err) {
			console.log(err);
		}
		res.redirect('/');
	})
});

app.post('/vote/:id([0-9]+)', function(req, res) {
	var id = req.params.id;
	var query = 'UPDATE Tweets SET vote_count = vote_count + 1 WHERE id = ?';
	connection.query(query, [id], function(err, results) {
		if(err) {
			console.log(err);
		}
		res.redirect('/');
	});
});
// app.post('/', function(req, res) {
// 	var query = 'UPDATE Tweets SET vote_count = vote_count + 1 WHERE id = 1';
// 	connection.query(query, function(err, results) {
// 		res.redirect('/');
// 	});
// });