// Author: Chris Rogers, Katharine Xiao, and Yachi Chang
var mongoose = require("mongoose-q")();
var ObjectId = mongoose.Schema.Types.ObjectId;

/**
 * Schema for our Match model.
 * @field participants A list consisting of at most two teams who are competing
 *    in this match.
 * @field winnerParentMatch is the match that the winner of this match will compete in.
 * @field loserParentMatch is the match that the loser of this match will compete in.
 * @field bracket The Bracket that this Match is a part of.
 * @field outcome An object representing the outcome data of this match:
 *    @field winner The Team who won this match.
 *    @field winnerScore The score of the winning team.
 *    @field loser The Team who lost this match.
 *    @field loserScore The score of the losing team.
 *    @field metadata A list of key-value pairs representing various data that
 *        will be saved and aggregated among all matches.
 * @field preliminaryOutcomes An array representing the submitted outcome data of this
 *    match that is awaiting admin approval:
 */
var matchSchema = mongoose.Schema({
  participants: [{type: ObjectId, ref: 'Team'}],
  winnerParentMatch: {type: ObjectId, ref: 'Match'},
  loserParentMatch: {type: ObjectId, ref: 'Match'},
  bracket: {type: ObjectId, ref: 'Bracket', required: true},
  outcome: {
    winner: {type: ObjectId, ref: 'Team'},
    loser: {type: ObjectId, ref: 'Team'},
    metadata: [{name: String, value: {winner: Number, loser: Number, match: Number}}],
  },
  preliminaryOutcomes: [{
      winner: {type: ObjectId, ref: 'Team'},
      loser: {type: ObjectId, ref: 'Team'},
      metadata: [{name: String, value: {winner: Number, loser: Number, match: Number}}],
      reportedBy: {type: ObjectId, ref: 'Team'}
    }]
});

/** Validators **/
matchSchema.path('participants').validate(function(value) {
  // Can have one or two participants.
  return value.length <= 2;
});

/** Statics **/
matchSchema.statics.createNew = function(participants, winnerParentMatch, loserParentMatch, bracket) {
  var match = new Match({
    participants: participants,
    winnerParentMatch: winnerParentMatch,
    loserParentMatch: loserParentMatch,
    bracket: bracket,
  });
  return match.saveQ();
};

/* 
  Given a bracket (with a type of either Elimination or Round robin),
  automatically generate a series of matches
*/
matchSchema.statics.initializeTourneyMatches = function (teams, bracket) {
    // For Round Robin, create a match between every pair of teams in the given list
    if (bracket.type === "Round Robin") {
      var allMatches = []
        for (var i = 0; i < teams.length; i++) {
            for (var j = i+1; j < teams.length; j++) {
                  var participants = [teams[i], teams[j]];
                  var match = new Match({
                      participants: participants,
                      bracket: bracket._id
                  });
                  match.save();
                  allMatches.push(match);
            }
        }
        bracket.matches = allMatches;
        bracket.save();
    // Elimination bracket creation
    } else if (bracket.type === "Elimination") {
        var numTeams = teams.length;
        var numRounds = Math.ceil(Math.log(numTeams)/Math.log(2));
        var halfNumMatches = Math.pow(2, numRounds-1) - 1;
        var allMatches = [];

        // Generate matches, starting from the final match (indexed at 0)
        // This doesn't include the initial layer of matches, which are paired from teams
        for (var i = 0; i < halfNumMatches; i++) {
            var parentIndex = Math.floor((i-1)/2);
            var newMatch = new Match({
                  bracket: bracket._id,
                  winnerParentMatch: allMatches[parentIndex]
              });
            newMatch.save();
            allMatches.push(
              newMatch
            );
        }

        // Outermost layer of matches, matches up teams
        var numMatches = Math.pow(2, numRounds-1);
        for (j = 0; j < numMatches; j++) {
            var index = Math.floor((j+halfNumMatches-1)/2);
            var outcome = {};
            var participants = [];
            if (!teams[j]) {
                outcome.winner = teams[j+numMatches];
                participants = [teams[j+numMatches]];
                allMatches[index].participants.push(teams[j + numMatches]);
                allMatches[index].save();
            } else if (!teams[j+numMatches]) {
                outcome.winner = teams[j];
                participants = [teams[j]];
                allMatches[index].participants.push(teams[j]);
                allMatches[index].save();
            } else {
                participants = [teams[j], teams[j+numMatches]];
            }
            var newMatch = new Match({
                      participants: participants, 
                      bracket: bracket._id,
                      winnerParentMatch: allMatches[index],
                      outcome: outcome
                  });
            newMatch.save();
            allMatches.push(newMatch);
        }
        bracket.matches = allMatches;
        bracket.save();
    }
}

/**
 * @returns Whether or not setOutcome has every been successfully called on this match.
 */
matchSchema.methods.isOutcomeSet = function() {
  var outcome = this.outcome;
  return outcome.winner || outcome.loser || outcome.winnerScore || outcome.loserScore || outcome.metadata.length > 0;
};

//Sets the main outcome for the match and propogates that
//outcome through to the next round if elimination style.
matchSchema.methods.setOutcome = function(outcome) {
  return this.populateQ('winnerParentMatch loserParentMatch')
  .then(function(match) {
    var promise;
    match.outcome = outcome;
    // Place winner into first parent match
    if (match.winnerParentMatch && outcome.winner) {
      match.winnerParentMatch.participants.push(outcome.winner);
      promise = match.winnerParentMatch.saveQ();
    }
    // Place loser into second parent match
    if (match.loserParentMatch && outcome.loser) {
      match.loserParentMatch.participants.push(outcome.loser);
      var secondPromise = match.loserParentMatch.saveQ();
      promise = promise ? promise.then(function() {return secondPromise}) :
                          secondPromise;
    }
    var finalPromise = match.saveQ();
    if (promise) {
      return promise.then(function() {return finalPromise;});
    } else {
      return finalPromise;
    }
  });
};

//Reports the outcome of a match to the admin. This does not set the
//actual outcome and does not propagate through. It simply reports
//it to the admin for approval.
matchSchema.methods.setPreliminaryOutcome = function(outcome, teamId) {
  return this.populateQ('participants')
  .then(function(match) {
    var found = false;
    // If the reporting team already has a preliminary outcome, replace the older outcome with the newer one
    for (var i = 0; i < match.preliminaryOutcomes.length; i++) {
      if (match.preliminaryOutcomes[i].reportedBy.toString() === teamId.toString()) {
        match.preliminaryOutcomes.splice(i, 1, outcome);
        found = true;
      }
    }
    // If this is this team's first time reporting a preliminary outcome, push it onto the list
    if (!found) {
      match.preliminaryOutcomes.push(outcome);
    }
    return finalPromise = match.saveQ();
  });
};

var Match = mongoose.model("Match", matchSchema);

exports.Match = Match;
