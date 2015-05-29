//Author: Katharine Xiao
(function () {
    'use strict';

    angular
        .module('myApp')
        .controller('tourneyListController', tourneyListController);

    tourneyListController.$inject = ['$scope', '$routeParams', '$http', '$cookies', '$window'];

    function tourneyListController($scope, $routeParams, $http, $cookies, $window) {
        $scope.title = 'tourneyListController';
        $scope.showModal = false;
        $scope.statfields = [];

        // Get all tournaments
        $http.get("/api/tournament").then( function (response) {
                var data = response.data;
                $scope.tournaments = data.content.tournaments;
            }
        );
        // Get current user, determine if is logged in
        $http.get("/current_auth").then(function(response) {
            var data = response.data;
            if (data.success && data.content.user) {
                $scope.user = data.content.user;
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
            // Initialize the stat fields with Score
            var statfields = statList.slice(0);
            statfields.push({ name: 'Score', teamSpecific: true });
            // POST to API
            $http.post('/api/tournament', { tournament_name: tournamentName, statfields: statfields })
            .success(function (data) {
                if (data.success) {
                    $http.put('/api/tournament/' + data.content.tournament._id, { description: description })
                    .then(function (response) {

                    });
                    // If creation was successful, redirect to page of new tournament
                    $window.location.href = "/#/tourney/" + data.content.tournament._id;
                }
            }).error(function (err) {
                $scope.message = "Error: Missing tournament name or type";
            });
        };
        $scope.removeField = function (itemIndex) {
            $scope.statfields.splice(itemIndex, 1);
        }

        $scope.addField = function () {
            $scope.statfields.push($scope.newField);
            $scope.newField = {};
        }

        activate();

        function activate() { }
    }
})();
