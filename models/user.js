// Author: Yachi Chang
var mongoose = require("mongoose");
var request = require("request");

var userSchema = mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true, select: false},
    verified: { type: Boolean, required: true }
});

// statics
userSchema.statics.register = function(username, password, callback) {
    var user = new User({
        username: username,
        password: password,
        verified: false
    });
    user.save(callback);
};

userSchema.statics.findByUsername = function(username, callback) {
    User.findOne({username: username}, {password: 0}).exec(callback);
};

userSchema.statics.login = function(username, password, callback) {
    User.findOne({username: username, password: password, verified: true}, {password: 0}).exec(callback);
}

// methods
userSchema.methods.verify = function(callback) {
    this.verified = true;
    this.save(callback);
};

var User = mongoose.model("User", userSchema);

exports.User = User;