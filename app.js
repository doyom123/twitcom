// app.js
'use strict'

var mysql = require('mysql');
var express = require('express');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var path = require('path');
var authUser = require('./middleware/authUser.js');
var Oauth = require('oauth').OAuth;
var Twitter = require('twitter');
var CronJob = require('cron').CronJob;
var moment = require('moment-timezone');
var env = require('dotenv').config();
var passport = require('passport');
var session = require('express-session');
var connectEnsureLogin = require('connect-ensure-login').ensureLoggedIn('/login/twitter');
var MySQLStore = require('express-mysql-session');
var Strategy = require('passport-twitter').Strategy;
var app = express();
var router = express.Router();
var connection = mysql.createConnection({
	host: '127.0.0.1',
	user: 'vagrant',
	password: '',
	database: 'twitcom'
});

var times = {
};
var init_times = function() {
	times.startTime = moment.tz("US/Eastern").minute(0).second(0);
	times.endTime = times.startTime.clone().minute(59).second(59);
	times.startTime_format = times.startTime.format("YYYY-MM-DD HH:mm:ss");
	times.endTime_format = times.endTime.format("YYYY-MM-DD HH:mm:ss");
	
}
var reset_times = function() {
	times.startTime.add(1, 'hour');
	times.endTime = times.startTime.clone().minute(59).second(59);
	times.startTime_format = times.startTime.format("YYYY-MM-DD HH:mm:ss");
	times.endTime_format = times.endTime.format("YYYY-MM-DD HH:mm:ss");
}


var job = new CronJob({
	cronTime: '0 0 0-23 * * *',
	onTick: function() {
		
		var query = 'SELECT * FROM 	 Tweets WHERE submitted_at >= ? AND submitted_at <= ? ' + 
							  'ORDER BY vote_count DESC LIMIT 1';
		
		console.log("startTime = " + times.startTime.format("YYYY-MM-DD HH:mm:ss"));
		console.log("endTime = " + times.endTime.format("YYYY-MM-DD HH:mm:ss"));
		connection.query(query, [times.startTime_format, times.endTime_format], function(err, results) {
			if(err) {
				console.log(err);
			}
			if(results.length == 0) {
				return;
			}
			var body = results[0].body;
			twitter.post('statuses/update', {status: body},  function(error, tweet, response){
			  if(error){
			    console.log(error);
			  }
		  	  console.log(tweet);  // Tweet body.
		 		 //console.log(response);  // Raw response object.
			});
		});
		
		reset_times();		
	},
	start: true,
	timeZone: 'US/Eastern'
});

var twitter = new Twitter({
	consumer_key: env.consumer_key,
	consumer_secret: env.consumer_secret,
	access_token_key: env.access_token_key,
	access_token_secret: env.access_token_secret
});

connection.connect(function(err) {
	if(err) {
		console.log(err);
		console.log("connect");
		return;
	}
	console.log('Connected to the database');
	app.listen(8080, function() {
		console.log('Web Server listening on port 8080');
	});
	init_times();
});

app.set('view engine', 'ejs');
app.set('views', './views');
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));





// Passport setup
app.use(session({
	key: 'session_cookie_name',
	secret: 'session_cookie_secret', 
	store: sessionStore,
	resave: true, 
	saveUninitialized: true,
	cookie : { 
		secure : false, 
		maxAge : (4 * 60 * 60 * 1000) 
	}, 
}));

passport.use(new Strategy({
		consumerKey 	: env.consumer_key,
		consumerSecret 	: env.consumer_secret,
		callbackURL 	: env.callback_url
	},
	function(token, tokenSecret, profile, cb) {
		process.nextTick(function() {
			var query = "SELECT * FROM Users WHERE twitter_id=?";
			connection.query(query, [profile.id], function(err, results) {
				if(err) {
					console.log(err);
					throw err;
				}
				if(results.length == 0) {
					var query = "INSERT INTO Users(twitter_id, name, display_name, token) VALUES(?,?,?,?)";
					var twitter_id = profile.id;
					var name = profile.username;
					var display_name = profile.displayname;
					var token = token;
					connection.query(query, [twitter_id, name, display_name, token], function(err, results) {
						console.log("Inserted ID: " + twitter_id + " name: " + name);
						if(err) throw err;
						var user = {
							id: profile.id,
							username: profile.username,
							display_name: profile.displayName,
							token: token,
							token: tokenSecret
						}
						return  cb(null, profile);
					});
				} else {
					console.log("User already exists in database");
					return cb(null, profile);
				}
			});
		});
	}));
