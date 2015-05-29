var express = require('express');
var router = express.Router();
var request = require("request");

var passport = require("passport");
var LocalStrategy = require("passport-local").Strategy;
var User = require("../models/user").User;
var utils = require("../utils/utils");

// Main Router
// 1. GET "/" : get home page
// 2. GET "/login" : get login page
// 3. POST "/login" + {username, password} : log in verified user
// 4. GET "/sign_up" : get sign up page
// 5. GET "/logout" : logout current user
// 6. GET "/current_auth" : returns current user authentications (req.user)
// 7. GET "/profile" : returns user profile page for logged in user
// 8. GET "/verify" : gets user account verification page
// 9. GET "/quit/:api" : gets test scripts for given api

//// GET home page.
//router.get('/', function(req, res) {
//    res.redirect("/login");
//});

// GET home page.
router.get('/', function (req, res) {
    res.render("index", {});
});

// GET login page 
router.get("/login", function(req, res) {
    if (req.user) {
        res.redirect("/profile");
    } else {
        res.render("auth/login", {});
    }
});

// POST login, authenticate user
// router.post("/login", passport.authenticate("local-login", {
//     successRedirect: "/profile",
//     failureRedirect: "/login"
// }));
router.post("/login", passport.authenticate("local-login"), function(req, res) {
    utils.sendSuccessResponse(res, {user: req.user});
});

// GET sign up page
router.get("/sign_up", function(req, res) {
    res.render("auth/sign_up", {});
});

// GET logout user
router.get("/logout", function(req, res) {
    req.logout();
    utils.sendSuccessResponse(res, {});
});

// GET current user
router.get("/current_auth", function(req, res) {
    utils.sendSuccessResponse(res, {user: req.user});
});

// GET user profile page
router.get("/profile", function(req, res) {
    res.render("profile", {
        username: req.user.username
    });
});

// GET verify page
router.get("/verify", function(req, res) {
    res.render("verify", {});
});

// GET testing scripts
router.get("/qunit/:api", function(req, res) {
    var api = req.params.api;
    if (api == "user") {
        res.render("qunit/user", {});
    } else if (api == "tournament") {
        res.render("qunit/tournament", {});
    } else if (api == "bracket") {
        res.render("qunit/bracket", {});
    } else if (api == "team") {
        res.render("qunit/team", {});
    } else if (api == "match") {
      res.render("qunit/match", {});
    }
});

// Passport strategy for logging in
passport.use("local-login", new LocalStrategy(function(username, password, done) {

    User.login(username, password, function(err, user) {
        if (err) {
            return done(err);
        } else if (!user) {
            return done(null, false, {message: "Invalid username/password"});
        } else {
            return done(null, user);
        }
    });
}));

passport.serializeUser(function(user, done) {
    done(null, user.username);
});

passport.deserializeUser(function(username, done) {
    User.findByUsername(username, function(err, user) {
        if (err) {
            done(err);
        } else {
            done(null, user);
        }
    });
});



module.exports = router;
