//Authors: Jamar Brooks and Yachi Chang
(function () {
    'use strict';

    angular
        .module('myApp')
        .controller('loginController', loginController);

    loginController.$inject = ['$scope', '$http', '$cookies', '$window'];

    function loginController($scope, $http, $cookies, $window) {
        $scope.title = 'Login';
        $scope.showErrorMessage = false;

        $http.get("/current_auth").then(function(response) {
            var data = response.data;
            if (data.success && data.content.user) {
                $window.location.href = "/#/profile";
            }
        });

        $scope.login = function (kerberos, password) {
            $http.post('/login', { username: kerberos, password: password }).success(function (data) {
                $window.location.href = "/#/profile";
            }).error(function(err) {
                $scope.message = "Login unsuccessful. Try again.";
                $scope.showErrorMessage = true;
            });
        };

        $scope.signup = function (kerberos, password, confpassword) {
            if(confpassword === password) {
                $http.post("/api/user", {username: kerberos, password: password}).success(function(data) {
                    alert("A verification link has been sent to your MIT address.");
                    $scope.kerberossignup = "";
                    $scope.passwordsignup = "";
                    $scope.confirmpassword = "";
                    $window.location.href = "/#/login";
                }).error(function(err) {
                    $scope.message = "Registration unsuccessful. Try again.";
                    $scope.showErrorMessage = true;
                });
            } else {
                $scope.message = "Password and confirmation password do not match. Try again.";
                $scope.showErrorMessage = true;
            };
        };
    }
})();
