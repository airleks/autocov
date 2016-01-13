'use strict';

var GITHUB = 'https://api.github.com';

// describe Github API
mainApp.factory('GithubAuth', ['$resource', function ($resource) {
    return function (token) {
        return $resource(GITHUB, {}, {
            get: {method: 'GET', cache: false, isArray: false, headers: {'Authorization': 'token ' + token}}
        })
    }
}]);

// fork repo https://developer.github.com/v3/repos/forks/#create-a-fork
mainApp.factory('GithubFork', ['$resource', function ($resource) {
    return function (token) {
        return $resource(GITHUB + '/repos/:owner/:repo/forks', {owner: '@owner', repo: '@repo'},
            {
                post: {method: 'POST', cache: false, isArray: false, headers: {'Authorization': 'token ' + token}}
            })
    }
}]);

// delete repo
mainApp.factory('GithubDelete', ['$resource', function ($resource) {
    return function (token) {
        return $resource(GITHUB + '/repos/:owner/:repo', {owner: '@owner', repo: '@repo'},
            {delete: {method: 'DELETE', cache: false, isArray: false, headers: {'Authorization': 'token ' + token}}});
    }
}]);

// create file https://developer.github.com/v3/repos/contents/#create-a-file
mainApp.factory('GithubCreateFile', ['$resource', function ($resource) {
    return function (token) {
        return $resource(GITHUB + '/repos/:owner/:repo/contents/:path', {owner: '@owner', repo: '@repo', path: '@path'},
            {put: {method: 'PUT', cache: false, isArray: false, headers: {'Authorization': 'token ' + token}}});
    }
}]);


mainApp.factory('GithubHooks', ['$resource', function ($resource) {
    return function (token) {
        return $resource(GITHUB + '/repos/:owner/:repo/hooks', {owner: '@owner', repo: '@repo'},
            {get: {method: 'GET', cache: false, isArray: false, headers: {'Authorization': 'token ' + token}}});
    }
}]);

mainApp.factory('GithubToken', ['$resource', 'Base64', function ($resource, Base64) {
    return function (login, password) {
        return $resource(GITHUB + '/authorizations', {},
            {
                post: {
                    method: 'POST',
                    cache: false,
                    isArray: false,
                    headers: {'Authorization': 'Basic ' + Base64.encode(login + ':' + password)}
                }
            });
    }
}]);

// get repository structure https://developer.github.com/v3/git/trees/
mainApp.factory('GithubUpdateFile', ['$resource', function ($resource) {
    return function (token) {
        return $resource(GITHUB + '/repos/:owner/:repo/contents/:path', {
                owner: '@owner',
                repo: '@repo',
                path: '@path'
            },
            {put: {method: 'PUT', cache: false, isArray: false, headers: {'Authorization': 'token ' + token}}});
    }
}]);

// get file content https://developer.github.com/v3/repos/contents/#get-contents


mainApp.service('GithubService', ['$http', 'Base64',
    'GithubAuth', 'GithubFork', 'GithubHooks', 'GithubCreateFile', 'GithubDelete', 'GithubToken',
    'GithubUpdateFile',
    function ($http, Base64,
              GithubAuth, GithubFork, GithubHooks, GithubCreateFile, GithubDelete, GithubToken,
              GithubUpdateFile) {


        function commitInfo(owner, repo) {
            return $http.get('https://api.github.com/repos/' + owner + '/' + repo +
                '/git/refs').then(
                function success(response) {
                    return response.data[0]['object'].sha;
                },
                function error(response) {
                    // todo AutocovService.log('Failed to get ' + owner + '/' + repo + ' commit info');
                }
            );
        }

        function tree(owner, repo, sha) {
            return $http.get('https://api.github.com/repos/' + owner + '/' + repo +
                '/git/trees/' + sha + '?recursive=1').then(
                function success(response) {
                    // todo AutocovService.log(owner + '/' + repo + ' structure info retrieved');
                    return response;
                },
                function error(response) {
                    // todo AutocovService.log('Failed to get ' + owner + '/' + repo + ' structure info');
                }
            );
        }

        this.auth = function (token) {
            return GithubAuth(token).get();
        };

        this.createToken = function (login, password) {
            return GithubToken(login, password).post({
                    note: 'Autocov Generated at ' + new Date(),
                    scopes: ["repo", "delete_repo", "read:org", "user:email", "repo_deployment", "repo:status", "write:repo_hook"]
                }
            );
        };

        this.fork = function (owner, repo, token) {
            return GithubFork(token).post({owner: owner, repo: repo});
        };

        this.delete = function (owner, repo, token) {
            return GithubDelete(token).delete({owner: owner, repo: repo});
        };

        this.repoTree = function (owner, repo) {
            return commitInfo(owner, repo)
                .then(function (sha) {
                    if (sha) return tree(owner, repo, sha)
                });
        };

        this.getFile = function (owner, repo, path) {
            return $http.get('https://api.github.com/repos/' + owner + '/' + repo +
                '/contents/' + path);
        };

        // todo verify
        this.updateFile = function (owner, repo, path, content, sha, token) {
            return GithubUpdateFile(token).put({owner: owner, repo: repo, path: path},
                {message: "Autocov build file update", content: Base64.encode(content), sha: sha},
                function success(response) {
                    // todo AutocovService.log(owner + '/' + repo + '/' + '/' + path + ' updated successfully');
                },
                function error(response) {
                    // todo AutocovService.log(owner + '/' + repo + '/' + '/' + path + ' update failed');
                }
            );
        };

        this.travisFile = function (owner, repo, token) {
            var content = Base64.encode(
                "language: java\n" +
                "sudo: false\n" +
                "before_install:\n" +
                "  - pip install --user codecov\n" +
                "after_success:\n" +
                "   - codecov");

            return GithubCreateFile(token).put({owner: owner, repo: repo, path: '.travis.yml'},
                {message: '.travis.yml created', content: content}
            );
        }
    }]);
