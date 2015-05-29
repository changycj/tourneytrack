// Author: Katharine Xiao
var mongoose = require("mongoose");
var ObjectId = mongoose.Schema.Types.ObjectId;

var teamSchema = mongoose.Schema({
	name: {type: String, required: true},
	captain: {type: ObjectId, ref: 'User', required: true},
	tournament: {type: ObjectId, ref: 'Tournament', required: true},
	members: [{type: ObjectId, ref: 'User'}],
  	matches: [{type: ObjectId, ref: 'Match'}]
});

/** Methods **/
teamSchema.methods.addMembers = function(members) {
  var team = this;
  team.members.concat(members);
};

var Team = mongoose.model("Team", teamSchema);

exports.Team = Team;
