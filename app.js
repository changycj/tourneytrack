var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var partials = require('express-partials');
var mongo = require('mongodb');
var mongoose = require("mongoose");
var session = require("express-session");
var passport = require("passport");

var app = express();

// set up modules
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
// app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(partials());
app.use(session({secret: "tourneytrack"}));
app.use(passport.initialize());
app.use(passport.session());

// set up routers
var routes = require("./routes/index");
// api routers
var user = require("./routes/api/user");
var tournament = require("./routes/api/tournament");
var team = require("./routes/api/team");
var match = require("./routes/api/match");
var bracket = require("./routes/api/bracket");

app.use('/', routes);
app.use("/api/user", user);
app.use("/api/tournament", tournament);
app.use("/api/team", team);
app.use("/api/match", match);
app.use("/api/bracket", bracket);

// ERROR Handlers
// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

app.set("port", (process.env.PORT || 5000));
app.listen(app.get("port"), function() {
    console.log("listening on port " + app.get("port"));
});

// // set up mongo database
var connection_string = process.env.MONGOLAB_URI || "localhost:27017/tourneytrack";
console.log("CONNECTION STRING: " + connection_string);
mongoose.connect(connection_string);

var db = mongoose.connection;

db.on("error", console.error.bind(console, "Mongoose connection error."));
db.once("open", function() {    
    // mongoose.connection.db.dropDatabase(function(err, result) {
    //     if (err) {
    //         console.error.bind(console, "Mongoose database error.");
    //     } else {
    //         console.log("Connected to Mongoose");
    //     }
    // });
    console.log("Connected to Mongoose.");
});


module.exports = app;
