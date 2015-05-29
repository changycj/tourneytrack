//Author: Jamar Brooks
(function () {
    'use strict';

    angular
        .module('myApp')
        .controller('newTeamController', newTeamController);

    newTeamController.$inject = ['$scope', '$http', '$cookies', '$window'];

    function newTeamController($scope, $http, $cookies, $window) {
        $scope.title = 'newTeamController';
        $scope.members = [];
        $scope.showModal = false;
        $scope.types = ['Single Elimination', 'Round Robin'];

        $scope.displayNewTourneyModal = function () {
            $scope.showModal = !$scope.showModal;
            console.log($scope.showModal);
        }

        $scope.removeUser = function (member) {
            var index = $scope.members.indexOf(member);
            $scope.members.splice(index, index+1);
        }

        // Check that all selected members are valid kerberos usernames
        $scope.addUser = function (member) {
            $http.get('/user/' + member).success(function (data) {
                $scope.members.push(member);
            }).error(function (err) {
                $scope.message = 'User does not exist.';
            });
            $scope.newMember = "";
            console.log($scope.members);
        }

        $scope.addTeam = function(teamName, members)
        {
            // Create a team
            $http.post('/api/team', { team_name: teamName, tournament: $routeParams.id }).then(function (response) {
                var data = response.data;
                if (response.statusCode === 200)
                    // Add all selected users to the team
                    for (var i = 0; i < members; i++)
                        $http.get('/api/user/' + members[i]).then(function (response) {
                            var data = response.data;
                            if(response.statusCode === 200)
                            {
                                $http.put('api/team', {user: data.user._id}).then(function (response) {

                                });
                            }
                        });
                else if (response.statusCode === 400)
                    $scope.message = "Bad Request";
                else
                    $scope.message = "Server Error";
            });
            
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
