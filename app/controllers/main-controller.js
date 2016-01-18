mainApp.controller('MainController', [
    '$scope', '$http', 'Base64',
    'RepoAnalyzer',
    'GithubService',
    'TravisService',
    'CodecovService',

    function ($scope, $http, Base64,
              RepoAnalyzer,
              GithubService, TravisService, CodecovService) {
        function parseGithubUrl(url) {
            // todo replace with url format validation
            if (!url || url.length == 0) return null;

            $scope.parser.href = url;
            var parsed = $scope.parser.pathname.split('/');
            return (parsed.length >= 3) ? {owner: parsed[1], repo: parsed[2]} : null;
        }

        function getRepo(repo) {
            GithubService.repo(repo.owner, repo.repo, $scope.github.token).$promise.then(
                function success(response) {
                    repo.stars = response['stargazers_count'];
                    repo.commit = response['pushed_at'];
                    repo.branch = response['default_branch'];
                },
                function error() {
                    repo.stars = undefined;
                }
            );
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
            GithubService.createTravisFile($scope.user.login, repo.repo, $scope.github.token).$promise.then(
                function success() {
                    repo.travis = true;
                    log('.travis.yml file for ' + $scope.user.login + '/' + repo.repo + ' created successfully');
                },
                function error() {
                    GithubService.updateTravisFile($scope.user.login, repo.repo, $scope.github.token).then(
                        function() {
                            repo.travis = true;
                            log('.travis.yml file for ' + $scope.user.login + '/' + repo.repo + ' updated successfully');
                        },
                        function() {
                            repo.travis = false;
                            log('Failed to create .travis.yml file for ' + $scope.user.login + '/' + repo.repo);
                        }
                    );
                }
            );
        }

        function setupRepoBuildFile(repo) {
            GithubService.repoTree($scope.user.login, repo.repo, repo.branch, $scope.github.token).then(
                function (response) {
                    if (response) {
                        repo.type =
                            RepoAnalyzer.analyze($scope.user.login, repo.repo, response.data.tree, $scope.github.token);

                        if (repo.type) {
                            repo.buildFile = true;
                            log(repo.repo + ' build file updated successfully');

                            return;
                        }
                    }

                    repo.buildFile = false;
                    log(repo.repo + ' structure analysis failed');
                }
            );
        }

        function repoCoverage(repo) {
            CodecovService.repos($scope.user.login, repo.repo, $scope.codecov.token).then(
                function success(response) {

                    if (response.data.report != null) {
                        repo.lines = response.data.report.totals.lines;
                        repo.covered = response.data.report.totals.lines - response.data.report.totals.missed;
                        repo.coverage = response.data.coverage;

                        log($scope.user.login + '/' + repo.repo + ' coverage estimated successfully');
                    }
                    else {
                        repo.lines = undefined;
                        repo.covered = undefined;
                        repo.coverage = undefined;

                        log($scope.user.login + '/' + repo.repo + ' coverage estimation still not ready');
                    }
                },
                function error() {
                    repo.lines = undefined;
                    repo.covered = undefined;
                    repo.coverage = undefined;

                    log($scope.user.login + '/' + repo.repo + ' coverage estimation failed');
                }
            );
        }

        function deleteRepo(repo) {
            GithubService.delete($scope.user.login, repo.repo, $scope.github.token).$promise.then(
                function success(response) {
                    repo.type = undefined;
                    repo.branch = undefined;
                    repo.stars = undefined;
                    repo.forked = undefined;
                    repo.travis = undefined;
                    repo.buildFile = undefined;
                    repo.status = undefined;
                    repo.lines = undefined;
                    repo.covered = undefined;
                    repo.coverage = undefined;

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
            $scope.user.login = window.localStorage.user;
            $scope.repositories = window.localStorage.repositories;
            $scope.repos = angular.fromJson(window.localStorage.repos);
            $scope.github = angular.fromJson(window.localStorage.github);
            $scope.travis = angular.fromJson(window.localStorage.travis);
            $scope.codecov = angular.fromJson(window.localStorage.codecov);
        };

        $scope.save = function() {
            window.localStorage.user = $scope.user.login;
            window.localStorage.repositories = $scope.repositories;
            window.localStorage.repos = angular.toJson($scope.repos);
            window.localStorage.github = angular.toJson($scope.github);
            window.localStorage.travis = angular.toJson($scope.travis);
            window.localStorage.codecov = angular.toJson($scope.codecov);
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
                    getRepo(repo);
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

        $scope.travisSync = function() {
            TravisService.token($scope.github.token);
        };

        $scope.checkCoverage = function() {
            for (var i in $scope.repos) {
                repoCoverage($scope.repos[i]);
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
        $scope.codecov = {token: ''};

        $scope.repos = {};
        $scope.repositories = '';
        $scope.logs = '';

        $scope.parser = document.createElement('a');

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