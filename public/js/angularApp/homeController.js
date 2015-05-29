//Author: Jamar Brooks
(function () {
    'use strict';

    angular
        .module('myApp')
        .controller('homeController', homeController);

    homeController.$inject = ['$scope', '$http', '$cookies', '$window'];

    function homeController($scope, $http, $cookies, $window) {
        $scope.title = 'homeController';

        $window.location.href = "/#/profile";

        activate();

        function activate() { }
    }
})();
