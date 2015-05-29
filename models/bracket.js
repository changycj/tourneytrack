// Author: Jamar Brooks
var mongoose = require("mongoose-q")();

var bracketSchema = mongoose.Schema({
    type: { type: String, required: true },
    name: {type: String, required: true},
    tournament: { type: mongoose.Schema.Types.ObjectId, ref: "Tournament", required: true },
    winner: { type: mongoose.Schema.Types.ObjectId, ref: "Team" },
    matches: [{ type: mongoose.Schema.Types.ObjectId, ref: "Match" }]
});

/**
 * Determines the winning team for a bracket and sets the winner.
 * For Elimination brackets, the winner of the bracket is the winner of the final match in the match hierarchy.
 * For Round Robin brackets, the winner is the team who has won the most matches.
 */
bracketSchema.methods.determineWinner = function()
{
    var finished = true;
    this.populate("matches", function (err, bracket) {
        if (err) {
        }
        else {
            // Determine if bracket is finished by seeing if all matches have outcomes
            for (var key = 0; key < bracket.matches.length; key++)
            {
                if (!bracket.matches[key].isOutcomeSet())
                    finished = false;
            }
            // If bracket is finished, determine the bracket winner
            if(finished)
            {
                var winner = null;
                // For Round Robin
                if (bracket.type === 'Round Robin') {
                    var winCount = {};
                    for (var key = 0; key < bracket.matches.length; key++) {
                        if (winCount[bracket.matches[key].outcome.winner]) {
                            winCount[bracket.matches[key].outcome.winner][0] += 1;
                            winCount[bracket.matches[key].outcome.winner][1] += bracket.matches[key].outcome.winnerScore;
                        }
                        else {
                            winCount[bracket.matches[key].outcome.winner] = [1, bracket.matches[key].outcome.winnerScore];
                        }
                        if (winCount[bracket.matches[key].outcome.loser]) {
                            winCount[bracket.matches[key].outcome.loser][1] += bracket.matches[key].outcome.loserScore;
                        }
                        else {
                            winCount[bracket.matches[key].outcome.loser] = [0, bracket.matches[key].outcome.loserScore];
                        }
                    }
                    for (var team in winCount) {
                        if (!winner  || winCount[team][0] > winCount[winner][0]) {
                            winner = team;
                        }
                        else if (winCount[team][0] === winCount[winner][0] && winCount[team][1] > winCount[winner][1]) {
                            winner = team;
                        }
                    }
                }
                // For Elimination, the winner is winner of the final match
                else {
                    for (var key = 0; key < bracket.matches.length; key++) {
                        if (bracket.matches[key].winnerParentMatch === undefined && bracket.matches[key].loserParentMatch === undefined)
                            winner = bracket.matches[key].outcome.winner;
                    }
                }
                bracket.winner = winner;
                bracket.save();
            }
            // else {
            //         console.log("Bracket is not finished.");
            // }
        }
    });
}

bracketSchema.methods.setMatches = function (matches) {
    for(var index in matches)
        this.matches.push(matches[index]._id);
}

var Bracket = mongoose.model("Bracket", bracketSchema);

// validation
var checkType = function(t) {
    return t == "Round Robin" || t == "Elimination";
}

Bracket.schema.path("type").validate(checkType, "Type must be either 'Round Robin' or 'Elimination'.");

exports.Bracket = Bracket;
