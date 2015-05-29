// Authors: Katharine Xiao and Yachi Chang

var express = require('express');
var validator = require('validator');
var router = express.Router();

var Tournament = require("../../models/tournament").Tournament;
var User = require('../../models/user').User;
var Bracket = require("../../models/bracket").Bracket;
var Match = require("../../models/match").Match;
var Team = require("../../models/team").Team;
var utils = require('../../utils/utils');

var sendgrid = require("sendgrid")(process.env.SENDGRID_USERNAME, process.env.SENDGRID_PASSWORD);


/**
 * GET /team/
 * @urlParam {User._id} [Optional] player the id of the player who must be a member of the returned teams
 * @urlParam {Tournament._id} [Optional] tournament the id of the tournament to filter the teams by
 * @return {JSON} an object with a 'content.teams' field containing an array of all of the matched teams
 */
router.get('/', function(req, res) {
    var searchParams = {};
    if (validator.isMongoId(req.query.player)) {
        searchParams.members = req.query.player;
    }
    if (validator.isMongoId(req.query.tournament)) {
        searchParams.tournament = req.query.tournament;
    }
    Team.find(searchParams).populate('tournament').populate('members').populate('captain').exec(function(err, teams) {
        if (err) utils.sendErrResponse(res, 500, 'An unknown error occurred.');
        utils.sendSuccessResponse(res, {teams: teams});
    })
})

/**
 * POST /team
 * @param {String} team_name the name of the new team
 * @param {Tournament._id} tournament the id of the tournament this new team belongs to
 * @return {JSON} an object with a 'content.team' field, containing the new team
 * @error {400 Bad Request} if the request is missing any parameters
 * @error {400 Bad Request} if the supplied tournament has already started
 * @error {400 Bad Request} if the current user is already the captain of another team in the tournament
 * @error {404 Not Found} if the supplied tournament does not exist
 */
router.post('/', utils.restrict, function(req, res) {
	var name = validator.toString(req.body.team_name);
	var tournament = validator.toString(req.body.tournament);
	if (!name || !tournament) {
		return utils.sendErrResponse(res, 400, 'Bad request: missing team field(s).');
	}
    Tournament.findOne({_id: tournament}).exec(function(err, tournament) {
        if (err) return utils.sendErrResponse(res, 500, 'An unknown error has occurred.');
        if (!tournament) {
          utils.sendErrResponse(res, 404, 'Not Found: tournament ' + tournament + ' does not exist');
        } else if (tournament.started) {
          utils.sendErrResponse(res, 400, 'Bad request: Tournament has already started. Cannot add teams to tournament after it starts.');
        } else {
            // Restrict users to only creating one team per tournament
            Team.find({$and: [{captain: req.user._id}, {tournament: tournament._id}] }).exec(function(err, teams) {
                if (err) return utils.sendErrResponse(res, 500, 'An unknown error has occurred.');
                if (teams.length > 0) return utils.sendErrResponse(res, 400, 'Bad request: Cannot create more than one Team per Tournament.');
                var t = new Team({
                    name: name,
                    captain: req.user._id,
                    tournament: tournament,
                    members: [req.user._id]
                  });
                t.save( function(err, team) {
                    if (err) return utils.sendErrResponse(res, 500, 'Error creating team.');
                    utils.sendSuccessResponse(res, {team: team});
                });

            })
        }
    });
});

/**
 * GET /team/:team_id
 * @urlParam {Team._id} team_id the id of the team to get
 * @return {JSON} an object with a 'content.team' field, containing the team
 * @error {400 Bad Request} if the specified team is not a valid MongoDB ID
 * @error {404 Not Found} if the specified team does not exist
 */
router.get('/:team_id', function(req, res) {
  if (validator.isMongoId(req.params.team_id)) {
    Team.findOne({_id: req.params.team_id}).populate('members').populate('captain').populate('tournament').exec(function(err, team) {
        if (err) return utils.sendErrResponse(res, 500, 'An uknown error has occurred.');
        if (!team) {
            return utils.sendErrResponse(res, 404, 'Team not found.');
        }
        return utils.sendSuccessResponse(res, {team: team});
    });
  } else {
    return utils.sendErrResponse(res, 400, 'Invalid team ID');
  }
});


/**
 * PUT /team/:team_id
 * @urlParam {Team._id} team_id the id of the team to update
 * @urlParam {String} action the action (add or delete) to perform on the supplied user
 * @param {User._id} user_id the id of the user to add or delete to the team
 * @return {JSON} an object with a 'content.team' field, containing the updated team
 * @error {400 Bad Request} if the supplied user ID is not a valid MongoDB ID
 * @error {400 Bad Request} if the supplied team ID is not a valid MongoDB ID
 * @error {400 Bad Request} if this team's tournament has started
 * @error {400 Bad Request} if the supplied user is already a member of a team in the same tournament
 * @error {400 Bad Request} if the supplied action is not 'add' or 'delete'
 * @error {401 Unauthorized} if the current user is not the captain of the team
 * @error {404 Not Found} if the supplied user does not exist
 * @error {404 Not Found} if the supplied team does not exist
 * @error {404 Not Found} if the team's tournament does not exist
 */
