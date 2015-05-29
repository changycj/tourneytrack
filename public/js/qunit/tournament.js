// Author: Katharine Xiao
$(document).ready(function() {
    main();

    function main() {
        /*
            Test case 1: Testing Tournament creation, udpate, deletion, and authentication
        */
        test("testing tournament creation, update, deletion, and authentication", function() {
            var username = "kjx";
            var password = "kjx";
            var tournament_name = "tourney1";

            var user = getUser(username).content.user;
            logInUser(username, password);

            // Testing tournament creation
            var tournamentErr = createTournament(tournament_name);
            equal(JSON.parse(tournamentErr.responseText).err, 'Bad request: Tournament must have Score as a stat field.', 'Tournament must have Score as a stat field.');

            statList = [];
            statList.push({ name: 'Score', teamSpecific: true });
            var tournament = createTournament(tournament_name, statList).content.tournament;
            equal(tournament.admin, user._id, 'Expect logged in user to be the admin of the newly created tournament.');
            equal(tournament.description, undefined, 'Expect new tournament to have no description, since it wasn not specified.');

            // Start tournament
            var startedTournament = startTournament(tournament._id).content.tournament;
            equal(startedTournament.admin, user._id, 'Expect logged in user to still be the admin of the newly created tournament.');
            equal(startedTournament.started, true, 'Expect tournament to be started.');

            // Update tournament description
            var updatedTournament = updateTournament('new description', tournament._id).content.tournament;
            equal(updatedTournament.admin, user._id, 'Expect logged in user to still be the admin of the newly created tournament.');
            equal(updatedTournament.description, 'new description', 'Expect tournament description to be updated.');
            logout();

            logInUser('changycj', 'changycj');
            var updateErr = updateTournament('spammmmm', tournament._id);
            equal(JSON.parse(updateErr.responseText).err, 'Access denied!', 'Only the admin can update a tournament.');
            logout();

            logInUser(username, username);
            // Testing tournament deletion
            deleteTournament(tournament._id);
            var err = getTournamentById(tournament._id);
            equal(JSON.parse(err.responseText).err, 'Tournament does not exist.', 'Expect 404 error because tournament no longer exists');

            logout();

            // Attempt to create tournament without logging in 
            var accessDenied = createTournament(tournament_name);
            equal(JSON.parse(accessDenied.responseText).err, 'Access denied!', 'Expect 401 error because user is not logged in.');
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

        function updateTournament(description, tournamentId) {
            var out;
            $.ajax({
                type: 'PUT',
                data: {
                    description: description
                },
                url: '/api/tournament/'+tournamentId,
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

        function getTournamentById(tournamentId) {
            var out;
            $.ajax({
                type: 'GET',
                url: '/api/tournament/' + tournamentId,
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

        function deleteTournament(tournamentId) {
            var out;
            $.ajax({
                type: 'DELETE',
                url: '/api/tournament/' + tournamentId,
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