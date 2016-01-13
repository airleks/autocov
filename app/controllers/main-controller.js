mainApp.controller('MainController', [
    '$scope', '$http', 'Base64',
    'RepoAnalyzer',
    'GithubService',
    'TravisAuth',

    function ($scope, $http, Base64,
              RepoAnalyzer,
              GithubService, TravisAuth) {
        function parseGithubUrl(url) {
            // todo replace with url format validation
            if (!url || url.length == 0) return null;

            $scope.parser.href = url;
            var parsed = $scope.parser.pathname.split('/');
            return (parsed.length >= 3) ? {owner: parsed[1], repo: parsed[2]} : null;
        }

        function forkRepo(repo) {
            GithubService.fork(repo.owner, repo.repo, $scope.github.token).$promise.then(
                function success() {
                    repo.forked = true;
                    log(repo.owner + '/' + repo.repo + ' forked successfully');
                },
                function error() {
                    repo.forked = false;
                    log(repo.owner + '/' + repo.repo + ' fork failed');
                }
            );
        }

        function createTravisFileInRepo(repo) {
            GithubService.travisFile($scope.user.login, repo.repo, $scope.github.token).$promise.then(
                function success() {
                    log('.travis.yml file for ' + $scope.user.login + '/' + repo.repo + ' created successfully');
                },
                function error() {
                    log('Failed to create .travis.yml file for ' + $scope.user.login + '/' + repo.repo);
                }
            );
        }

        function setupRepoBuildFile(repo) {
            GithubService.repoTree($scope.user.login, repo.repo).then(
                function (response) {
                    if (response) {
                        RepoAnalyzer.analyze($scope.user.login, repo.repo, response.data.tree, $scope.github.token);
                    }
                    else
                        log(i + ' structure analysis failed');
                }
            );
        }

        function deleteRepo(repo) {
            GithubService.delete($scope.user.login, repo.repo, $scope.github.token).$promise.then(
                function success(response) {
                    log($scope.user.login + '/' + repo.repo + ' deleted successfully');
                },
                function error(response) {
                    log($scope.user.login + '/' + repo.repo + ' delete failed');
                }
            );
        }

        log = function(line) {
            $scope.logs += line + '\n';
        };

        $scope.load = function() {
            $scope.user.login = sessionStorage.user;
            $scope.repositories = sessionStorage.repositories;
            $scope.repos = angular.fromJson(sessionStorage.repos);
            $scope.github = angular.fromJson(sessionStorage.github);
            $scope.travis = angular.fromJson(sessionStorage.travis);

            //$scope.$apply();

        };

        $scope.save = function() {
            sessionStorage.user = $scope.user.login;
            sessionStorage.repositories = $scope.repositories;
            sessionStorage.repos = angular.toJson($scope.repos);
            sessionStorage.github = angular.toJson($scope.github);
            sessionStorage.travis = angular.toJson($scope.travis);
        };

        $scope.generateToken = function() {
            GithubService.createToken($scope.user.login, $scope.user.password).$promise.then(
                function (response) {
                    $scope.github.token = response['token'];
                    log('Github token created successfully: ' + $scope.github.token);
                },
                function() {
                    log('Github token creation failed');
                }
            );
        };

        $scope.prepare = function () {
            $scope.repos = {};

            var reposArr = $scope.repositories.split('\n');

            // convert to repos data
            for (var i in reposArr) {
                var repo = parseGithubUrl(reposArr[i]);

                if (repo == null) {
                    log('Failed to parse url: ' + reposArr[i]);
                }
                else {
                    log('Parsed to ' + JSON.stringify(repo));
                    $scope.repos[reposArr[i]] = repo;
                }
            }
        };

        $scope.authGithub = function() {
            GithubService.auth($scope.github.token).$promise.then(
                function() {
                    log('Github authentication passed successfully');
                },
                function() {
                    log('Github authentication failed');
                }
            );
        };

        $scope.fork = function () {
            for (var i in $scope.repos) {
                forkRepo($scope.repos[i]);
            }
        };

        $scope.createTravisFile = function () {
            for (var i in $scope.repos) {
                createTravisFileInRepo($scope.repos[i]);
            }
        };

        $scope.setupBuildFiles = function () {
            for (var i in $scope.repos) {
                setupRepoBuildFile($scope.repos[i]);
            }
        };

        $scope.deleteRepos = function () {
            for (var i in $scope.repos) {
                deleteRepo($scope.repos[i]);
            }
        };

        // data preset
        $scope.user = {login: '', password: ''};
        $scope.github = {token: ''};
        $scope.travis = {token: ''};

        $scope.repos = {};
        $scope.repositories = '';
        $scope.logs = '';

        $scope.parser = document.createElement('a');

        $scope.authGithub();
        //TravisAuth().post({'github_token': $scope.github.token}).$promise.then(
        //    function success(response) {
        //        log("Travis authenticated successfully")
        //    },
        //    function fail(response) {
        //        log("Travis authentication failed")
        //    }
        //);
    }
]);