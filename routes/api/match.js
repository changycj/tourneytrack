// Author: Chris Rogers
var express = require('express');
var mongoose = require('mongoose');
var validator = require('validator');
var router = express.Router();

var Match = require("../../models/match").Match;
var Bracket = require("../../models/bracket").Bracket;
var Tournament = require("../../models/tournament").Tournament;
var User = require("../../models/user").User;
var utils = require("../../utils/utils.js");

var sendgrid = require("sendgrid")(process.env.SENDGRID_USERNAME, process.env.SENDGRID_PASSWORD);

/**
 * GET to retrieve an array of matches
 * @urlParam {Bracket._id} bracket the id of a bracket that all of the matches returned should be a part of
 * @urlParam {Team._id} team the id of a team that should be participating in each returned match.
 * @return {JSON} an object with a 'content.matches' field, which contains an array of matches
 */
router.get('/', function(req, res) {
  var searchParams = {};
  if (validator.isMongoId(req.query.bracket)) {
    searchParams.bracket = mongoose.Types.ObjectId(req.query.bracket);
  }
  if (validator.isMongoId(req.query.team)) {
    searchParams.participants = mongoose.Types.ObjectId(req.query.team);
  }

  Match.find(searchParams).populate('participants').execQ().then(function(matches) {
    utils.sendSuccessResponse(res, {matches: matches});
  }).fail(function(error) {
    handleError(error, res);
  })
})

/**
 * POST to create a new match
 * @param {Array<Team._id>} participants an array of the ids of the participating teams in the match (at most 2)
 * @param {Bracket._id} bracket the id of the bracket this match belongs to.
 * @param {Match._id} [Optional] winnerParentMatch the id of the match that the winner will compete in.
 * @param {Match._id} [Optional] loserParentMatch the id of the match that the loser will compete in.
 * @return {JSON} an object with a 'content.match' field with the new match
 * @error {400 Bad Request} if the request is missing the bracket id
 * @error {401 Unauthorized} if the current user is not the admin of the tournament
 * @error {404 Not Found} if the supplied bracket does not exist
 */
router.post('/', utils.restrict, function(req, res) {
  // Collect request parameters
  var participants = utils.validateMongoIdArray(req.body.participants) || [];
  var winnerParentMatch = validator.isMongoId(req.body.winnerParentMatch) ? req.body.winnerParentMatch : undefined;
  var loserParentMatch = validator.isMongoId(req.body.loserParentMatch) ? req.body.loserParentMatch : undefined;
  var bracketId = validator.isMongoId(req.body.bracket) ? req.body.bracket : undefined;

  if (!bracketId) {
    // All matches need a bracket
    handleError(new Error('Bad Request: Missing bracket'), res);
  } else {
    Bracket.findById(bracketId).populate('tournament').execQ().then(function(bracket) {
      if (!bracket) {
        // Bracket doesn't exist
        throw new Error('Not Found: Bracket "' + bracketId + '" does not exist');
      } else {
        if (!req.user._id.equals(bracket.tournament.admin)) {
          throw new Error('Unauthorized: User is not the admin of the tournament');
        }
        return Match.createNew(participants, winnerParentMatch, loserParentMatch, bracketId);
      }
    }).then(function(match) {
      utils.sendSuccessResponse(res, {match: match});
    }).fail(function(error) {
      handleError(error, res);
    });
  }
});

/**
 * GET a specific match
 * @urlParam {Match._id} match_id the id of the match to get
 * @return {JSON} an object with a 'content.match' field, containing the match
 * @error {400 Bad Request} if the supplied match is not a valid MongoDB ID
 * @error {404 Not Found} if the specified match does not exist
 */
router.get('/:match_id', function(req, res) {
  var matchId = req.params.match_id;
  if (!validator.isMongoId(matchId)) {
    return utils.sendErrResponse(res, 400, 'Bad Request: Invalid Match ID');
  }
  Match.findById(matchId).populate("participants").execQ().then(function(match) {
    if (!match) {
      // Requested match does not exist
      throw new Error('Not Found: Match "' + req.params.match_id + '" does not exist');
    } else {
      utils.sendSuccessResponse(res, {match: match});
    }
  }).fail(function(error) {
    handleError(error, res);
  });
});

/**
 * PUT the match outcome
 * @urlParam {Match._id} match_id the id of the match to update
 * @param {Team._id} winner the winner of the match
 * @param {Team._id} loser the loser of the match
 * @param {Array} metadata an array of metadata fields (see match model for structure of each metadata field)
 * @param {Boolean} [Optional] preliminary if this outcome is to be submitted as a preliminary outcome [Default: false]
 *    if it is preliminary, the outcome is stored in preliminaryOutcomes, clobbering any existing preliminary outcome previously submitted by this team
 *    else, the outcome is saved for the match. This can only be done once per match.
 * @return {JSON} an object with a 'content.match' field, containing the updated match
 * @error {400 Bad Request} if the supplied match is not a valid MongoDB ID
 * @error {400 Bad Request} if trying to submit a final outcome of a match whose outcome is already reported
 * @error {400 Bad Request} if winner or loser is not provided
 * @error {400 Bad Request} if not all stat fields required by the tournament are provided in metadata
 * @error {401 Unauthorized} if the user is not an admin or a team captain
 * @error {404 Not Found} if the specified match does not exist
 */
