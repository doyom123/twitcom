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
var moment_ = require('moment');
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

var port = process.env.PORT || 8080;

var times = {
};
var init_times = function() {
	times.UTCstartTime = moment().second(0);
	times.UTCendTime = moment().second(59);
	// times.UTCstartTime = moment().minute(0).second(0);
	// times.UTCendTime = moment().minute(59).second(59);
	times.UTCstartTime_format = times.UTCstartTime.format("YYYY-MM-DD HH:mm:ss");
	times.UTCendTime_format = times.UTCendTime.format("YYYY-MM-DD HH:mm:ss");
	// times.startTime = moment.tz("US/Eastern").minute(0).second(0);
	// times.endTime = times.startTime.clone().minute(59).second(59);
	times.startTime = moment.tz("America/New_York").second(0);
	times.endTime = times.startTime.clone().second(59);
	times.startTime_format = times.startTime.format("YYYY-MM-DD HH:mm:ss");
	times.endTime_format = times.endTime.format("YYYY-MM-DD HH:mm:ss");
}
var reset_times = function() {
	times.UTCstartTime.add(1, 'minutes');
	// times.UTCendTime = times.UTCstartTime.clone().minute(59).second(59);
	times.UTCendTime = times.UTCstartTime.clone().second(59);
	times.UTCstartTime_format = times.UTCstartTime.format("YYYY-MM-DD HH:mm:ss");
	times.UTCendTime_format = times.UTCendTime.format("YYYY-MM-DD HH:mm:ss");
	times.startTime.add(1, 'minutes');
	// times.endTime = times.startTime.clone().minute(59).second(59);
	times.endTime = times.startTime.clone().second(59);
	times.startTime_format = times.startTime.format("YYYY-MM-DD HH:mm:ss");
	times.endTime_format = times.endTime.format("YYYY-MM-DD HH:mm:ss");
}


var job = new CronJob({
	// cronTime: '0 0 0-23 * * *',
	cronTime: '* * 2 * * *',
	onTick: function() {
		
		var query = 'SELECT * FROM 	 Tweets WHERE submitted_at >= ? AND submitted_at <= ? ' + 
							  'ORDER BY vote_count DESC LIMIT 1';
		var now = moment.tz("America/New_York").format("YYYY-MM-DD HH:mm:ss");
		console.log("nowTime = " + now);
		console.log("startTime = " + times.startTime_format);
		console.log("endTime = " + times.endTime_format + '\n');
		connection.query(query, [times.UTCstartTime_format, times.UTCendTime_format], function(err, results) {
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
		  	  console.log("tweet: " + tweet);  // Tweet body.
		 		 //console.log(response);  // Raw response object.
			});
		});
		var d = new Date();
		console.log("Date: " + d.toString());
		reset_times();		
	},
	start: false,
	timeZone: "America/New_York"
});

var twitter = new Twitter({
	consumer_key: env.consumer_key,
	consumer_secret: env.consumer_secret,
	access_token_key: env.access_token_key,
	access_token_secret: env.access_token_secret
});

app.listen(port, function() {
    console.log('Web Server listening on ' + port);
});

// connection.connect(function(err) {
// 	if(err) {
// 		console.log(err);
// 		console.log("MySQL could not connect");
// 	}

// 	console.log('Connected to the database');
// 	app.listen(port, function() {
// 		console.log('Web Server listening on port 8080');
// 	});
// 	init_times();
// });

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

// passport.use(new Strategy({
// 		consumerKey 	: env.consumer_key,
// 		consumerSecret 	: env.consumer_secret,
// 		callbackURL 	: env.callback_url
// 	},
// 	function(token, tokenSecret, profile, cb) {
// 		process.nextTick(function() {
// 			var query = "SELECT * FROM Users WHERE twitter_id=?";
// 			connection.query(query, [profile._json.id_str], function(err, results) {
// 				if(err) {
// 					console.log(err);
// 					throw err;
// 				}
// 				if(results.length == 0) {

// 					var query = "INSERT INTO Users(twitter_id, name, display_name) VALUES(?,?,?)";
// 					var twitter_id = profile._json.id_str;
// 					var name = profile._json.screen_name;
// 					var display_name = profile._json.name;
// 					var token = token;
// 					console.log(profile._json.id_str);
// 					connection.query(query, [twitter_id, name, display_name], function(err, results) {
// 						console.log("Inserted ID: " + twitter_id + " name: " + name);
// 						if(err) throw err;
// 						var user = {
// 							id: profile.id_str,
// 							username: profile.username,
// 							display_name: profile.displayName,
// 							token: token,
// 							token: tokenSecret
// 						}
// 						return  cb(null, profile);
// 					});
// 				} else {
// 					console.log("User already exists in database");
// 					return cb(null, profile);
// 				}
// 			});
// 		});
// 	}));
// app.use(passport.initialize());
// app.use(passport.session());

// login routes
// var options = {
// 	host: 'http://127.0.0.1',
// 	port: 3306,
// 	user: 'vagrant',
// 	database: 'twitcom'
// }
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
	var query = 'SELECT * FROM Tweets WHERE user_id=? ORDER BY submitted_at DESC'; 
	
	connection.query(query, [req.user.id], function(err, results) {
		if(err) {
			console.log(err);
		};
		console.log(results);

		res.render('profile', {
			user : req.user,
			user_tweets: results,
		});
	})	
});

// app.get('/', authUser, function(req, res) {
// 	var query = 'SELECT * FROM Tweets WHERE submitted_at >= ? AND submitted_at <= ?' + 
// 				'ORDER BY vote_count DESC LIMIT 50';
	
// 	connection.query(query, [times.UTCstartTime_format, times.UTCendTime_format], function(err, results) {
// 		if(err) {
// 			console.log(err);
// 		}
// 		if(req.user) {
// 			console.log(req.user.profile_image_url);
// 		} else {
// 			console.log("USER NOT LOGGED IN");
// 		}
// 		for(var i = 0; i < results.length; i++) {
// 			var tweet = results[i];
// 			tweet.rank = i + 1;
// 		}
// 		res.render('twitcom', { 
// 			tweets: results,
// 			user: req.user
// 		});
// 	});
// });

app.get('/', function(req, res) {
	res.send("hi");
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
		res.render('twitcom', { 
			tweets: results,
			user: req.user
		});
	});
});

app.get('/random', authUser, function(req, res) {
	var query = 'SELECT * FROM Tweets ORDER BY RAND() LIMIT 50';
	connection.query(query, function(err, results) {
		if(err) {
			console.log(err);
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

app.post('/tweets/submit', function(req, res) {
	var query = 'INSERT INTO Tweets(body, user, user_id, submitted_at) VALUES(?,?,?,?)';
	var body = req.body.body;
	var user = req.user.display_name;
	var user_id = req.user.id;
	var submitted_at = moment();
	var submitted_at_format = submitted_at.format("YYYY-MM-DD HH:mm:ss")
	console.log("submitted_at: " + submitted_at_format);
	connection.query(query, [body, user, user_id, submitted_at_format], function(err, results) {
		if(err) {
			console.log(err);
		}
		res.redirect('/');
	}); 
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

// Send JSON response to populate tweet list for AJAX request
app.get('/refresh', function(req, res) {
	var query = 'SELECT * FROM Tweets WHERE submitted_at >= ? AND submitted_at <= ?' + 
				'ORDER BY vote_count DESC LIMIT 50';
	connection.query(query, [times.UTCstartTime_format, times.UTCendTime_format], function(err, results) {
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