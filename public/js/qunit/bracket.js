// Author: Katharine Xiao
$(document).ready(function() {
    main();

    function main() {
        /*
            Test case 1: Bracket generation with Round Robin and Elimination
        */
        test("testing Bracket generation, update, and deletion", function() {
            var user1 = "j388923r";
            var user2 = "changycj";
            var user3 = "kjx";
            var tournament_name = "tourney2";
            var tournament_type1 = "Round Robin";
            var tournament_type2 = "Elimination";

            logInUser(user1, user1);
            var user = getUser(user1).content.user;

            // Create tournament
            statList = [];
            statList.push({ name: 'Score', teamSpecific: true });
            var tournament = createTournament(tournament_name, statList).content.tournament;
            equal(user._id, tournament.admin, 'Expect logged in user to be the admin of the newly created tournament');
            // Create teams
            var team1 = createTeam('Team1', tournament._id).content.team;
            logout();

            logInUser(user3, user3);
            var team2 = createTeam('Team2', tournament._id).content.team;
            logout();

            logInUser(user2, user2);
            var team3 = createTeam('Team3', tournament._id).content.team;
            logout();

            logInUser(user1, user1);
            startTournament(tournament._id);
            // Create Round Robin bracket
            var bracketRR = createBracket(tournament._id, 'b1', tournament_type1, [team1._id, team2._id, team3._id]).content.bracket;
            equal(bracketRR.tournament, tournament._id, 'Expect bracket to be created for specified tournament');
            equal(bracketRR.matches.length, 3, 'Expect 3 matches to be created for a Round Robin tournament of 3 teams.');
            equal(bracketRR.type, tournament_type1, 'Should be a Round Robin tourmanent.');
            var matchesRR = getMatches(bracketRR._id).content.matches;
            equal(matchesRR.length, 3, 'Expect 3 matches to be created for a Round Robin tournament of 3 teams.');

            // Create Elimination bracket
            var bracketElim = createBracket(tournament._id, 'b2', tournament_type2, [team1._id, team2._id, team3._id]).content.bracket;
            equal(bracketElim.tournament, tournament._id, 'Expect bracket to be created for specified tournament');
            equal(bracketElim.matches.length, 3, 'Expect 3 matches to be created for an Elimination tournament of 3 teams.');
            equal(bracketElim.type, tournament_type2, 'Should be an Elimination tourmanent.');
            var matchesE = getMatches(bracketElim._id).content.matches;
            equal(matchesE.length, 3, 'Expect 3 matches to be created for an Elimination tournament of 3 teams.');

            // Try and add a team more than once to same bracket
            var bracketErr1 = createBracket(tournament._id, 'b2', tournament_type2, [team1._id, team2._id, team2._id]);
            equal(JSON.parse(bracketErr1.responseText).err, 'Bad request: cannot have any duplicate teams in bracket.', 'Cannot have duplicated teams in a bracket.');

            var bracketErr2 = createBracket(tournament._id, undefined, tournament_type2, [team1._id, team2._id, team3._id]);
            equal(JSON.parse(bracketErr2.responseText).err, 'Bad request: missing bracket field(s).', 'Bracket must have name, type, tournament, and teams');

            // Get all brackets in a tournament
            var tourneyBrackets = getBracketsInTournament(tournament._id).content.brackets;
            equal(tourneyBrackets.length, 2, 'Expect tournament ' + tournament._id + ' to have 2 total brackets.');

            // Attempt to determine winner (insufficient results)
            var updatedBracket = updateBracket(bracketElim._id).content.bracket;
            equal(updatedBracket.winner, undefined, 'Winner cannot currently be determined.');

            // Delete bracket
            deleteBracket(bracketRR._id);
            var err = getBracketById(bracketRR._id);
            equal(JSON.parse(err.responseText).err, 'Bracket does not exist.', 'Bracket should no longer exist after deletion.');
            matchesE = getMatches(bracketRR._id).content.matches;
            equal(matchesE.length, 0, 'Expect 0 matches to now exist in this bracket.');

            // Expect only 1 bracket to exist in tournament
            tourneyBrackets = getBracketsInTournament(tournament._id).content.brackets;
            equal(tourneyBrackets.length, 1, 'Expect tournament ' + tournament._id + ' to now only have 1 bracket.');

            logout();

            // Login as another user
            logInUser('changycj', 'changycj');
            // Attempt to create a bracket in the same tournament
            createErr = createBracket(tournament._id, 'spam', tournament_type2, [team1._id, team2._id, team3._id]);
            equal(JSON.parse(createErr.responseText).err, 'Access denied!', 'User is not authorized to create a bracket in this tournament (not the admin).');
            logout()

        });

        //-------------------------------------------------
        //  User helper functions
        //-------------------------------------------------

        function getUser(username) {
            var out;
            $.ajax({
                type: 'GET',
                url: '/api/user/'+username,
                async: false,
                success: function(data) {
                    out = data;
                },
                error: function(err) {
                    out = err;
                }
            });
            return out;
        }

        function logInUser(username, password) {
            var out;
            $.ajax({
                type: 'POST',
                url: '/login',
                data: {
                    username: username,
                    password: password
                },
                async: false,
                success: function(data) {
                    out = data;
                },
                error: function(err) {
                    out = err;
                }
            });
            return out;
        }

        function logout() {
            var out;
            $.ajax({
                type: 'GET',
                url: '/logout',
                async: false,
                success: function(data) {
                    out = data;
                },
                error: function(err) {
                    out = err;
                }
            });
            return out;
        }

        // -----------------------------------------------------
        //   Tournament helper functions
        // -----------------------------------------------------
        function createTournament(name, statfields) {
            var out;
            $.ajax({
                type: 'POST',
                data: {
                    tournament_name: name,
                    statfields: statfields
                },
                url: '/api/tournament/',
                async: false,
                success: function(data) {
                    out = data;
                },
                error: function(err) {
                    out = err;
                }
            });
            return out;
        }

        function startTournament(id) {
            var out;
            $.ajax({
                type: 'PUT',
                data: {
                    started: true
                },
                url: '/api/tournament/'+id,
                async: false,
                success: function(data) {
                    out = data;
                },
                error: function(err) {
                    out = err;
                }
            });
            return out;
        }

        // -----------------------------------------------------
        //   Bracket helper functions
        // -----------------------------------------------------
        function createBracket(tournament, name, type, teams) {
            var out;
            $.ajax({
                type: 'POST',
                data: {
                    type: type,
                    name: name,
                    tournament: tournament,
                    teams: teams
                },
                url: '/api/bracket/',
                async: false,
                success: function(data) {
                    out = data;
                },
                error: function(err) {
                    out = err;
                }
            });
            return out;
        }

        function updateBracket(bracketId) {
            var out;
            $.ajax({
                type: 'PUT',
                data: {
                },
                url: '/api/bracket/'+bracketId,
                async: false,
                success: function(data) {
                    out = data;
                },
                error: function(err) {
                    out = err;
                }
            });
            return out;
        }

        function getBracketById(bracketId) {
            var out;
            $.ajax({
                type: 'GET',
                url: '/api/bracket/' + bracketId,
                async: false,
                success: function(data) {
                    out = data;
                },
                error: function(err) {
                    out = err;
                }
            });
            return out;
        }

        function getBracketsInTournament(tournamentId) {
            var out;
            $.ajax({
                type: 'GET',
                url: '/api/bracket?tournament='+tournamentId,
                async: false,
                success: function(data) {
                    out = data;
                },
                error: function(err) {
                    out = err;
                }
            });
            return out;
        }

        function deleteBracket(bracketId) {
            var out;
            $.ajax({
                type: 'DELETE',
                url: '/api/bracket/' + bracketId,
                async: false,
                success: function(data) {
                    out = data;
                },
                error: function(err) {
                    out = err;
                }
            });
            return out;
        }

        // -----------------------------------------------------
        //   Match helper functions
        // -----------------------------------------------------

        function getMatches(bracket) {
            var out;
            $.ajax({
                type: 'GET',
                url: '/api/match?bracket='+bracket,
                async: false,
                success: function(data) {
                    out = data;
                },
                error: function(err) {
                    out = err;
                }
            });
            return out;
        }

        // -----------------------------------------------------
        //   Team helper functions
        // -----------------------------------------------------

        function createTeam(name, tournament) {
            var out;
            $.ajax({
                type: 'POST',
                data: {
                    team_name: name,
                    tournament: tournament
                },
                url: '/api/team/',
                async: false,
                success: function(data) {
                    out = data;
                },
                error: function(err) {
                    out = err;
                }
            });
            return out;
        }
    }
});