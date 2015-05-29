//Author: Jamar Brooks
(function () {
    'use strict';

    angular
        .module('myApp')
        .controller('tourneyController', tourneyController);

    tourneyController.$inject = ['$scope', '$http', '$routeParams', '$cookies', '$window', '$route'];

    function tourneyController($scope, $http, $routeParams, $cookies, $window, $route) {
        $scope.title = 'tourneyController';
        $scope.showAddTeamModal = false;
        $scope.showEditModal = false;

        $scope.toggleAddBracketModal = function() {
            $scope.showAddBracketModal = !$scope.showAddBracketModal;
            $scope.addBracketError = '';
        }
        $scope.toggleAddTeamModal = function() {
            $scope.showAddTeamModal = !$scope.showAddTeamModal;
            $scope.addTeamError = '';
        };
        $scope.toggleEditModal = function() {
            $scope.showEditModal = !$scope.showEditModal;
            $scope.editError = '';
        };

        $scope.editTourney = function(desc) {
            $http.put("/api/tournament/" + $routeParams.id, {description: desc}).then(function(response) {
                var data = response.data;
                if (data.success) {
                    var admin = $scope.tournament.admin;
                    $scope.tournament = data.content.tournament;
                    $scope.tournament.admin = admin;
                    $scope.toggleEditModal();
                } else {
                    $scope.editError = "Could not edit tournament description";
                }
            });
        };

        $scope.deleteTourney = function() {
            $http.delete("/api/tournament/" + $routeParams.id).then(function(response) {
                var data = response.data;
                if (data.success) {
                    $window.location.href = "/#/profile";
                } else {
                    $scope.error = "Could not delete tournament successfully.";
                }
            });
        };

        $scope.startTourney = function() {
            $http.put("/api/tournament/" + $routeParams.id, {started: true}).then(function(response) {
                var data = response.data;
                if (data.success) {
                    var admin = $scope.tournament.admin;
                    $scope.tournament = data.content.tournament;
                    $scope.tournament.admin = admin;
                } else {
                    $scope.error = "Could not start tournament";
                }
            });
        };

        $scope.addBracket = function(type, name) {
          var selectedTeams = $scope.teams.filter(function(team) {
            return team.selected;
          });
          selectedTeams = selectedTeams.map(function(team) {
            return team._id;
          });
          if (selectedTeams.length >= 2 && type && name) {
            $http.post('/api/bracket/', {type: type, name: name, teams: selectedTeams, tournament: $scope.tournament._id})
            .then(function() {
              $scope.toggleAddBracketModal();
              $route.reload();
            }).catch(function() {
              $scope.addBracketError = 'Adding bracket unsuccessful';
            });
          } else {
            $scope.addBracketError = 'Must enter bracket name, bracket type, and at least two teams.'
          }
        };
        
        $http.get("/current_auth").then(function(response) {
            var data = response.data;
            if (data.success) {
                $scope.user = data.content.user;
            }

            return $http.get("/api/tournament/" + $routeParams.id);
        }).then(function(response) {

            // get desired tournament
            var data = response.data;
            if (data.success) {
                $scope.tournament = data.content.tournament;
                $scope.description = data.content.tournament.description;
                $scope.isAdmin =  ($scope.user) && ($scope.user._id == $scope.tournament.admin._id);

                return $http.get("/api/bracket?tournament=" + $routeParams.id);
            } else {
                $scope.error = "Tournament does not exist!";
            }

        }).then(function(response) {

            // get brackets of tournament
            var data = response.data;
            if (data.success) {
                $scope.brackets = data.content.brackets;
                return $http.get("/api/team?tournament=" + $routeParams.id);
            } else {
                $scope.error = "Cannot get brackets of tournament!";
            }

        }).then(function(response) {

            // get teams of tournament
            var data = response.data;
            if (data.success) {
                $scope.teams = data.content.teams;
                for (var i = 0; i < $scope.brackets.length; i++) {
                    drawBracketVisual($scope.brackets[i]);
                }
            }

        }).catch(function(response) {
          $scope.error = response.data.err;
        });

        $scope.logout = function() {
            $http.get("/logout").then(function (resp) {
                $window.location.href = "/#/login";
            });
        };

        $scope.addTeam = function(name) {
            var data = {
                team_name: name,
                tournament: $routeParams.id
            };
            $http.post("/api/team", data).success(function(response) {
                var data = response;
                $scope.teams.push(data.content.team);
                $scope.toggleAddTeamModal();
            }).error(function(response) {
                $scope.addTeamError = response.err;
            });
        }

        var getWinnerName = function (id) {
            return $http.get('/team/' + id).success(function (team) {
                    return team.name;
            }).error(function (err) {
                console.log(err);
                return 'None';
            });
        }

        var drawBracketVisual = function(bracket) {

            // helper functions
            var searchTeam = function(t_id) {
                for (var ti = 0; ti < $scope.teams.length; ti++) {
                    if ($scope.teams[ti]._id == t_id) {
                        return $scope.teams[ti];
                    }
                }
                return undefined;
            };

            var addLink = function(node, ob, api) {
                node.data([ob])
                    .on("mouseover", function() {
                        d3.select(this).style("cursor", "pointer");
                        if (this.tagName == "circle") {
                            d3.select(this).attr("r", 7);
                        } else if (this.tagName == "text") {
                            d3.select(this).style("font-weight", "bold");
                        } else if (this.tagName == "g") {

                            var classes = d3.select(this).attr("class").split(" ");

                            // team cell selected
                            if (classes.indexOf("team") >= 0) {
                                classes.forEach(function(c) {
                                    if (c == "team") return;
                                    d3.selectAll("." + c).selectAll("rect").style("opacity", function() {
                                        return parseFloat(d3.select(this).style("opacity")) + 0.2;
                                    });
                                });

                            // match cell selected
                            } else {
                                d3.selectAll("." + classes.join(".")).selectAll("rect")
                                    .style("opacity", function() {
                                        return parseFloat(d3.select(this).style("opacity")) + 0.2;
                                    });
                            }
                        }
                    })
                    .on("mouseout", function() {
                        if (this.tagName == "circle") {
                            d3.select(this).attr("r", 5);
                        } else if (this.tagName == "text") {
                            d3.select(this).style("font-weight", "normal");
                        } else if (this.tagName == "g") {
                            var classes = d3.select(this).attr("class").split(" ");

                            if (classes.indexOf("team") >= 0) {
                                classes.forEach(function(c) {
                                    if (c == "team") return;
                                    d3.selectAll("." + c).selectAll("rect").style("opacity", function() {
                                        return parseFloat(d3.select(this).style("opacity")) - 0.2;
                                    });
                                });
                            } else {
                                d3.selectAll("." + classes.join(".")).selectAll("rect")
                                    .style("opacity", function() {
                                        return parseFloat(d3.select(this).style("opacity")) - 0.2;
                                    });
                            }
                        }
                    })
                    .on("click", function(d) {
                        var link = "/#/" + api + "/" + d._id;
                        $window.location.href = link;
                    });
            }

            var addEliminationLine = function(x1, y1, x2, y2) {
                svg.append("line")
                    .attr("x1", x1)
                    .attr("y1", y1)
                    .attr("x2", x2)
                    .attr("y2", y2)
                    .style("stroke-width", 1)
                    .style("stroke", "red");

            }

            var container = d3.select("#visual_brackets");
            var div = container.append("div").attr("id", bracket._id)
                .style("border", "thin solid black")
                .style("padding", "5px").style("margin-top", "30px");
            div.append("h3").text(bracket.name);
            div.append("h4").text("Winner: " + (bracket.winner ? searchTeam(bracket.winner).name : ""));

            if (bracket.type == "Elimination") {
                var matches = bracket.matches;

                var rounds = Math.max(Math.ceil(Math.log(matches.length) / Math.log(2)), 1);

                // the length of matches must be 2^n - 1 for some n
                if (Math.pow(2, rounds) - 1 != matches.length) {
                    container.append("p").text("invalid data to draw bracket.");

                } else {
                    var cellWidth = window.innerWidth / (rounds + 2);
                    var cellHeight = 50;

                    var w = cellWidth * (rounds + 1);
                    var h = cellHeight * (matches.length + 1);

                    var xScale = d3.scale.linear()
                        .domain([0, rounds])
                        .range([0, w - cellWidth]);

                    var svg = div.append("div").append("svg")
                        .attr("width", w).attr("height", h);

                    var yScale;

                    for (var r = 0; r < rounds; r++) {
                        var nMatchesThisRound = Math.pow(2, (rounds - r - 1));

                        var lastYScale = (r == 0) ? 0 : (yScale(0) + matchSpacing/2);

                        yScale = d3.scale.linear().domain([0, nMatchesThisRound]).range([cellHeight/2, h - cellHeight/2]);
                        var matchSpacing = yScale(1) - yScale(0);

                        var teamSpacing = (r == 0) ? cellHeight / -2 : lastYScale - (yScale(0) + matchSpacing / 2);

                        for (var m = 0; m < nMatchesThisRound; m++) {

                            // the match's index in the original matches list
                            var matchIndex = Math.pow(2, rounds - r - 1) + m - 1;

                            // vertical line connecting two teams
                            addEliminationLine(
                                xScale(r) + cellWidth, // x1
                                yScale(m) + matchSpacing/2 - teamSpacing, // y1
                                xScale(r) + cellWidth, // x2
                                yScale(m) + matchSpacing/2 + teamSpacing); // y2                          

                            // add team names for very first round
                            if (matchIndex >= Math.floor(matches.length / 2)) {
                                // line under team 1
                                addEliminationLine(
                                    xScale(r) + cellWidth, // x1
                                    yScale(m) + matchSpacing/2 + teamSpacing, // y1
                                    xScale(r), // x2
                                    yScale(m) + matchSpacing/2 + teamSpacing); // y2       

                                // line under team 2
                                addEliminationLine(
                                    xScale(r) + cellWidth, // x1
                                    yScale(m) + matchSpacing/2 - teamSpacing, // y1
                                    xScale(r), // x2
                                    yScale(m) + matchSpacing/2 - teamSpacing); // y2

                                // write team 1's name on the line
                                var team1 = searchTeam(matches[matchIndex].participants[0]);

                                var team1_node = svg.append("text")
                                    .attr("x", xScale(r) + cellWidth/2)
                                    .attr("y", yScale(m) + matchSpacing/2 + teamSpacing - 2)
                                    .attr("text-anchor", "middle")
                                    .text(team1 ? (team1.name.length > 15 ? (team1.name.substring(0, 25) + "...") : team1.name) : "");
                                addLink(team1_node, team1, "team");

                                // write team 2's name on the line
                                // TODO: replace text with matches[matchIndex].participants[1].name
                                // replace link to team's profile page
                                var team2 = searchTeam(matches[matchIndex].participants[1]);
                                var team2_node = svg.append("text")
                                    .attr("x", xScale(r) + cellWidth/2)
                                    .attr("y", yScale(m) + matchSpacing/2 - teamSpacing - 2)
                                    .attr("text-anchor", "middle")
                                    .text(team2 ? (team2.name.length > 15 ? (team2.name.substring(0, 25) + "...") : team2.name) : "");
                                addLink(team2_node, team2, "team");
                            }

                            // add match winner line
                            addEliminationLine(
                                xScale(r) + cellWidth, // x1
                                yScale(m) + matchSpacing/2, // y1
                                xScale(r) + cellWidth*2, // x2
                                yScale(m) + matchSpacing/2); // y2       

                            var winner = searchTeam(matches[matchIndex].outcome.winner);

                            if (winner) {
                                // add team name to winner line
                                var winner_node = svg.append("text")
                                    .attr("x", xScale(r) + cellWidth*3/2)
                                    .attr("y", yScale(m) + matchSpacing/2 - 2)
                                    .attr("text-anchor", "middle")
                                    .text(winner.name);
                                addLink(winner_node, winner, "team");
                            }

                            // add match link
                            var m_node = svg.append("circle")
                                .attr("cx", xScale(r) + cellWidth)
                                .attr("cy", yScale(m) + matchSpacing/2)
                                .attr("r", 5)
                                .style("fill", "black");
                            addLink(m_node, matches[matchIndex], "match");

                        }
                    }

                }

            } else if (bracket.type == "Round Robin") {
                var matches = bracket.matches;

                var nTeams = (1 + Math.sqrt(1 + 8 * matches.length))/2;
                var teamList = [];

                var cellWidth = 150;
                var cellHeight = 80;
                var cellPadding = 5;
                var w = (nTeams + 1) * cellWidth;
                var h = (nTeams + 1)* cellHeight;

                var svg = div.append("svg")
                    .attr("width", w).attr("height", h);

                var xScale = d3.scale.linear().domain([0, nTeams + 1]).range([0, w]);
                var yScale = d3.scale.linear().domain([0, nTeams + 1]).range([0, h]);

                // build nTeams x nTeams table
                for (var r = 0; r < nTeams + 1; r++) {
                    for (var c = 0; c < nTeams + 1; c++) {

                        var box = svg.append("g").attr("class", "row_" + r + " col_" + c 
                            + ((r == 0 || c == 0) ? " team" : ""));

                        box.append("rect").attr("x", xScale(r)).attr("y", yScale(c))
                            .attr("width", cellWidth - cellPadding).attr("height", cellHeight - cellPadding)
                            .attr("fill", "gray")
                            .style("opacity", (r == 0 || c == 0) ? 0.8 : 0.3);
                    }
                }

                var appendTeamToTable = function(team) {

                    var i = teamList.length;

                    var t_node1 = d3.selectAll(".row_" + i).filter(".col_0").attr("class", "team team_" + team._id);
                    t_node1.append("text")
                        .attr("x", xScale(teamList.length) + cellWidth / 2)
                        .attr("y", yScale(0) + cellHeight / 2)
                        .attr("text-anchor", "middle")
                        .text(team.name.length > 15 ? (team.name.substring(0, 15) + "...") : team.name);
                    addLink(t_node1, team, "team");

                    // add to column of teams
                    var t_node2 = d3.selectAll(".col_" + i).filter(".row_0").attr("class", "team team_" + team._id);
                    t_node2.append("text")
                        .attr("x", xScale(0) + cellWidth / 2)
                        .attr("y", yScale(teamList.length) + cellHeight / 2)
                        .attr("class", "team_" + team._id)
                        .attr("text-anchor", "middle")
                        .text(team.name.length > 15 ? (team.name.substring(0, 15) + "...") : team.name);
                    addLink(t_node2, team, "team");
                };

                // go through matches and build table
                for (var m = 0; m < matches.length; m++) {
                    var team1 = searchTeam(matches[m].participants[0]);
                    var team2 = searchTeam(matches[m].participants[1]);
                    
                    // add to list if team not in table
                    if (teamList.indexOf(team1._id) < 0) {
                        teamList.push(team1._id);
                        appendTeamToTable(team1)             
                    }

                    if (teamList.indexOf(team2._id) < 0) {
                        teamList.push(team2._id);      
                        appendTeamToTable(team2);                    
                    }

                    var team1Index = teamList.indexOf(team1._id);
                    var team2Index = teamList.indexOf(team2._id);

                    var node_1 = d3.selectAll(".row_" + (team1Index+1)).filter(".col_" + (team2Index+1))
                        .attr("class", "match match_" + matches[m]._id + " team_" + team1._id + " team_" + team2._id);
                    var node_2 = d3.selectAll(".col_" + (team1Index+1)).filter(".row_" + (team2Index+1))
                        .attr("class", "match match_" + matches[m]._id + " team_" + team1._id + " team_" + team2._id);

                    addLink(node_1, matches[m], "match");
                    addLink(node_2, matches[m], "match");

                    var m1 = node_1.append("text")
                        .attr("x", xScale(team1Index + 1) + cellWidth/2)
                        .attr("y", yScale(team2Index + 1) + cellHeight/2)
                        .attr("text-anchor", "middle");

                    m1.append("tspan").attr("dy", -15).attr("x", xScale(team1Index + 1) + cellWidth/2)
                        .text("Match " + (matches[m].outcome.winner ? " (Played)" : ""));
                    
                    var m1_t = m1.append("tspan").attr("dy", 40).attr("x", xScale(team1Index + 1) + cellWidth/2);
                    m1_t.append("tspan").text(team2.name.length > 15 ? (team2.name.substring(0, 15) + "...") : team2.name) 
                        .attr("dy", 20).attr("x", xScale(team1Index + 1) + cellWidth/2)
                        .style("font-weight", (team2._id == matches[m].outcome.winner ? "bold" : "normal"));
                    m1_t.append("tspan").text(team1.name.length > 15 ? (team1.name.substring(0, 15) + "...") : team1.name)
                        .attr("dy", 20).attr("x", xScale(team1Index + 1) + cellWidth/2)
                        .style("font-weight", (team1._id == matches[m].outcome.winner ? "bold" : "normal"));

                    var m2 = node_2.append("text")
                        .attr("x", xScale(team2Index + 1) + cellWidth/2)
                        .attr("y", yScale(team1Index + 1) + cellHeight/2)
                        .attr("text-anchor", "middle");

                    m2.append("tspan").attr("dy", -15).attr("x", xScale(team2Index + 1) + cellWidth/2)
                        .text("Match " + (matches[m].outcome.winner ? " (Played)" : ""));

                    var m2_t = m2.append("tspan").attr("dy", 40).attr("x", xScale(team2Index + 1) + cellWidth/2);
                    m2_t.append("tspan").text(team1.name.length > 15 ? (team1.name.substring(0, 15) + "...") : team1.name)
                        .attr("dy", 20).attr("x", xScale(team2Index + 1) + cellWidth/2)
                        .style("font-weight", (team1._id == matches[m].outcome.winner ? "bold" : "normal"));
                    m2_t.append("tspan").text(team2.name.length > 15 ? (team2.name.substring(0, 15) + "...") : team2.name)
                        .attr("dy", 20).attr("x", xScale(team2Index + 1) + cellWidth/2)
                        .style("font-weight", (team2._id == matches[m].outcome.winner ? "bold" : "normal"));
                }
            }
        };

        activate();

        function activate() { }
    }
})();
