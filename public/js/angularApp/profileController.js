//Author: Judy Chang, Katharine Xiao
(function () {
    'use strict';

    angular
        .module('myApp')
        .controller('profileController', profileController);

    profileController.$inject = ['$scope', '$http', '$cookies', '$window'];

    function profileController($scope, $http, $cookies, $window) {
        $scope.title = 'User Profile';
        $scope.showModal = false;
        $scope.types = ['Single Elimination', 'Round Robin'];
        $scope.statfields = [];

        // Get current user, if logged in
        $http.get("/current_auth").then(function(response) {

            var data = response.data;
            if (data.success && data.content.user) {

                $scope.user = data.content.user;
                $scope.user_teams = [];
                $scope.user_matches = [];
                $scope.user_tourneys = [];
                $http.get("/api/team?player=" + $scope.user._id).then(function(resp) {
                    var data = resp.data;
                    if (data.success) {
                        // Get teams that user is a member of
                        $scope.user_teams = data.content.teams;
                        // Get matches of these teams
                        for (var i = 0; i < $scope.user_teams.length; i++) {
                            $http.get("/api/match?team=" + $scope.user_teams[i]._id).then(function(resp) {
                                var data = resp.data;
                                if (data.success) {
                                    $.merge($scope.user_matches, data.content.matches);
                                    filterMatches();
                                }
                            });
                        }
                    }
                });

                // Get tournaments that the user administers
                $http.get("/api/tournament?admin=" + $scope.user._id).then(function(resp) {
                    var data = resp.data;
                    if (data.success) {
                        $scope.user_tourneys = data.content.tournaments;
                    }
                });

            } else {
                $window.location.href = "/#/login";
            }
        });
            

        $scope.logout = function() {
            $http.get("/logout").then(function (resp) {
                $window.location.href = "/#/login";
            });
        };

        $scope.displayNewTourneyModal = function () {
            $scope.showModal = !$scope.showModal;
        }
        $scope.createTournament = function (tournamentName, description, statList) {
            // Automatically populate statList with the field Score
            var statfields = statList.slice(0);
            statfields.push({ name: 'Score', teamSpecific: true });
            // Post to API
            $http.post('/api/tournament', { tournament_name: tournamentName, statfields: statfields })
            .success(function (data) {
                if (data.success) {
                    $http.put('/api/tournament/' + data.content.tournament._id, { description: description })
                    .then(function (response) {

                    });
                    // Redirect to the new tournament
                    $window.location.href = "/#/tourney/" + data.content.tournament._id;
                }
            }).error(function (err) {
                $scope.message = "Error: Missing tournament name";
            });
        };
        
        $scope.removeField = function (itemIndex) {
            $scope.statfields.splice(itemIndex, 1);
        }

        $scope.addField = function () {
            $scope.statfields.push($scope.newField);
            $scope.newField = {};
        }

        /* Filter the matches of the user into matches that have already been played 
            and matches that have yet to be played */
        var filterMatches = function() {
            if ($scope.user_matches) {
                $scope.playedMatches = [];
                $scope.upcomingMatches = [];
                for (var i = 0; i < $scope.user_matches.length; i++) {
                    if ($scope.user_matches[i].outcome.winner) {
                        $scope.playedMatches.push($scope.user_matches[i]);
                    } else {
                        $scope.upcomingMatches.push($scope.user_matches[i]);
                    }
                }
            }
        }
    }
})();
