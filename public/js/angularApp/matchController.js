//Author: Jamar Brooks, Judy Chang, Chris Rogers, and Katharine Xiao
(function () {
    'use strict';

    angular
        .module('myApp')
        .controller('matchController', matchController);

    matchController.$inject = ['$scope', '$http', '$routeParams', '$cookies', '$window'];

    function matchController($scope, $http, $routeParams, $cookies, $window) {
        $scope.title = 'Match Page';
        $scope.metadata = {};
        $scope.played=false;

        $scope.loadPage = function() {
                $http.get("/api/match/" + $routeParams.id).then(function(response) {
                var data = response.data;
                if (data.success) {
                    $scope.match = data.content.match;

                    // If the match has a winner, get the object representation of the winning team 
                    if ($scope.match.outcome.winner) {
                        if ($scope.match.participants.length === 1) {
                            $scope.winner = $scope.match.participants[0];
                        } else if ($scope.match.outcome.winner == $scope.match.participants[0]._id) {
                            $scope.winner = $scope.match.participants[0];
                            $scope.loser = $scope.match.participants[1];
                        } else {
                            $scope.winner = $scope.match.participants[1];
                            $scope.loser = $scope.match.participants[0];
                        }
                        // The match has been played if there is a winner
                        $scope.played = true;
                    }

                    $scope.toggleModal = function () {
                        $scope.showModal = !$scope.showModal;
                        $scope.outcomeError = '';
                    }

                    $scope.toggleApproveModal = function() {
                        $scope.showApproveModal = !$scope.showApproveModal;
                        $scope.finalOutcomeError = '';
                    }

                    // Get tournament of that the match is in
                    $http.get('/api/bracket/'+$scope.match.bracket).then(function(response) {
                        var bracketData = response.data;
                        if (data.success) {
                            $scope.tournament = bracketData.content.bracket.tournament;
                        }
                    });

                    // Compare reported outcomes, and auto-populate the fields that are in agreement
                    if($scope.match.preliminaryOutcomes[0] && $scope.match.preliminaryOutcomes[1] && $scope.match.preliminaryOutcomes[0].winner === $scope.match.preliminaryOutcomes[1].winner)
                    {
                        $scope.outcome_winner = $scope.match.preliminaryOutcomes[0].winner === $scope.match.participants[0]._id ? $scope.match.participants[0] : $scope.match.participants[1];
                        var metadata1 = $scope.match.preliminaryOutcomes[0].metadata;
                        var metadata2 = $scope.match.preliminaryOutcomes[1].metadata;
                        metadata1.forEach(function(a) { 
                            var found=false; 
                            metadata2.forEach(function(b) 
                                { 
                                    // Determine whether it is team-specific or not
                                    if (b.value.winner) {
                                        if (b.name === a.name && b.value.winner === a.value.winner && b.value.loser === a.value.loser) found=true;
                                    } else {
                                        if (b.name === a.name && b.value.match === a.value.match) found = true;
                                    }
                                });
                            // If the two different reports match for this given field, record it
                            if (found) {
                                $scope.metadata[a.name] = a.value
                            }
                        });
                    }
                } else {
                    $scope.error = "Match does not exist";
                }
            }).catch(function(response) {
              $scope.error = response.data.err;
            });
        }
        $scope.loadPage();

        // Determine if there is a user currently logged in, and if so, who
        $http.get("/current_auth").then(function(response) {
            var data = response.data;
            if (data.success) {
                $scope.user = data.content.user;
            } else {
                $window.location.href = "/#/login";
            }
        });

        /*
            Reports preliminary results entered by the team captains,
            called when the "Report Outcome" form is submitted
        */
        $scope.reportMatchOutcome = function() {
            var filled = true;
            $scope.tournament.statfields.forEach(function(field){ if (!field.value) filled = false; console.log(field.value);})
            if ($scope.outcome_winner && filled) {
            var winnerIndex = $scope.outcome_winner._id == $scope.match.participants[0]._id ? 0 : 1;
            // Format the inputted metadata
            var metadata = $scope.tournament.statfields.map(function(field) {
              return {name: field.name, value: field.value};
            });
            var data = {
                winner: $scope.match.participants[winnerIndex]._id,
                loser: $scope.match.participants[winnerIndex == 0 ? 1 : 0]._id,
                metadata: metadata,
                preliminary: true
            };
            // Report preliminary outcome to API
            $http.put("/api/match/" + $scope.match._id + "/outcome", data).then(function(response) {
                var data = response.data;
                if (!data.success) {
                    $scope.outcomeError = "Could not report outcome.";
                } else {
                    $scope.loadPage();
                }
                // close modal
                $scope.showModal = false;
            });
            } else {
                $scope.outcomeError = 'Must fill in all fields with valid input.'
            }
        }

        /*
            Admin approval of final outcome,
            called when the "Approve Outcome" form is submitted
        */
        $scope.approveMatchOutcome = function() {
            if ($scope.outcome_winner) {
                // Determine which team is selected as winner in the form
                var winnerIndex = $scope.outcome_winner && $scope.outcome_winner._id == $scope.match.participants[0]._id ? 0 : 1;
                // Format approved metadata
                var metadata = $scope.tournament.statfields.map(function(field) {
                  return {name: field.name, value: $scope.metadata[field.name]};
                });
                var data = {
                    winner: $scope.match.participants[winnerIndex]._id,
                    loser: $scope.match.participants[winnerIndex == 0 ? 1 : 0]._id,
                    metadata: metadata,
                    preliminary: false
                };

                // Submit outcome to API
                $http.put("/api/match/" + $scope.match._id + "/outcome", data).success(function(data) {
                    $scope.winner = $scope.match.participants[winnerIndex];
                    $scope.loser = $scope.match.participants[winnerIndex == 0 ? 1 : 0];
                    $scope.match.outcome = data.content.match.outcome;
                    $scope.played = true;

                    $http.put("/api/bracket/" + $scope.match.bracket).then(function(response) {
                        var data = response.data;
                        if (!data.success) {
                           $scope.error = "could not set bracket winner.";
                        }
                    });
                    $scope.loadPage();
                    // close modal
                    $scope.showApproveModal = false; 
                }).error(function(err) {
                    $scope.finalOutcomeError = "Could not submit outcome.";
                });
                } else {
                    $scope.finalOutcomeError = 'Must select winner.'
                }
        }


        $scope.logout = function() {
            $http.get("/logout").then(function (resp) {
                $window.location.href = "/#/login";
            });
        };
    }
})();
