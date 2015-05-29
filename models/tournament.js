// Author: Katharine Xiao
var mongoose = require("mongoose-q")();
var ObjectId = mongoose.Schema.Types.ObjectId;

var tournamentSchema = mongoose.Schema({
    name: {type: String, required: true}, 
    admin: { type: ObjectId, ref: 'User', required: true },
    type: String,
    description: String,
    statfields: [{name: {type: String, default: ''}, teamSpecific: {type: Boolean, default: false}}],
  	winner: {type: ObjectId, ref: 'Team'},
    started: {type: Boolean, default: false},
});

/** Methods **/
tournamentSchema.methods.setWinner = function(winner) {
  var tournament = this;
  tournament.winner = winner;
};

var Tournament = mongoose.model("Tournament", tournamentSchema);

exports.Tournament = Tournament;
