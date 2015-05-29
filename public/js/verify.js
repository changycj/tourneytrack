$(document).ready(function() {
    // query string: ?code=asdfasdfasdf
    var code = window.location.search.split("?code=")[1];

    $.ajax({
        url: "/api/user/verify",
        method: "PUT",
        data: {code: code},
        success: function(data) {
            alert("Account verified! Please login.");
            window.location = "/";
        },
        error: function(err) {
            alert("Verification unsuccessful");
            window.location = "/";
        }
    });
});