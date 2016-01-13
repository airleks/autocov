'use strict';

// describe Travis API
var TRAVIS = 'https://api.travis-ci.org';

mainApp.factory('TravisAuth', ['$resource', function($resource) {
    return function() {
        return $resource(TRAVIS + '/auth/github', {}, {
            post: {method: 'POST', cache: false, isArray: false,
                headers: {
                    'User-Agent': 'DevFactoryClient',
                    //'Travis-API-Version' : 2,
                    'Content-Type': 'application/vnd.travis-ci.3+json',
                    'Accept': 'application/json'
                }
            }
        })
    }
}]);

// alternative way
//$http.defaults.headers.post.Accept = 'application/vnd.travis-ci.2+json';
//$http.post('https://api.travis-ci.org/auth/github', {"github_token":$scope.github.token});

//mainApp.factory('TravisAuth', ['$resource', function($resource) {
//    return function() {
//        return $resource(TRAVIS + '/auth/github', {}, {
//            post: {method: 'POST', cache: false, isArray: false,
//                headers: {'User-Agent': 'DevFactoryClient', 'Accept' : 'application/vnd.travis-ci.2+json'}}
//        })
//    }
//}]);

// Always set the User-Agent header. This header is not required right now, but will be in the near future.
// Assuming your client is called “My Client”, and it’s current version is 1.0.0, a good value would be MyClient/1.0.0.
//    Always set the Accept header to application/vnd.travis-ci.2+json.

//mainApp.factory('TravisAuth', ['$resource', function($resource) {
//    return $resource("https://api.travis-ci.org", {"github_token":"83e57469702bc906baf9d987672e5e64a57440f0"}, {
//        post: {method: 'GET', cache: false, isArray: false}
//    })
//}]);
// https://docs.travis-ci.com/api#with-a-github-token

// get repos

// sync account

// create a hook

// launch job

// check job