router.put('/:team_id', utils.restrict, function(req, res, next) {
    if (!validator.isMongoId(req.body.user_id)) {
      return utils.sendErrResponse(res, 400, 'Bad Request: Invalid user ID');
    }
    if (!validator.isMongoId(req.params.team_id)) {
      return utils.sendErrResponse(res, 400, 'Bad Request: Invalid team ID');
    }
    var user_id = req.body.user_id;
    var team;
    // Check if user id corresponds to a valid user
    User.findOne({_id: user_id}).exec(function(err, user){
        if (err) return utils.sendErrResponse(res, 500, 'An unknown error has occurred.');
        if (!user) return utils.sendErrResponse(res, 404, 'Not Found: User does not exist.');
  	Team.findOne({_id:req.params.team_id}).exec(function(err, team) {
        if (err) return utils.sendErrResponse(res, 500, 'An unknown error has occurred.');
  		  if (!team) return utils.sendErrResponse(res, 404, 'Not Found: Team does not exist.');

        // Do not allow Teams to be added after Tournament has started
        Tournament.findOne({_id:team.tournament}).exec(function(err, tournament) {
            if (err) return utils.sendErrResponse(res, 500, 'An unknown error has occurred.');
            if (!tournament) return utils.sendErrResponse(res, 404, 'Not Found: Tournament does not exist.');
            if (tournament.started) return utils.sendErrResponse(res, 400, 'Bad request: Cannot edit a team after the tournament has started.');
        // Attempt to add a member to a team
        if (req.query.action === 'add') {
            Team.find({tournament:team.tournament}).exec(function(err, teams) {
                if (err) return utils.sendErrResponse(res, 500, 'An unknown error has occurred.');
                // Make sure User is not already part of another Team in the Tournament
                var foundMember = false;
                if (teams !== null) {
                  for (var i=0; i<teams.length; i++) {
                      for (var j=0; j<teams[i].members.length; j++) {
                        if (teams[i].members[j].toString() === user_id.toString()) {
                          foundMember = true;
                        }
                      }
                  }
                }
                if (foundMember) {
                   return utils.sendErrResponse(res, 400, 'Bad Request: User cannot join more than one team per tournament.');
                 } else {
                    team.members.push(user_id);
                    team.save( function(err, team) {
                        if (err) throw new Error('Error updating team.');
                        // email team captain someone has joined the team
                        emailMemberJoin(user, team, tournament);
                        utils.sendSuccessResponse(res, {team: team});
                    });
                 }
            });
        // Attempt to delete a member from a team
        } else if (req.query.action === 'delete') {
            if (req.user._id.toString() !== team.captain.toString()) {
                return utils.sendErrResponse(res, 401, 'Unauthorized: Must be team captain to remove members.');
            }
            var index = team.members.indexOf(user_id);
            if (index !== -1) {
                team.members.splice(index, 1);
            }
            team.save( function(err, team) {
            if (err) {
                return utils.sendErrResponse(res, 500, 'Error updating team.');
            } else {
                emailMemberDelete(user, team, tournament);
                return utils.sendSuccessResponse(res, {team: team});
            }
          });
        } else {
          return utils.sendErrResponse(res, 400, 'Bad Request: Action field must be "add" or "delete"');
        }
        });
    });
    });
});

/**
 * DELETE /team/:team_id
 * @urlParam {Team._id} team_id the id of the team to delete
 * @return {JSON} an object with a 'content.success' field, containing the result - true or false
 * @error {400 Bad Request} if this team's tournament has started
 * @error {401 Unauthorized} if the current user is not the captain of the team
 * @error {404 Not Found} if the supplied team does not exist
 * @error {404 Not Found} if the team's tournament does not exist
 */

 router.delete('/:team_id', utils.restrict, function(req, res) {
    Team.findOne({_id: req.params.team_id}).exec(function(err, team) {
        if (err) return utils.sendErrResponse(res, 500, 'An unknown error occurred.');
        if (!team) return utils.sendErrResponse(res, 404, 'Not Found: Team does not exist');
        if (req.user._id.toString() !== team.captain.toString()) return utils.sendErrResponse(res, 401, 'Unauthorized: Must be admin or team captain to delete team');
        Tournament.findOne({_id: team.tournament}).exec(function(err, tournament) {
            if (err) return utils.sendErrResponse(res, 500, 'An unknown error occurred.');
            if (!tournament) return utils.sendErrResponse(res, 404, 'Not Found: Tournament does not exist.');
            if (tournament.started) return utils.sendErrResponse(res, 400, 'Bad request: Tournament has already started.');
            team.remove();
            utils.sendSuccessResponse(res);
        });
    });

 });

/**
 * Sends an email to the specified user that they have been
 * removed from the specified team.
 */
var emailMemberDelete = function(user, team, tournament) {

    var mailContent = "H! <br><br>"
        + "The captain of team '" + team.name + "' in tournament '"
        + tournament.name + "' has removed you from the team. <br>";

   var mailOptions = {
        to: user.username + "@mit.edu",
        from: process.env.SENDGRID_USERNAME,
        subject: "TourneyTrack Removal from Team Notification",
        html: mailContent
    };

    sendgrid.send(mailOptions, function(err, json) {
        // if (err) { return console.error(err); }
        // console.log(json);
    });
};

/**
 * Sends an email to the specified user that they have been
 * added to the specified team
 */
var emailMemberJoin = function(user, team, tournament) {

    var mailContent = "Hi! <br><br>" 
        + "A new user (" + user.username + ") has joined your team '" 
        + team.name + "' in tournament '" + tournament.name + "' <br>";

    User.findOne({_id: team.captain}).exec(function(err, cap) {
        if (err) {
            utils.sendErrResponse(res, 500, "Mongoose error.");
        } else {

            var mailOptions = {
                to: cap.username + "@mit.edu",
                from: process.env.SENDGRID_USERNAME,
                subject: "TourneyTrack New Team Member Notification",
                html: mailContent
            };

            sendgrid.send(mailOptions, function(err, json) {
                // if (err) { return console.error(err); }
                // console.log(json);
            });
        }
    });
}


module.exports = router;
