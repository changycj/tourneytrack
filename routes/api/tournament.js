// Author: Katharine Xiao
var express = require('express');
var validator = require('validator');
var router = express.Router();

var Tournament = require("../../models/tournament").Tournament;
var Bracket = require("../../models/bracket").Bracket;
var Match = require("../../models/match").Match;
var Team = require("../../models/team").Team;
var utils = require('../../utils/utils');

/**
 * GET all tournaments
 * @urlParam {User._id} [Optional] admin the ID of the admin to be used to filter the resulting tournaments.
 *    When supplied, only returns tournaments administered by admin.
 * @return {JSON} an object with a 'content.tournaments' field, which contains an array of tournaments
 */
router.get("/", function(req, res) {
    var searchParams = {};
    if (validator.isMongoId(req.query.admin)) {
        searchParams.admin = req.query.admin;
    }
	Tournament.find(searchParams).exec(function(err, tournaments) {
	    if (err) return utils.sendErrResponse(res, 500, "An unknown error occurred.");
		utils.sendSuccessResponse(res, {tournaments: tournaments});
	})
})

/**
 * POST to create a new tournament
 * @param {String} tournament_name the name of the new tournament
 * @param {Array<Object>} statfields an array containing the required metadata fields for the tournament.
 *    Each object in the array has a String name field and a Boolean teamSpecific field.
 * @return {JSON} an object with a 'content.tournament' field, containing the new tournament.
 * @error {400 Bad Request} if the request is missing a name or stat fields, or statfields does not contain a Score field.
 */
router.post("/", utils.restrict, function(req, res) {
    var name = validator.toString(req.body.tournament_name);
    var stats = req.body.statfields;
    // All tournaments must have Score as a stat field
    var foundScore = false;
    if (stats) {
        stats.forEach(function(field) {
        if (field.name === 'Score' && Boolean(field.teamSpecific) === true) {
          foundScore = true;
        }
        });
    }
    if (!foundScore) return utils.sendErrResponse(res, 400, 'Bad request: Tournament must have Score as a stat field.');
    if(!name) {
        return utils.sendErrResponse(res, 400, 'Bad request: missing tournament field(s).');
    }
    // Create and save a new tournament
	var t = new Tournament({
	    name: name,
	    admin: req.user._id,
      statfields: stats
	});
    t.save(function(err, tournament) {
    	if (err) return utils.sendErrResponse(res, 500, err);
    	utils.sendSuccessResponse(res, {tournament: tournament});
    });
});

/**
 * GET a single tournament
 * @urlParam {Tournament._id} tournament_id a String representation of a Tournament ObjectId
 * @return {JSON} an object with a 'content.tournament' field, containing the found tournament
 * @error {400 Bad Request} if supplied tournament is not a valid MongoDB ID
 * @error {404 Not Found} if supplied tournament does not exist
 */
router.get("/:tournament_id", function(req, res) {
    var tournament_id = req.params.tournament_id;
    if (!validator.isMongoId(tournament_id)) {
      return utils.sendErrResponse(res, 400, 'Invalid Tournament ID');
    }

    Tournament.findOne({_id: tournament_id}).populate('admin').exec(function(err, tournament) {
    	if (err) return utils.sendErrResponse(res, 500, 'An unknown error occurred.');
        if (!tournament) {
        	return utils.sendErrResponse(res, 404, 'Tournament does not exist.');
        }
        return utils.sendSuccessResponse(res, {tournament: tournament});
    });

});

/**
 * PUT to edit a tournament
 * @urlParam {Tournament._id} tournament_id the id of the tournament to edit
 * @param {Boolean} [Optional] started updates whether the tournament has started
 * @param {String} [Optional] description the new description
 * @return {JSON} an object with a 'content.tournament' field, containing the updated tournament
 * @error {401 Unauthorized} if current user is not the admin of this tournament
 * @error {404 Not Found} if supplied tournament does not exist
 */
router.put("/:tournament_id", utils.restrict, function(req, res) {
	Tournament.findOne({_id: req.params.tournament_id}).exec(function(err, tournament) {
		if (err) return utils.sendErrResponse(res, 500, 'Mongoose put tournament error.');
		if (!tournament) {
			return utils.sendErrResponse(res, 404, 'Tournament does not exist.');
		}
        if (tournament.admin.toString() !== req.user._id.toString()) {
            return utils.sendErrResponse(res, 401, 'Access denied!');
        }
		if (req.body.started) {
			tournament.started = Boolean(req.body.started);
		}
        if (req.body.description) {
            tournament.description = req.body.description;
        }
		tournament.save(function(err, tournament) {
			if (err) return utils.sendErrResponse(res, 500, err);
			utils.sendSuccessResponse(res, {tournament: tournament});
		});
	});
});

/**
 * DELETE a tournament
 * @urlParam {Tournament._id} tournament_id the id of the tournament to delete
 * @error {400 Bad Request} if the tournament ID is not a valid MongoDB ID
 * @error {401 Unauthorized} if current user is not the admin of this tournament
 * @error {404 Not Found} if supplied tournament does not exist
 */
router.delete('/:tournament_id', utils.restrict, function(req, res) {
    var tournament_id = req.params.tournament_id;
    if (!validator.isMongoId(tournament_id)) {
      return utils.sendErrResponse(res, 400, 'Invalid Tournament ID');
    }
    Tournament.findOne({_id: tournament_id}).exec(function(err, tournament) {
        if (err) return utils.sendErrResponse(res, 500, 'An unknown error occurred.');
        if (!tournament) {
            return utils.sendErrResponse(res, 404, 'Tournament does not exist.');
        }
        if (req.user._id.toString() !== tournament.admin.toString()) {
            return utils.sendErrResponse(res, 401, 'Access denied!')
        }
        // Delete all brackets (and all matches in those brackets) in the tournament
        Bracket.find({tournament: tournament_id}).exec(function(err, brackets) {
            if (err) return utils.sendErrResponse(res, 500, "An unknown error occurred.");
            brackets.forEach(function(bracket) {
                Match.remove({bracket: bracket._id}).exec();
                bracket.remove();
            });
            Team.remove({tournament: tournament_id}).exec();
            tournament.remove();
            utils.sendSuccessResponse(res);
        });
    });
});

module.exports = router;
