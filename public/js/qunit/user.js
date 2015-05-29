// Author: Yachi Chang
// testing Users API
// 1. POST login user
// 2. GET specific user info

$(document).ready(function() {

    // precondition: login user "changycj" then run this script
    // create dummy user

    QUnit.config.reorder = false;

    test("testing user registration and creating 4 dummy users", function() {

        // changycj
        var userData1 = createUser("changycj", "changycj");
        var user1 = userData1.content.user;
        equal(user1.username, "changycj", "Username is as expected. (changycj)");
        equal(user1.verified, false, "User is currently unverified as expected.");

        // kjx
        var userData2 = createUser("kjx", "kjx");
        var user2 = userData2.content.user;
        equal(user2.username, "kjx", "Username is as expected. (kjx)");
        equal(user2.verified, false, "User is currently unverified as expected.");

        // crogers3
        var userData3 = createUser("crogers3", "crogers3");
        var user3 = userData3.content.user;
        equal(user3.username, "crogers3", "Username is as expected. (crogers3)");
        equal(user3.verified, false, "User is currently unverified as expected.");

        // j388923r        
        var userData4 = createUser("j388923r", "j388923r");
        var user4 = userData4.content.user;
        equal(user4.username, "j388923r", "Username is as expected. (j388923r)");
        equal(user4.verified, false, "User is currently unverified as expected.");
    });

    test("testing user verification", function() {

        // changycj
        var verifyData1 = verifyUser("changycj");
        var verifiedUser1 = verifyData1.content.user;
        equal(verifiedUser1.username, "changycj", "Correct username verified. (changycj)");
        equal(verifiedUser1.verified, true, "Correct user verified.");

        // kjx
        var verifyData2 = verifyUser("kjx");
        var verifiedUser2 = verifyData2.content.user;
        equal(verifiedUser2.username, "kjx", "Correct username verified. (kjx)");
        equal(verifiedUser2.verified, true, "Correct user verified.");

        // crogers3
        var verifyData3 = verifyUser("crogers3");
        var verifiedUser3 = verifyData3.content.user;
        equal(verifiedUser3.username, "crogers3", "Correct username verified. (crogers3)");
        equal(verifiedUser3.verified, true, "Correct user verified.");

        // j388923r
        var verifyData4 = verifyUser("j388923r");
        var verifiedUser4 = verifyData4.content.user;
        equal(verifiedUser4.username, "j388923r", "Correct username verified. (j388923r)");
        equal(verifiedUser4.verified, true, "Correct user verified.");
    });

    test("getting specific user data", function() {
        var getData = getUser("changycj");
        var user = getData.content.user;
        equal(user.username, "changycj", "Correct username retrieved.");
        equal(user.verified, true, "Correct verification retrieved.");
    });

    test("logging in", function() {
        var loginData = loginUser("kjx", "kjx");
        var loginUserData = loginData.content.user;
        equal(loginUserData.username, "kjx", "Correct username logged in (kjx).");
        equal(loginUserData.verified, true, "Correct verification retrieved (kjx).");
    });

    test("logging out", function() {
        var logoutData = logout();
        equal(logoutData.success, true, "Succesfully logged out.");
    });

    function getUser(username) {
        var out;
        $.ajax({
            url: '/api/user/'+username,
            method: "GET",
            async: false,
            success: function(data) {
                out = data;
            },
            error: function(data) {
                out = data;
            }
        });
        return out;
    }

    function createUser(un, pw) {
        var out;
        $.ajax({
            url: "/api/user",
            method: "POST",
            data: {username: un, password: pw},
            async: false,
            success: function(data) {
                out = data;
            }, 
            error: function(data) {
                out = data;
            }
        });
        return out;
    }


    function verifyUser(username) {
        var out;
        var code = fromStringToHex(username);
        $.ajax({
            url: "/api/user/verify",
            method: "PUT",
            data: {code: code},
            async: false,
            success: function(data) {
                out = data;
            },
            error: function(data) {
                out = data;
            }
        });
        return out;
    }

    function fromStringToHex(str) {
        var hex = "";
        for (var i = 0; i < str.length; i++) {
            hex += str.charCodeAt(i).toString(16);
        }
        return hex;
    }

    function loginUser(un, pw) {
        var out;
        $.ajax({
            url: "/login",
            method: "POST",
            data: {username: un, password: pw},
            async: false,
            success: function(data) {
                out = data;
            },
            error: function(data) {
                out = data;
            }
        });
        return out;
    }

    function logout() {
        var out;
        $.ajax({
            url: "/logout",
            method: "GET",
            data: {},
            async: false,
            success: function(data) {
                out = data;
            },
            error: function(data) {
                out = data;
            }
        });
        return out;
    }

});