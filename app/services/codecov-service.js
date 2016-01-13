'use strict';

var CODECOV = 'https://codecov.io/api/github';

// github api auth check
mainApp.service('CodecovService', ['$http', function ($http) {
    this.repos =  function(owner, repo, token) {
        return  $http.get(CODECOV + '/' + owner + '/' + repo + '?access_token=' + token + '&date=' + new Date().getMilliseconds());
    };
}]);
