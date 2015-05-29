// Author: Yachi Chang
var express = require('express');
var validator = require('validator');
var router = express.Router();
var request = require("request");

var sendgrid = require("sendgrid")(process.env.SENDGRID_USERNAME, process.env.SENDGRID_PASSWORD);

var User = require("../../models/user").User;
var utils = require("../../utils/utils");

// USER REST API:
// Header Route: "/api/user"
// 1. GET "/" : retrieve all users
// 2. GET "/:username" : retrieve specific user
// 3. PUT "/verify" + {code} : verifies user whose username hashes to code
// 4. POST "/register" + {username, password} : registers unverified user, given Kerberos validation

/**
 * GET all users
 * @return {JSON} an object with a 'content.users' field, containing an array of all users
 */
router.get('/', function(req, res) {
    User.find({}, {password: 0}).exec(function(err, users) {
        if (err) return utils.sendErrResponse(res, 500, 'An unknonwn error occurred.');
        return utils.sendSuccessResponse(res, {users: users});
    });
})

/**
 * GET user information
 * @urlParam {User.username} the username of the user
 * @return {JSON} an object with a 'content.user' field, containing the specified user
 * @error {404 Not Found} if the specified user does not exist
 */
router.get("/:username", function(req, res) {
    var username = validator.toString(req.params.username);

    User.findByUsername(username, function(err, user) {
        if (err) {
            utils.sendErrResponse(res, 500, err);
        } else if (!user) {
            utils.sendErrResponse(res, 404, "404: User does not exist.");
        } else {
            utils.sendSuccessResponse(res, {user: user});
        }
    });
});

/**
 * PUT to verify a user
 * @param {String} code the special code supplied by the verification email
 * @return {JSON} an object with a 'content.user' field, containing the verified user
 * @error {404 Not Found} if the code supplied does not correspond to any existing user
 */
router.put("/verify", function(req, res) {
    var code = validator.toString(req.body.code);

    // convert code to username
    var username = utils.fromHexToString(code);

    User.findByUsername(username, function(err, user) {
        if (err) {
            utils.sendErrResponse(res, 500, err);
        } else if (!user) {
            utils.sendErrResponse(res, 404, "404: User does not exist.");
        } else {
            user.verify(function(err, u) {
                if (err) {
                    utils.sendErrResponse(res, 500, err);
                } else {
                    delete u.password;
                    utils.sendSuccessResponse(res, {user: u});
                }
            });
        }
    });
});

/**
 * POST registers user
 * @param {String} username the username of the new user
 * @param {String} password the password of the new user
 * @return {JSON} an object with a 'content.user' field, containing the new user
 * @error {400 Bad Request} if the username provided matches an existing user
 * @error {400 Bad Request} if the username is not a valid kerberos ID
 */
router.post("/", function(req, res) {

    var username = validator.toString(req.body.username);
    var password = validator.toString(req.body.password);

    User.findByUsername(username, function(err, user) {
        
        if (err) {
            utils.sendErrResponse(res, 500, err);

        // user does not exist, create
        } else if (!user) {

            request("http://m.mit.edu/apis/people/" + username, function(err, resp, body) {
            
                var user;
            
                // if the username exists in MIT database, create
                if (!err && resp.statusCode == 200 && (user = JSON.parse(body)).id != undefined) {
            
                    User.register(username, password, function(err, u) {
                        if (err) {
                            utils.sendErrResponse(res, 500, "Error saving new user.");
                        } else {
                            console.log("Verification Code: " + utils.fromStringToHex(username));

                            emailVerificationLink(username);
                            delete u.password;
                            utils.sendSuccessResponse(res, {user: u});
                        }
                    });

                // the user does not exist in database
                } else {
                    utils.sendErrResponse(res, 400, "400: Invalid Kerberos ID.");
                }
            });

        // user already exists
        } else {

            if (user.verified == false) {
                emailVerificationLink(username);
            }
            utils.sendErrResponse(res, 400, "400: User already exists.");
        }
    });
});

/**
 * Sends an email with a verification link to the user.
 * Once this link is followed, the user is verified in the system,
 * and can begin creating tournaments and teams.
 */
function emailVerificationLink(username) {
    var link = "http://tourneytrack.herokuapp.com/verify?code=" + utils.fromStringToHex(username);
    var mailContent = "Hi " + username + "!<br>"
        + "Thank you for signing up for Tourney Track!<br>"
        + "Click <a href=" + link + ">here</a> to verify your account.";

    var mailOptions = {
        to: username + "@mit.edu",
        from: process.env.SENDGRID_USERNAME,
        subject: "TourneyTrack Account Verification",
        html: mailContent
    };

    sendgrid.send(mailOptions, function(err, json) {
        // if (err) { return console.error(err); }
        // console.log(json);
    });
}

module.exports = router;
