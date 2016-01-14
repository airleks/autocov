'use strict';

var GITHUB = 'https://api.github.com';

// github api auth check
mainApp.factory('GithubAuth', ['$resource', function ($resource) {
    return function (token) {
        return $resource(GITHUB, {}, {
            get: {method: 'GET', cache: false, isArray: false, headers: {'Authorization': 'token ' + token}}
        })
    }
}]);

// get repo
mainApp.factory('GithubRepo', ['$resource', function ($resource) {
    return function (token) {
        return $resource(GITHUB + '/repos/:owner/:repo', {owner: '@owner', repo: '@repo'},
            {
                get: {method: 'get', cache: false, isArray: false, headers: {'Authorization': 'token ' + token}}
            })
    }
}]);

// fork repo
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

// create file
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

// get repository structure
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

mainApp.service('GithubService', ['$http', 'Base64',
    'GithubAuth', 'GithubRepo', 'GithubFork', 'GithubHooks', 'GithubCreateFile', 'GithubDelete', 'GithubToken',
    'GithubUpdateFile',
    function ($http, Base64,
              GithubAuth, GithubRepo, GithubFork, GithubHooks, GithubCreateFile, GithubDelete, GithubToken,
              GithubUpdateFile) {


        function commitInfo(owner, repo, branch, token) {
            $http.defaults.headers.common.Authorization = 'token ' + token;
            return $http.get('https://api.github.com/repos/' + owner + '/' + repo +
                '/git/refs').then(
                function success(response) {
                    for (var i in response.data) {
                        if (response.data[i].ref.indexOf('heads/' + branch) > 0) {
                            return response.data[i]['object'].sha;
                        }
                    }

                    return response.data[0]['object'].sha;  // why not?
                },
                function error(response) {
                    // todo AutocovService.log('Failed to get ' + owner + '/' + repo + ' commit info');
                }
            );
        }

        function tree(owner, repo, sha, token) {
            $http.defaults.headers.common.Authorization = 'token ' + token;
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

        this.repo = function (owner, repo, token) {
            return GithubRepo(token).get({owner: owner, repo: repo});
        };

        this.fork = function (owner, repo, token) {
            return GithubFork(token).post({owner: owner, repo: repo});
        };

        this.delete = function (owner, repo, token) {
            return GithubDelete(token).delete({owner: owner, repo: repo});
        };

        this.repoTree = function (owner, repo, branch, token) {
            return commitInfo(owner, repo, branch, token)
                .then(function (sha) {
                    if (sha) return tree(owner, repo, sha, token)
                });
        };

        this.getFile = function (owner, repo, path, token) {
            $http.defaults.headers.common.Authorization = 'token ' + token;
            return $http.get('https://api.github.com/repos/' + owner + '/' + repo +
                '/contents/' + path);
        };

        this.updateFile = function (owner, repo, path, content, sha, token) {
            return GithubUpdateFile(token).put({owner: owner, repo: repo, path: path},
                {message: "Autocov build file update", content: Base64.encode(content), sha: sha}
            );
        };

        this.createTravisFile = function (owner, repo, token) {
            var content = Base64.encode(
                "language: java\n" +
                "sudo: false\n" +
                "before_install:\n" +
                "  - pip install --user codecov\n" +
                "after_success:\n" +
                "   - codecov\n" +
                "jdk:\n" +
                "   - oraclejdk8"
            );

            return GithubCreateFile(token).put({owner: owner, repo: repo, path: '.travis.yml'},
                {message: '.travis.yml created', content: content}
            );
        };

        this.updateTravisFile = function (owner, repo, token) {
            var ghService = this;
            return this.getFile(owner, repo, '.travis.yml', token).then(
                function success(response) {
                    var content = Base64.decode(response.data.content);
                    var config = jsyaml.load(content);

                    if (!config.language) config.language = "java";
                    if (!config.sudo) config.sudo = false;

                    if (!config["before_install"]) config["before_install"] = [];
                    if (config["before_install"].indexOf("pip install --user codecov") == -1) {
                        config["before_install"].push("pip install --user codecov");
                    }

                    if (!config["after_success"]) config["after_success"] = [];
                    if (config["after_success"].indexOf("codecov") == -1) {
                        config["after_success"].push("codecov");
                    }

                    if (!config["jdk"]) config["jdk"] = [];
                    if (config["jdk"].indexOf("oraclejdk8") == -1) {
                        config["jdk"].push("oraclejdk8");
                    }
                    content = jsyaml.dump(config);

                    return {content : content, sha: response.data.sha};
                    //return ghService.updateFile(owner, repo, '.travis.yml', content, response.data.sha, token);
            }).then(
                function(data) {
                    return ghService.updateFile(owner, repo, '.travis.yml', data.content, data.sha, token);
                }
            );
        }
    }]);
