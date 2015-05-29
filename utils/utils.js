var utils = {};
var validator = require('validator');

// https://github.com/kongming92/6170-p3demo/blob/master/utils/utils.js
/*
  Send a 200 OK with success:true in the request body to the
  response argument provided.
  The caller of this function should return after calling
*/
utils.sendSuccessResponse = function(res, content) {
  res.status(200).json({
    success: true,
    content: content
  }).end();
};

/*
  Send an error code with success:false and error message
  as provided in the arguments to the response argument provided.
  The caller of this function should return after calling
*/
utils.sendErrResponse = function(res, errcode, err) {
  res.status(errcode).json({
    success: false,
    err: err
  }).end();
};

// Helper functions
utils.fromStringToHex = function(str) {
    var hex = "";
    for (var i = 0; i < str.length; i++) {
        hex += str.charCodeAt(i).toString(16);
    }
    return hex;
}

utils.fromHexToString = function(hex) {
    var str = "";
    for (var i = 0; i < hex.length; i += 2) {
        str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    }
    return str;
}


utils.restrict = function(req, res, next) {
    if (req.user) {
        next();
    } else {
        utils.sendErrResponse(res, 401, 'Access denied!');
    }
}

utils.validateMongoIdArray = function(array) {
  return (array && array.constructor === Array) ?
    array.filter(function(element) { console.log(validator.isMongoId(element));
    return validator.isMongoId(element); }) :
    undefined;
};

module.exports = utils;
