// Author: Katharine Xiao
$(document).ready(function() {
    main();
    function main() {
      /*
            Test case 1: Testing Team creation and updating
      */
      test("testing team creation and updating", function() {
            var username = "kjx";
            var password = "kjx";
            var tournament_name = "tourney3";
            var tournament_type = "Round Robin";

            // Log in a user
            logInUser(username, password);
            var user = getUser(username).content.user;
            equal(user.username, username, 'Expect the correct user account to be retrieved.');

            // Create tournament (necessary because teams are tournament-specific)
            statList = [];
            statList.push({ name: 'Score', teamSpecific: true });
            var tournament = createTournament(tournament_name, statList).content.tournament;

            // Create a team
            var teamA = createTeam('TeamA', tournament._id).content.team;
            equal(teamA.captain, user._id, 'Expect captain to be the user that is currently logged in.');
            equal(teamA.members.length, 1, 'Expect teamA to have one member.');
            equal(teamA.members[0], user._id, 'Expect teamA to have the captain as a member');

            // Attempt to create another team in the tournament
            var teamError = createTeam('Team', tournament._id);
            equal(JSON.parse(teamError.responseText).err, 'Bad request: Cannot create more than one Team per Tournament.', 'User cannot create multiple teams per tournament.');

            // Attempt to re-add the captain to TeamA
            var teamAError = addMember(teamA._id, user._id);
            equal(JSON.parse(teamAError.responseText).err, 'Bad Request: User cannot join more than one team per tournament.', 'Expect that user cannot join more than one team per tournament');

            // Expect TeamA to only have one member, even though the action was called twice.
            equal(teamA.members.length, 1, 'Expect teamA to have one member.');
            equal(teamA.members[0], user._id, 'Expect team member to be the captain');

            // Delete a member from TeamA
            var newTeamA = deleteMember(teamA._id, user._id).content.team;
            equal(newTeamA.members.length, 0, 'Expect TeamA to now have zero members.');

            logout();

            // Log in another user
            logInUser('changycj', 'changycj');
            user = getUser('changycj').content.user;
            equal(user.username, 'changycj', 'Log in a new user.');

            // Join a team
            var add = addMember(teamA._id, user._id).content.team;
            equal(add.members.length, 1, 'Expect TeamA to now have one member.');
            equal(add.members[0], user._id, 'Expect changycj to be added to TeamA.');
            // Attempt to delete a member from the team
            var deleteErr = deleteMember(teamA._id, user._id);
            equal(JSON.parse(deleteErr.responseText).err, 'Unauthorized: Must be team captain to remove members.', 'Only the captain can remove members.');
            logout();

            // Start tournament
            startTournament(tournament._id);
            logInUser('j388923r','j388923r');
            user = getUser('j388923r').content.user;
            equal(user.username, 'j388923r', 'Log in a new user.');
            // Attempt to join team after tournament start
            var addErr = addMember(teamA._id, user._id);
            equal(JSON.parse(deleteErr.responseText).err, 'Unauthorized: Must be team captain to remove members.', 'Cannot join team after tournament has started.');
            logout();

      });

        // -----------------------------------------------------
        //   User helper functions
        // -----------------------------------------------------

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

        function getTeamById(id) {
            var out;
            $.ajax({
                type: 'GET',
                url: '/api/team/'+id,
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

        function addMember(id, userId) {
            var out;
            $.ajax({
                type: 'PUT',
                data: {
                  user_id: userId
                },
                url: '/api/team/'+id +'?action=add',
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

        function deleteMember(id, userId) {
            var out;
            $.ajax({
                type: 'PUT',
                data: {
                  user_id: userId
                },
                url: '/api/team/'+id +'?action=delete',
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