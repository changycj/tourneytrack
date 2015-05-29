// Author: Chris Rogers
var fromStringToHex = function(str) {
    var hex = "";
    for (var i = 0; i < str.length; i++) {
        hex += str.charCodeAt(i).toString(16);
    }
    return hex;
}

module('Match API Tests', {
  setup: function() {
    stop();
    var mod = this;
    createNewDBObjects(mod);
  },
  teardown: function() {
    stop();
    $.get('/logout').always(function() { start(); });
  },
});
asyncTest('POST / with no bracket test', function() {
  $.post('/api/match')
  .done(function(match) {
    ok(false, 'Should have failed.');
  }).fail(function(error) {
    equal(error.status, 400, 'Got a bad request, as expected!');
  }).always(function() {
    start();
  });
});
asyncTest('POST and GET / test', function() {
  var mod = this;
  var payload = {
    bracket: this.bracket._id,
  };
  $.post('/api/match', payload)
  .then(function(data) {
    var match = data.content.match;
    ok(match, 'Testing that the new match was created');
    equal(match.bracket, mod.bracket._id, 'Testing that bracket is correctly set');
    return $.get('/api/match/' + data.content.match._id);
  }).then(function(data) {
    var match = data.content.match;
    ok(match, 'Testing that new match is gettable from match GET request');
    return $.get('/api/match?bracket=' + mod.bracket._id);
  }).then(function(data) {
    var match = data.content.matches[0];
    ok(match, 'Testing that new match is gettable from match GET using bracket search param');
  }).fail(function(error) {
    console.log(error);
    ok(false, 'Failed with error (Check console for details)');
  }).always(function() {
    start();
  });
});

asyncTest('PUT /:match_id/outcome test', function() {
  var mod = this;
  // Create two parent matches
  $.post('/api/match', {bracket: mod.bracket._id})
  .then(function(data) {
    mod.winnerParentMatch = data.content.match;
    return $.post('/api/match', {bracket: mod.bracket._id});
  }).then(function(data) {
    mod.loserParentMatch = data.content.match;
    var payload = {
      bracket: mod.bracket._id,
      participants: [mod.team1._id, mod.team2._id],
      winnerParentMatch: mod.winnerParentMatch._id,
      loserParentMatch: mod.loserParentMatch._id,
    };
    // Create new match
    return $.post('/api/match', payload);
  }).then(function(data) {
    // Post a preliminary outcome 
    var payload = {
      preliminary: true,
      winner: mod.team1._id,
      loser: mod.team2._id,
      metadata: [
        {name: 'Score', value: {winner: 5, loser: 2}},
        {name: 'Duration', value: {match: 100}},
      ]
    };
    return $.ajax('/api/match/' + data.content.match._id + '/outcome', {data: payload, type: 'PUT'});
  }).then(function(data) {
    var match = data.content.match;
    ok(match, 'Updated match is returned from PUT request');
    equal(match.preliminaryOutcomes[0].winner, mod.team1._id, 'Winner is properly set');
    equal(match.preliminaryOutcomes[0].loser, mod.team2._id, 'Loser is properly set');
    equal(match.preliminaryOutcomes[0].metadata[0].name, 'Score', 'Score field is present in metadata');
    equal(match.preliminaryOutcomes[0].metadata[0].value.winner, 5, 'Winner score is properly set');
    equal(match.preliminaryOutcomes[0].metadata[0].value.loser, 2, 'Loser score is properly set');
    equal(match.preliminaryOutcomes[0].metadata[1].name, 'Duration', 'Duration field is present in metadata');
    equal(match.preliminaryOutcomes[0].metadata[1].value.match, 100, 'Duration is properly set');
    
    // Update the preliminary outcome
    var payload = {
      preliminary: true,
      winner: mod.team2._id,
      loser: mod.team1._id,
      metadata: [
        {name: 'Score', value: {winner: 50, loser: 20}},
        {name: 'Duration', value: {match: 6}},
      ]
    };
    return $.ajax('/api/match/' + data.content.match._id + '/outcome', {data: payload, type: 'PUT'});
  }).then(function(data) {
    var match = data.content.match;
    ok(match, 'Updated match is returned from second PUT request');
    equal(match.preliminaryOutcomes[0].winner, mod.team2._id, 'Winner is properly updated');
    equal(match.preliminaryOutcomes[0].loser, mod.team1._id, 'Loser is properly updated');
    equal(match.preliminaryOutcomes[0].metadata[0].name, 'Score', 'Score field is still present in metadata');
    equal(match.preliminaryOutcomes[0].metadata[0].value.winner, 50, 'Winner score is properly updated');
    equal(match.preliminaryOutcomes[0].metadata[0].value.loser, 20, 'Loser score is properly updated');
    equal(match.preliminaryOutcomes[0].metadata[1].name, 'Duration', 'Duration field is still present in metadata');
    equal(match.preliminaryOutcomes[0].metadata[1].value.match, 6, 'Duration is properly updated');

    // Submit a final outcome
    var payload = {
      winner: mod.team1._id,
      loser: mod.team2._id,
      metadata: [
        {name: 'Score', value: {winner: 5, loser: 2}},
        {name: 'Duration', value: {match: 50}},
      ]
    };
    return $.ajax('/api/match/' + data.content.match._id + '/outcome', {data: payload, type: 'PUT'});
  }).then(function(data) {
    var match = data.content.match;
    ok(match, 'Updated match is returned from final PUT request');
    equal(match.outcome.winner, mod.team1._id, 'Final winner is properly set');
    equal(match.outcome.loser, mod.team2._id, 'Final loser is properly set');
    equal(match.outcome.metadata[0].name, 'Score', 'Score field is present in final metadata');
    equal(match.outcome.metadata[0].value.winner, 5, 'Final winner score is properly set');
    equal(match.outcome.metadata[0].value.loser, 2, 'Final loser score is properly set');
    equal(match.outcome.metadata[1].name, 'Duration', 'Duration field is present in final metadata');
    equal(match.outcome.metadata[1].value.match, 50, 'Final duration is properly set');

    // Find winner parent match
    return $.get('/api/match/' + mod.winnerParentMatch._id);
  }).then(function(data) {
    var match = data.content.match;
    equal(match.participants[0]._id, mod.team1._id, 'Winner is placed into winner parent match');

    // Find loser parent match
    return $.get('/api/match/' + mod.loserParentMatch._id);
  }).then(function(data) {
    var match = data.content.match;
    equal(match.participants[0]._id, mod.team2._id, 'Loser is placed into loser parent match');
  }).fail(function(error) {
    console.log(error);
    ok(false, 'Failed with error (Check console for details)');
  }).always(function() {
    start();
  });
});

