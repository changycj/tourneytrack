(function () {
    'use strict';

    var app = angular.module('myApp', [
        // Angular modules 
        'ngAnimate',
        'ngRoute',
        'ngCookies'

        // Custom modules 

        // 3rd Party Modules

    ]);

    app.config(['$routeProvider',
        function ($routeProvider) {
            $routeProvider.
                when('/tourney/:id', {
                    templateUrl: '/angularviews/tourney.html',
                    controller: 'tourneyController'
                })
                .when('/tourney', {
                    templateUrl: '/angularviews/tourneyList.html',
                    controller: 'tourneyListController'
                })
                .when('/login', {
                    templateUrl: '/angularviews/login.html',
                    controller: 'loginController'
                })
                .when('/profile', {
                    templateUrl: '/angularviews/profile.html',
                    controller: 'profileController'
                })
                .when('/match/:id', {
                    templateUrl: '/angularviews/match.html',
                    controller: 'matchController'
                })
                .when('/team/:id', {
                    templateUrl: '/angularviews/team.html',
                    controller: 'teamController'
                })
                .when('/team', {
                    templateUrl: '/angularviews/newTeam.html',
                    controller: 'newTeamController'
                })
                .otherwise({
                    templateUrl: '/angularviews/home.html',
                    controller: 'homeController'
                })
        }
    ])
})();