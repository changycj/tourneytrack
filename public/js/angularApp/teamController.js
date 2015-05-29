//Author: Jamar Brooks, Chris Rogers, Katharine Xiao
(function () {
    'use strict';

    angular
        .module('myApp')
        .controller('teamController', teamController);

    teamController.$inject = ['$scope', '$http', '$routeParams', '$cookies', '$window'];

    function teamController($scope, $http, $routeParams, $cookies, $window) {
        $scope.title = 'teamController';
        $scope.tourneysPlayed = {};
        $scope.wins = 0;
        $scope.losses = 0;

        // Get current user, if logged in
        $http.get("/current_auth").then(function(response) {
            var data = response.data;

            if (data.success) {
                $scope.user = data.content.user;

                // Get the team that this team page corresponds to
                $http.get('/api/team/' + $routeParams.id).then(function (response) {
                    var data = response.data;
                    $scope.team = data.content.team;
                    // Determine if the current user is a member of this team
                    $scope.isAMember = $scope.team.members.reduce(function (prev, current) {
                        return prev || ($scope.user && current.username == $scope.user.username);
                    }, false);

                }).then(function () {
                    return $http.get('/api/tournament/' + $scope.team.tournament._id);

                }).then(function (response) {
                    // Set the team's tournament and the corresponding stat fields 
                    $scope.tournament = response.data.content.tournament;
                    $scope.statfields = $scope.tournament.statfields.filter(function (item) {
                        return item.teamSpecific;
                    });

                    $scope.stats = {};

                    // Initialize team stats
                    for (var i = 0; i < $scope.statfields.length; i++)
                        $scope.stats[$scope.statfields[i].name] = 0;
                    
                    $http.get('/api/tournament/' + $scope.team.tournament._id).then(function (response) {
                        $scope.tournament = response.data.content.tournament;
                        $scope.statfields = $scope.tournament.statfields;
                        $scope.stats = {};
                        for (var i = 0; i < $scope.statfields.length; i++)
                            $scope.stats[$scope.statfields[i].name] = 0;

                        $http.get('/api/match?team=' + $routeParams.id).then(function (response) {
                            var data = response.data;
                            $scope.matches = data.content.matches;
                            filterMatches();
                        });
                    });
                }).catch(function(response) {
                  $scope.error = response.data.err;
                });
            } else {
                $window.location.href = "/#/login";
            }
        });

        $scope.joinTeam = function() {
          $http.put('/api/team/' + $routeParams.id + '?action=add', {user_id: $scope.user._id})
          .success(function(data) {
            $http.get('/api/team/'+$routeParams.id)
            // Reload page
            .then(function(response) {
                $scope.team = response.data.content.team;
                $scope.isAMember = $scope.team.members.reduce(function(prev, current) {
                    return prev || ($scope.user && current.username == $scope.user.username);
                }, false);
            });
          }).error(function(response) {
            $scope.error = response.err;
          })
        }

        $scope.deleteMember = function(user_id) {
            $http.put('/api/team/' + $routeParams.id + '?action=delete', {user_id: user_id})
            .success(function(response) {
                $http.get('api/team/'+$routeParams.id)
                // Reload page
                .then(function(resp) {
                    $scope.team = resp.data.content.team;
                    $scope.isAMember = $scope.team.members.reduce(function(prev, current) {
                      return prev || current.username == $scope.user.username;
                    }, false);
                });
            }).error(function(response){
                $scope.error = response.err;
            });
                    
        }  

        $scope.deleteTeam = function() {
            //var tournament = $scope.tournament
            $http.delete('api/team/' + $routeParams.id)
            .success(function(data) {
                // If creation was successful, redirect to page of new tournament
                $window.location.href = "/#/tourney/"+$scope.tournament._id;
            }).error(function(response) {
                console.log(response);
                $scope.error = response.err;
            })
        }

        /* 
            Filter the matches of the user into matches that have already been played 
            and matches that have yet to be played.
            Also aggregates the matches that have been won and lost from the already-played matches
        */
        var filterMatches = function() {
            if ($scope.matches) {
                $scope.playedMatches = [];
                $scope.upcomingMatches = [];
                for (var i = 0; i < $scope.matches.length; i++) {
                    if ($scope.matches[i].outcome.winner) {
                        $scope.playedMatches.push($scope.matches[i]);
                        $http.get("/api/match/" + $scope.matches[i]._id).then(function (response) {
                            var data = response.data;
                            if (data.success) {
                                $scope.match = data.content.match;
                                // Aggregate match wins and losses of team
                                if ($scope.match.participants.length === 1) {
                                    $scope.wins += 1;
                                } else if ($scope.match.outcome.winner == $routeParams.id) {
                                    $scope.wins += 1;
                                    for (var index in $scope.match.outcome.metadata) {
                                      if ($scope.match.outcome.metadata[index].value.winner !== undefined) {
                                        // Field has winner data
                                        $scope.stats[$scope.match.outcome.metadata[index].name] += $scope.match.outcome.metadata[index].value.winner;
                                      } else {
                                        // Field has match data
                                        $scope.stats[$scope.match.outcome.metadata[index].name] += $scope.match.outcome.metadata[index].value.match;
                                      }

                                    }
                                } else {
                                    $scope.losses += 1;
                                    for (var index in $scope.match.outcome.metadata) {
                                      if ($scope.match.outcome.metadata[index].value.loser !== undefined) {
                                        // Field has winner data
                                        $scope.stats[$scope.match.outcome.metadata[index].name] += $scope.match.outcome.metadata[index].value.loser;
                                      } else {
                                        // Field has match data
                                        $scope.stats[$scope.match.outcome.metadata[index].name] += $scope.match.outcome.metadata[index].value.match;
                                      }
                                    }
                                }
                            }
                        });
                    } else {
                        $scope.upcomingMatches.push($scope.matches[i]);
                    }
                }
            }
        }

        $scope.logout = function() {
            $http.get("/logout").then(function (resp) {
                $window.location.href = "/#/login";
            });
        };

        activate();

        function activate() { }
    }
})();