var createNewDBObjects = function(mod) {
  $.get('/api/user/crogers3')
  .then(function(data) {
    mod.user = data.content.user;
    // Login as Chris
    return $.post('/login', {username:'crogers3', password:'crogers3'});
  }).then(function(data) {
    // Create a new tournament
    return $.post('/api/tournament', {tournament_name: 'Test Tournament', statfields: [{name: 'Score', teamSpecific: true}, {name: 'Duration', teamSpecific: false}]});
  }).then(function(data) {
    mod.tournament = data.content.tournament;
    // Create a new team
    return $.post('/api/team', {team_name: 'Test Team 1', tournament: mod.tournament._id});
  }).then(function(data) {
    mod.team1 = data.content.team;
    // Logout
    return $.get('/logout');
  }).then(function() {
    // Login as Judy
    return $.post('/login', {username: 'changycj', password: 'changycj'});
  }).then(function() {
    // Create a new team
    return $.post('/api/team', {team_name: 'Test Team 2', tournament: mod.tournament._id});
  }).then(function(data) {
    mod.team2 = data.content.team;
    // Logout
    return $.get('/logout');
  }).then(function() {
    // Login as Chris
    return $.post('/login', {username:'crogers3', password:'crogers3'});
  }).then(function() {
    // Start tournament
    return $.ajax('/api/tournament/'+mod.tournament._id, {data: {started: true}, type: 'PUT'});
  }).then(function() {
    // Create a new bracket
    return $.post('/api/bracket', {type: 'Elimination', tournament: mod.tournament._id, teams: [mod.team1._id, mod.team2._id], name: 'Test Bracket'});
  }).then(function(data) {
    mod.bracket = data.content.bracket;
  }).fail(function(err) {
    console.log(err);
    ok(false, 'Setup Failed (See console for details)');
  }).always(function() {
    start();
  });
}