app.use(passport.initialize());
app.use(passport.session());

// login routes
var options = {
	host: 'http://127.0.0.1',
	port: 3306,
	user: 'vagrant',
	database: 'twitcom'
}
var sessionStore = new MySQLStore({}, connection);

passport.serializeUser(function(user, done) {
	console.log("Serialize User " + user.id + " username: " + user.username);
	done(null, user.id);
});
passport.deserializeUser(function(id, done) {
	var query = "SELECT * FROM Users WHERE twitter_id=?";
	connection.query(query, [id], function(err, results) {
		if(err) {
			console.log(err);
			console.log("deserialize error");
			throw err;
		}
		console.log(id);
		console.log("DESERIALIZE");
		console.log(results[0].vote_power);
		done(null, results[0]);
	});
	
});
app.get('/login/twitter',
	passport.authenticate('twitter')
);
app.get('/login/twitter/callback',
	passport.authenticate('twitter', { failureRedirect: '/latest'}),
	function(req, res) {
		res.redirect('/');
		console.log(req.user.id);
	});

app.get('/logout/twitter', function(req, res) {
	req.logout();
	console.log('user logged out');
	res.redirect('/');
});

	
app.get('/profile', authUser, function(req, res) {
		res.render('profile', {
			user : req.user
		});
	});

app.get('/', authUser, function(req, res) {
	var query = 'SELECT * FROM Tweets WHERE submitted_at >= ? AND submitted_at <= ?' + 
				'ORDER BY vote_count DESC LIMIT 50';
	connection.query(query, [times.startTime_format, times.endTime_format], function(err, results) {
		if(err) {
			console.log(err);
		}
		if(req.user) {
			console.log("USER LOGGED IN");
		} else {
			console.log("USER NOT LOGGED IN");
		}
		for(var i = 0; i < results.length; i++) {
			var tweet = results[i];
			tweet.rank = i + 1;
		}
		res.render('twitcom', { 
			tweets: results,
			user: req.user
		});
	});
});

app.get('/latest', authUser, function(req, res) {
	var query = 'SELECT * FROM Tweets ORDER BY submitted_at DESC';
	connection.query(query, function(err, results) {
		if(err) {
			console.log(err);
		}
		for(var i = 0; i < results.length; i++) {
			var tweet = results[i];
			tweet.rank = i + 1;
		}
		if(req.user) {
			console.log("LOGGEDIN");
		}
		console.log(res.locals.login);
		res.render('twitcom', { 
			tweets: results
		});
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

app.get('/:name', authUser, function(req, res) {
	res.redirect('/');
});

// Send JSON response to populate tweet list for AJAX request
app.get('/refresh', function(req, res) {
	var query = 'SELECT * FROM Tweets WHERE submitted_at >= ? AND submitted_at <= ?' + 
				'ORDER BY vote_count DESC LIMIT 50';
	connection.query(query, [times.startTime_format, times.endTime_format], function(err, results) {
		if(err) {
			console.log(err);
		}
		for(var i = 0; i < results.length; i++) {
			var tweet = results[i];
			tweet.rank = i + 1;
		}
		res.render('_tweet_list', { tweets: results });
	});
});

// app.post('/', function(req, res) {
// 	var query = 'UPDATE Tweets SET vote_count = vote_count + 1 WHERE id = 1';
// 	connection.query(query, function(err, results) {
// 		res.redirect('/');
// 	});
// });