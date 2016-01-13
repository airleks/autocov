'use strict';

mainApp.service('RepoAnalyzer', function (Base64, GithubService) {
    var x2js = new X2JS();

    var rules = [
        {
            id: 'maven',
            description: 'Check if this is a maven project',
            collect: function (paths) {
                var collected = [];

                for (var i in paths) {
                    var path = paths[i].path;
                    if (path.slice(path.length - 7) == 'pom.xml') {
                        collected.push(paths[i]);
                        break; // we only need a root pom
                    }
                }

                return collected;
            },
            update: function (owner, repo, file, token) {
                GithubService.getFile(owner, repo, file.path).then(
                    function success(response) {
                        var pom = Base64.decode(response.data.content);
                        var jsonPom = x2js.xml_str2json(pom);

                        if (!jsonPom.project.build) jsonPom.project.build = {};
                        if (!jsonPom.project.build.plugins) jsonPom.project.build.plugins = {};
                        if (!jsonPom.project.build.plugins.plugin) jsonPom.project.build.plugins.plugin = [];

                        var jacocoPluginEntry =
                        {
                            "groupId": "org.jacoco",
                            "artifactId": "jacoco-maven-plugin",
                            "version": "0.7.5.201505241946",
                            "executions": {
                                "execution": [
                                    {
                                        "goals": {
                                            "goal": "prepare-agent"
                                        }
                                    },
                                    {
                                        "id": "report",
                                        "phase": "test",
                                        "goals": {
                                            "goal": "report"
                                        }
                                    }
                                ]
                            }
                        };

                        var pluginUpdated = false;

                        for (var i in jsonPom.project.build.plugins.plugin)
                        {
                            if (jsonPom.project.build.plugins.plugin[i].artifactId == "jacoco-maven-plugin")
                            {
                                jsonPom.project.build.plugins.plugin[i] = jacocoPluginEntry;
                                pluginUpdated = true;
                                break;
                            }
                        }

                        if (!pluginUpdated) jsonPom.project.build.plugins.plugin.push(jacocoPluginEntry);

                        var newPom = x2js.json2xml_str(jsonPom);

                        return GithubService.updateFile(owner, repo, file.path, newPom, response.data.sha, token);
                    },
                    function error(response) {
                        // todo AutocovService.log('Failed to get ' + owner + '/' + repo + '/' + path + ' structure info');
                    }
                );
            }
        },
        {
            id: 'android',
            description: 'Check if this is an android project',
            collect: function (paths) {
                var collected = [];
                var isAndroid = false;

                for (var i in paths) {
                    var path = paths[i].path;
                    if (isAndroid = (path.slice(path.length - 19) == 'AndroidManifest.xml')) {
                        break;
                    }
                }

                if (isAndroid) {
                    for (i in paths) {
                        path = paths[i].path;
                        if (path.slice(path.length - 12) == 'build.gradle') {
                            collected.push(path);
                        }
                    }
                }

                return collected;
            },
            update: function (owner, repo, file, token) {
                // todo
            }
        },
        {
            id: 'gradle',
            description: 'Check if this is a gradle project',
            collect: function (paths) {
                var collected = [];

                for (var i in paths) {
                    var path = paths[i].path;
                    if (path.slice(path.length - 12) == 'build.gradle') {
                        collected.push(path);
                    }
                }

                return collected;
            },
            update: function (owner, repo, file, token) {
                // todo
            }
        },
        {
            id: 'ant',
            description: 'Check if this is an ant project',
            collect: function (paths) {
                var collected = [];

                for (var i in paths) {
                    var path = paths[i].path;
                    if (path.slice(path.length - 9) == 'build.xml') {
                        collected.push(path);
                    }
                }

                return collected;
            },
            update: function (owner, repo, file, token) {
                // todo
            }
        }
    ];

    this.analyze = function (owner, repo, paths, token) {
        var collected = [];

        for (var i in rules) {
            collected = rules[i].collect(paths);

            if (collected.length > 0) {
                for (var j in collected) {
                    rules[i].update(owner, repo, collected[j], token);
                }

                return rules[i].id;
            }
        }
    }
});