router.put('/:match_id/outcome', utils.restrict, function(req, res) {
  var winner = validator.isMongoId(req.body.winner) ? req.body.winner : undefined;
  var loser = validator.isMongoId(req.body.loser) ? req.body.loser : undefined;
  var preliminary = req.body.preliminary ? validator.toBoolean(req.body.preliminary) : undefined;
  var matchId = req.params.match_id;
  if (!validator.isMongoId(matchId)) {
    return utils.sendErrResponse(res, 400, 'Bad Request: Invalid Match ID');
  }
  Match.findById(matchId).populate('bracket').populate('participants').execQ().then(function(match) {
    if (!match) {
      // Requested match does not exist
      throw new Error('Not Found: Match "' + req.params.match_id + '" does not exist');
    } else {
      return Tournament.populateQ(match, {path: 'bracket.tournament'});
    }
  }).then(function(match) {
    if (!req.user._id.equals(match.bracket.tournament.admin) && !req.user._id.equals(match.participants[0].captain) && !req.user._id.equals(match.participants[1].captain)) {
      throw new Error('Unauthorized: User is not the admin of the tournament or a team captain');
    } else if (match.isOutcomeSet()) {
      throw new Error('Bad Request: Cannot set outcome of a match that already has an outcome');
    } else if (!winner || !loser) {
      throw new Error('Bad Request: Outcome must specify a winner and a loser');
    }
    var outcome = {
      winner: winner,
      loser: loser,
      metadata: req.body.metadata
    };
    // Check that all required metadata fields have been set
    if (match.bracket.tournament.statfields.length > 0) {
      if (!outcome.metadata) {
        throw new Error('Bad Request: Must provide all required stat fields in metadata');
      } else {
        match.bracket.tournament.statfields.forEach(function(field) {
          if (!checkStatField(field, outcome.metadata)) {
            throw new Error('Bad Request: Must provide all required stat fields in metadata');
          }
        });
      }
    }

    // approves outcome
    if (req.user._id.equals(match.bracket.tournament.admin) && Boolean(req.body.preliminary) != true) {
      return match.setOutcome(outcome);
    } else {
    // team reports outcome
      var teamId;
      if (req.user._id.toString() === match.participants[0].captain.toString()) {
        teamId = match.participants[0]._id;
      } else {
        teamId = match.participants[1]._id;
      }
      outcome['reportedBy'] = teamId;

      emailOutcomeReport(match, outcome);

      return match.setPreliminaryOutcome(outcome, teamId);
    }  
  }).then(function(match) {
    utils.sendSuccessResponse(res, {match: match});
  }).fail(function(error) {
    handleError(error, res);
  });
});

var handleError = function(error, res) {
  console.log(error);
  if (error.message.indexOf('Not Found') === 0) {
    utils.sendErrResponse(res, 404, error.message);
  } else if (error.message.indexOf('Unauthorized') === 0) {
    utils.sendErrResponse(res, 401, error.message);
  } else if (error.message.indexOf('Bad Request') === 0) {
    utils.sendErrResponse(res, 400, error.message);
  } else if (error.name === 'CastError') {
    utils.sendErrResponse(res, 400, 'Bad Request: Supplied match id is not a proper id');
  } else {
    utils.sendErrResponse(res, 500, error.message);
  }
};

/**
 * Checks to see that a given statField is present in the metadata, with appropriate
 * value filled (match or team-specific)
 */
var checkStatField = function(statField, metadata) {
  return metadata.reduce(function(prev, data) {
    return prev || 
      // Name of field is present
      (data.name === statField.name &&
        // If not team specific, has match value
        ((!statField.teamSpecific && validator.isNumeric(data.value.match)) ||
        // If is team specific, has winner and loser value
        (statField.teamSpecific && validator.isNumeric(data.value.winner) && validator.isNumeric(data.value.loser))));
  }, false);
};

/**
 * Sends an email of the outcome to the tournament admin
 */
var emailOutcomeReport = function(match, outcome) {

  var winnerName = (match.participants[0]._id.toString() == outcome.winner.toString()) ?
      match.participants[0].name : match.participants[1].name;
  var loserName = (match.participants[0]._id.toString() == outcome.loser.toString()) ?
      match.participants[0].name : match.participants[1].name;

  var mailContent = "Hello!<br><br>"
  + "Your tournament named '" + match.bracket.tournament.name + "' has a new outcome report. <br>"
  + "Match between " + winnerName + " and " + loserName + "<br>"
  + "Outcome reported by " + ((match.participants[0]._id.toString() == outcome.reportedBy.toString()) ?
      match.participants[0].name : match.participants[1].name) + ":<br>"
  + "Winner: " + winnerName + "<br>" 
  + "Loser: " + loserName + "<br>";
  
  console.log(outcome.metadata);
  var meta = "<ul>";
  for (var i = 0; i < outcome.metadata.length; i++) {
    var name = outcome.metadata[i].name;
    var winnerVal = outcome.metadata[i].value.winner;
    var loserVal = outcome.metadata[i].value.loser;
    var matchVal = outcome.metadata[i].value.match;

    meta += ("<li>" + name 
      + "<ul>" 
      + (winnerVal ? ("<li>" + winnerName + ": " + winnerVal + "</li>") : "")
      + (loserVal ? ("<li>" + loserName + ": " + loserVal + "</li>") : "")
      + (matchVal ? ("<li>" + matchVal + "</li>") : "")
      + "</ul></li>");
  }
  meta += "</ul>";
  mailContent += meta;

  User.findOne({_id: match.bracket.tournament.admin}).exec(function(err, user) {
    if (err) {
      utils.sendErrResponse(res, 500, "Mongoose error.");
    } else {

      var mailOptions = {
        to: user.username + "@mit.edu",
        from: process.env.SENDGRID_USERNAME,
        subject: "TourneyTrack: New Outcome Report",
        html: mailContent
      };
      console.log(mailOptions);

      sendgrid.send(mailOptions, function(err, json) {
        // if (err) { return console.error(err); }
        // console.log(json);
      });
    }
  });

};

module.exports = router;
