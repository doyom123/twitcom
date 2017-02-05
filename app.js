// app.js
'use strict'

var mysql = require('mysql');
var express = require('express');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var path = require('path');
var cheerio = require('cheerio');
var authUser = require('./middleware/authUser.js');
var auth_user = require('./middleware/auth_user.js');
var Oauth = require('oauth').OAuth;
var Twitter = require('twitter');
var CronJob = require('cron').CronJob;
var moment_ = require('moment');
var moment = require('moment-timezone');
var countdown = require('moment-countdown');
var env = require('dotenv').config();
var passport = require('passport');
var session = require('express-session');
var connectEnsureLogin = require('connect-ensure-login').ensureLoggedIn('/login/twitter');
var MySQLStore = require('express-mysql-session');
var Strategy = require('passport-twitter').Strategy;
var app = express();
var router = express.Router();
var connection = mysql.createPool({
	host: process.env.MYSQL_HOST,
	user: process.env.MYSQL_USERNAME,
	password: process.env.MYSQL_PASSWORD,
	database: process.env.DATABASE_NAME,
	connectionLimit: 100
});



var port = process.env.PORT || 8080;

var times = {
};
var init_times = function() {
	times.UTCstartTime = moment().utc().minute(0).second(0);
	times.UTCendTime = moment().utc().minute(59).second(59);
	times.UTCstartTime_format = times.UTCstartTime.format("YYYY-MM-DD HH:mm:ss");
	times.UTCendTime_format = times.UTCendTime.format("YYYY-MM-DD HH:mm:ss");
}
var reset_times = function() {
	times.UTCstartTime.add(1, 'hours');
	times.UTCendTime = times.UTCstartTime.clone().minute(59).second(59);
	times.UTCstartTime_format = times.UTCstartTime.format("YYYY-MM-DD HH:mm:ss");
	times.UTCendTime_format = times.UTCendTime.format("YYYY-MM-DD HH:mm:ss");
}


var job = new CronJob({
	cronTime: '0 0 0-23 * * *',
	// cronTime: '0 0-59 * * * *',
	onTick: function() {
		
		var query = 'SELECT * FROM 	 Tweets WHERE submitted_at >= ? AND submitted_at <= ? ' + 
							  'ORDER BY vote_count DESC LIMIT 1';
		var now = moment.tz("America/New_York").format("YYYY-MM-DD HH:mm:ss");
		connection.query(query, [times.UTCstartTime_format, times.UTCendTime_format], function(err, results) {
			if(err) {
				console.log(err);
				return;
			}
			if(results.length == 0) {
				return;
			}
			var body = results[0].body;
			twitter.post('statuses/update', {status: body},  function(error, tweet, response){
			  if(error){
			    console.log(error);
			  }
		  	  var _tweet_id_str = tweet.id_str;
		  	  var query = 'INSERT INTO Top_Tweets(id, tweet_id_str) VALUES(?,?)';
		  	  connection.query(query, [results[0].id, _tweet_id_str], function(err, results) {
		  	  	  if(err) {
		  	  	      console.log(err);
		  	  	  }
		  	  });
			});
		});
		var d = new Date();
		reset_times();		
	},
	start: true,
	timeZone: "America/New_York"
});

var twitter = new Twitter({
	consumer_key: process.env.CONSUMER_KEY,
	consumer_secret: process.env.CONSUMER_SECRET,
	access_token_key: process.env.ACCESS_TOKEN_KEY,
	access_token_secret: process.env.ACCESS_TOKEN_SECRET
});

	app.listen(port, function() {
		console.log('Web Server listening on port ' + port);
	});
	init_times();
// connection.getConnection(function(err, connection) {
// 	if(err) {
// 		console.log(err);
// 		console.log("connect");
// 		return;
// 	}
// 	console.log('Connected to the database');
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

