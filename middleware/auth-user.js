// middleware/auth-user.js
'use strict'

module.exports = function(req, res, next) {
	res.locals.login = req.isAuthenticated();
	if(!req.isAuthenticated()) {
		res.redirect('/');
	}
	next();
};