// Authors: Jamar Brooks and Yachi Chang
var express = require('express');
var router = express.Router();
var validator = require('validator');

var Bracket = require("../../models/bracket").Bracket;
var Match = require("../../models/match").Match;
var Tournament = require("../../models/tournament").Tournament;

var utils = require("../../utils/utils");

/**
 * GET all brackets
 * @param {Tournament._id} [optional] tournamentId the id of the tournament to filter the brackets by
 * @return {JSON} an object with a 'content.brackets' field containing an array of brackets
 */
router.get("/", function(req, res) {
    var searchParams = {};
    if (validator.isMongoId(req.query.tournament)) {
        searchParams.tournament = req.query.tournament;
    }
    Bracket.find(searchParams).populate('matches').exec(function(err, brackets) {
        if (err) return utils.sendErrResponse(res, 500, "An unknown error occurred.");
        utils.sendSuccessResponse(res, {brackets: brackets});
    });
})

/**
 * GET one bracket
 * @urlParam {Bracket._id} bracket_id the id of the bracket to get
 * @return {JSON} an object with a 'content.bracket' field containing a bracket
 * @error {400 Bad Request} if the supplied bracket is not a valid MongoDB ID
 * @error {404 Not Found} if supplied bracket does not exist
 */
router.get("/:bracket_id", function(req, res) {
    var bracket_id = req.params.bracket_id;
    if (!validator.isMongoId(bracket_id)) {
      return utils.sendErrResponse(res, 400, 'Invalid Bracket ID');
    }

    Bracket.findOne({_id: bracket_id}).populate('tournament').exec(function(err, bracket) {
        if (err) {
            utils.sendErrResponse(res, 500, err);
        } else if (!bracket) {
            utils.sendErrResponse(res, 404, "Bracket does not exist.");
        } else {
            utils.sendSuccessResponse(res, {bracket: bracket});
        }
    });

});

/**
 * DELETE one bracket
 * @urlParam {Bracket._id} bracket_id the id of the bracket to delete
 * @error {400 Bad Request} if the supplied bracket is not a valid MongoDB ID
 * @error {404 Not Found} if supplied bracket does not exist
 * @error {401 Unauthorized} if current user is not the admin of this bracket's tournament
 */
router.delete("/:bracket_id", utils.restrict, function(req, res) {
    var bracket_id = req.params.bracket_id;
    if (!validator.isMongoId(bracket_id)) {
      return utils.sendErrResponse(res, 400, 'Invalid Bracket ID');
    }
    
    // should check if req.user is the same as the admin of the tournament
    Bracket.findOne({_id: bracket_id}).populate("tournament").exec(function(err, bracket) {
        if (err) {
            utils.sendErrResponse(res, 500, err);
        } else if (!bracket) {
            utils.sendErrResponse(res, 404, "No such bracket exists.");
        } else {
            if (bracket.tournament.admin.toString() == req.user._id.toString()) {
                // remove bracket and all matches in this bracket
                Match.remove({bracket: bracket_id}).exec(function(err2) {
                    if (err2) {
                        utils.sendErrResponse(res, 500, err2);
                    } else {
                        bracket.remove();
                        utils.sendSuccessResponse(res);
                    }
                });
            } else {
                utils.sendErrResponse(res, 401, "Unauthorized to delete.");
            }
        }
    });

});

/**
 * PUT Determines if a bracket is completed. If so, it determines the winner
 * and sets the winner field of the bracket to that team.
 * @urlParam {Bracket._id} bracket_id the id of the bracket to update
 * @return {JSON} an object with a 'content.bracket' field containing the updated bracket
 * @error {400 Bad Request} if the supplied bracket is not a valid MongoDB ID
 * @error {404 Not Found} if the supplied bracket does not exist
 * @error {401 Unauthorized} if the user is not the admin of this bracket's tournament
 */
router.put("/:bracket_id", utils.restrict, function(req, res) {
    var bracket_id = req.params.bracket_id;
    if (!validator.isMongoId(bracket_id)) {
      return utils.sendErrResponse(res, 400, 'Invalid Bracket ID');
    }
    // should check if req.user is the same as the admin of the tournament
    Bracket.findOne({_id: bracket_id}).populate("tournament").exec(function(err, bracket) {
        if (err) return utils.sendErrResponse(res, 500, err);
        if (!bracket) return utils.sendErrResponse(res, 404, "No such bracket exists.");
        if (bracket.tournament.admin.toString() !== req.user._id.toString()) {
            return utils.sendErrResponse(res, 401, "Not authorized!");
        }
        bracket.determineWinner();
        bracket.save(function(err2, bracket) {
            if (err2) return utils.sendErrResponse(res, 500, err);
            utils.sendSuccessResponse(res, {bracket: bracket});
        });
    });
});

/**
 * POST create bracket
 * @param {String} type the type (Round Robin or Elimination) of the new bracket
 * @param {Tournament._id} tournament the id of the tournament that the new bracket belongs to
 * @param {String} name the name of the new bracket
 * @param {Array<Team._id>} teams an array of teams that belong to the new bracket.
 *    Must have at least 2 teams. Every team must be unique.
 * @return {JSON} an object with a 'content.bracket' field containing the new bracket
 * @error {400 Bad Request} if request is missing any of the parameters
 * @error {400 Bad Request} if the teams array has less than two teams
 * @error {400 Bad Request} if the teams array contains any duplicates
 * @error {400 Bad Request} if tournament has not started
 * @error {404 Not Found} if the supplied tournament does not exist
 * @error {401 Unauthorized} if the current user is not the admin of the new bracket's tournament
 */
router.post("/", utils.restrict, function(req, res) {
    var bracket_type = validator.toString(req.body.type);
    var tournament_id = validator.isMongoId(req.body.tournament) ? req.body.tournament : undefined;
    var bracket_name = validator.toString(req.body.name);
    var teams = utils.validateMongoIdArray(req.body.teams);
    if (!teams || teams.length < 2) {
        return utils.sendErrResponse(res, 400, 'Bad request: must have at least 2 teams in a bracket.');
    }
    // Check for no duplicate entries
    var uniqueTeams = {};
    var isUnique = teams.reduce(function(prev, team) {
      if (uniqueTeams[team]) {
        return false;
      } else {
        uniqueTeams[team] = true;
        return prev;
      }
    }, true);
    if (!isUnique) {
      return utils.sendErrResponse(res, 400, 'Bad request: cannot have any duplicate teams in bracket.');
    }
    if (!bracket_type || !tournament_id || !bracket_name) {
        return utils.sendErrResponse(res, 400, 'Bad request: missing bracket field(s).');
    }

    Tournament.findOne({_id : tournament_id}).exec(function(err, tournament) {
        if (err) return utils.sendErrResponse(res, 500, 'An unknown error occurred.');
        if (!tournament) return utils.sendErrResponse(res, 404, 'Not Found: Tournament does not exist.');
        if (!tournament.started) return utils.sendErrResponse(res, 400, 'Bad Request: Tournament has not started.')
        if (tournament.admin.toString() !== req.user._id.toString()) return utils.sendErrResponse(res, 401, 'Access denied!');
        var b = new Bracket({
            type: bracket_type,
            name: bracket_name,
            tournament: tournament_id,
            matches: []
        });
        b.save(function(err, bracket) {
            if (err) return utils.sendErrResponse(res, 500, err);
            Match.initializeTourneyMatches(teams, bracket);
            utils.sendSuccessResponse(res, {bracket: bracket});
        });
    });
});

module.exports = router;