passport.use(new Strategy({
		consumerKey 	: process.env.CONSUMER_KEY,
		consumerSecret 	: process.env.CONSUMER_SECRET,
		// callbackURL     : process.env.CALLBACK_URL
		callbackURL     : 'https://twitcom.herokuapp.com/login/twitter/callback/'
	},
	function(token, tokenSecret, profile, cb) {
		process.nextTick(function() {
			var query = "SELECT * FROM Users WHERE twitter_id=?";
			connection.query(query, [profile._json.id_str], function(err, results) {
				if(err) {
					console.log(err);
				}
				if(results.length == 0) {

					var query = "INSERT INTO Users(twitter_id, name, display_name) VALUES(?,?,?)";
					var twitter_id = profile._json.id_str;
					var name = profile._json.screen_name;
					var display_name = profile._json.name;
					var token = token;
					console.log(profile._json.id_str);
					connection.query(query, [twitter_id, name, display_name], function(err, results) {
						if(err) {
							console.log(err);
						}
						var user = {
							id: profile.id_str,
							username: profile.username,
							display_name: profile.displayName,
							token: token,
							token: tokenSecret
						}
						return  cb(null, profile);
					});
				} else {
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
	done(null, user.id);
});
passport.deserializeUser(function(id, done) {
	var query = "SELECT * FROM Users WHERE twitter_id=?";
	connection.query(query, [id], function(err, results) {
		if(err) {
			console.log(err);
			throw err;
		}
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
	});

app.get('/logout/twitter', function(req, res) {
	req.logout();
	res.redirect('/');
});

	
app.get('/profile', authUser, function(req, res) {
	var query = 'SELECT * FROM Tweets WHERE user_id=? ORDER BY submitted_at DESC'; 
	
	connection.query(query, [req.user.id], function(err, results) {
		if(err) {
			console.log(err);
		};

		res.render('profile', {
			user : req.user,
			user_tweets: results,
		});
	})	
});

function setVoteList(value, list) {
	for(var i = 0; i < value.length; i++) {
		list[i] = value[i].tweet_id;
	}
}

app.get('/', authUser, function(req, res) {
	var vote_list = [];
	var user_id = null;
	if(res.locals.login) {
		user_id = req.user.id;
	}
	var query = 'SELECT * FROM Tweet_Votes WHERE submitted_at >= ? AND submitted_at <= ? AND user_id = ?';
	connection.query(query, [times.UTCstartTime_format, times.UTCendTime_format, user_id], function(err, results) {
		setVoteList(results, vote_list);
	});
	var query = 'SELECT * FROM Tweets WHERE submitted_at >= ? AND submitted_at <= ?' + 
				'ORDER BY vote_count DESC';
	
	// console.log("START TIME: " + times.UTCstartTime_format);
	// console.log("  END TIME: " + times.UTCendTime_format);
	connection.query(query, [times.UTCstartTime_format, times.UTCendTime_format], function(err, results) {
		if(err) {
			console.log(err);
		}
		if(req.user) {

		} else {
			console.log("USER NOT LOGGED IN");
		}
		console.log(vote_list);
		for(var i = 0; i < results.length; i++) {
			var tweet = results[i];
			tweet.rank = i + 1;
			var index = vote_list.indexOf(tweet.id);
			if(index > -1) {
				tweet.voted = true;
			} else {
				tweet.voted = false;
			}
		}
		// Get latest tweet
		var params = {
			screen_name: 'commietwit',
			// user_id: 820122224631877632,
			count: 1
		}
		twitter.get('statuses/user_timeline',
					params, 
					function(err, tweets, response) {
			if(err) {
				console.log(err);
			}
			var tweet = tweets[0];
			console.log(tweet.id_str);
			var latest_tweet_url = 'https://twitter.com/commietwit/status/' + tweet.id_str;
			var params = {
				url: latest_tweet_url
			}
			twitter.get('statuses/oembed', params, function(err, tweet, response) {
				res.render('twitcom', { 
					tweets: results,
					user: req.user,
					embedded_html: tweet.html
				});
			});
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

		var html = "<blockquote class=\"twitter-tweet\"><p lang=\"en\" dir=\"ltr\">Happy 50th anniversary to the Wilderness Act! Here&#39;s a great wilderness photo from <a href=\"https://twitter.com/YosemiteNPS\">@YosemiteNPS</a>. <a href=\"https://twitter.com/hashtag/Wilderness50?src=hash\">#Wilderness50</a> <a href=\"http://t.co/HMhbyTg18X\">pic.twitter.com/HMhbyTg18X</a></p>&mdash; US Dept of Interior (@Interior) <a href=\"https://twitter.com/Interior/status/507185938620219395\">September 3, 2014</a></blockquote>\n<script async src=\"//platform.twitter.com/widgets.js\" charset=\"utf-8\"></script>"

		res.render('twitcom', { 
			tweets: results,
			user: req.user,
			embedded_html: html
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
	var query = 'INSERT INTO Tweets(body, user, user_id) VALUES(?,?,?)';
	var body = req.body.body;
	var user = req.user.display_name;
	var user_id = req.user.id;
	var submitted_at = moment();
	var submitted_at_format = submitted_at.format("YYYY-MM-DD HH:mm:ss")
	connection.query(query, [body, user, user_id], function(err, results) {
		if(err) {
			console.log(err);
		}
		res.redirect('/');
	}); 
});

app.post('/vote/:id([0-9]+)', function(req, res) {
	var id = req.params.id;
	var user_id = req.user.id;
	// Check if already voted
	var query = 'SELECT * FROM Tweet_Votes WHERE tweet_id = ? AND user_id = ?';
	connection.query(query, [id, user_id], function(err, results) {
		if(err) {
			console.log(err);
		} 
		if(results.length == 0) {
			var query = 'UPDATE Tweets SET vote_count = vote_count + 1 WHERE id = ?';
			connection.query(query, [id], function(err, results) {
				if(err) {
					console.log(err);
				}
			});
			var query = 'INSERT INTO Tweet_Votes(tweet_id, user_id) VALUES(?,?)';
			connection.query(query, [id, user_id], function(err, results) {
				if(err) {
					console.log(err);
				}
				res.redirect('/');
			});
		} else {
			var query = 'UPDATE Tweets SET vote_count = vote_count - 1 WHERE id = ?';
			connection.query(query, [id], function(err, results) {
				if(err) {
					console.log(err);
				}
			});
			var query = 'DELETE FROM Tweet_Votes WHERE tweet_id = ? AND user_id = ?';
			connection.query(query, [id, user_id], function(err, resultss) {
				if(err) {
					console.log(err);
				}
				res.redirect('/');
			});
		}

	});
});

app.post('/vote_neg/:id([0-9]+)', function(req, res) {
	var id = req.params.id;
	var query = 'UPDATE Tweets SET vote_count = vote_count - 1 WHERE id = ?';
	connection.query(query, [id], function(err, results) {
		if(err) {
			console.log(err);
		}
		res.redirect('/');
	});
});

// Send JSON response to populate tweet list for AJAX request
app.get('/refresh', function(req, res) {
	var vote_list = [];
	var user_id = null;
	if(res.locals.login) {
		user_id = req.user.id;
	}
	var query = 'SELECT * FROM Tweet_Votes WHERE submitted_at >= ? AND submitted_at <= ? AND user_id = ?';
	connection.query(query, [times.UTCstartTime_format, times.UTCendTime_format, user_id], function(err, results) {
		setVoteList(results, vote_list);
	});
	var query = 'SELECT * FROM Tweets WHERE submitted_at >= ? AND submitted_at <= ?' + 
				'ORDER BY vote_count DESC LIMIT 50';
	connection.query(query, [times.UTCstartTime_format, times.UTCendTime_format], function(err, results) {
		if(err) {
			console.log(err);
		}
		for(var i = 0; i < results.length; i++) {
			var tweet = results[i];
			tweet.rank = i + 1;
			var index = vote_list.indexOf(tweet.id);
			if(index > -1) {
				tweet.voted = true;
			} else {
				tweet.voted = false;
			}
		}
		// res.render('_tweet_list', { 
		// 	tweets: results,
		// });
		// res.send(results);
	});
});