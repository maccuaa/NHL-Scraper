var express = require('express');
var fs      = require('fs');
var request = require('request');
var cheerio = require('cheerio');
var app     = express();
var Q       = require('q');
var entities = require("entities");

app.get('/scrape', function(req, res){

    var teamsURL           = "http://www.nicetimeonice.com/api/teams?";
    var playerStatsListURL = "http://www.nhl.com/ice/playerstats.htm?viewName=summary&sort=points&pg={}";
    var playerInfoURL      = "http://www.nhl.com/ice/player.htm?id={}";
    var gameStatsURL       = 'http://www.nhl.com/ice/gamestats.htm?sort=gameDate&pg={}';

    var teams = [];   // Array of team objects like this { id : MTL , name : Montreal Canadiens, ... }
    var rosters = []; // Array of roster objects like this { player : team }
    var stats = [];   // Array of player stats objects
    var games = [];   // Array of games objects
    var players = []; // Array of player objects

    /* ================================================================================================================
    /    Get list of teams
    /* ============================================================================================================== */
    function getListOfTeams() {
        var d = Q.defer();
        console.log("1. Getting teams list...");
        request({
            url: teamsURL,
            json: true
        }, function (error, response, body) {
            if (!error && response.statusCode === 200) {
                console.log("Parsing teams list...");
                for (var i in body) {
                    var team = {};
                    team.id = body[i].teamID;
                    team.name = body[i].name;
                    team.conference = body[i].conference;
                    team.division = body[i].division;

                    if (team.name !== "Phoenix Coyotes" && team.name !== "Atlanta Thrashers") {
                        teams.push(team);
                    }
                }
                console.log("Parsing teams list complete");
                d.resolve();
            }
        });
        return d.promise;
    }

    /* ================================================================================================================
     /    Get all players stats
     /* ============================================================================================================== */
    function getPlayerStats () {
        var d = Q.defer();
        console.log("2. Getting player stats...");
        request(playerStatsListURL, function(error, response, html) {
            if (!error && response.statusCode === 200) {
                console.log("Parsing player stats...");
                var $ = cheerio.load(html);

                var numPages = $(".contentBlock table.data tfoot .pages a").last().attr('href').split('&').pop().split("=").pop();

                var promises = [];
                for (var x = 1; x <= numPages; x++) {
                    var url = playerStatsListURL.replace('{}', x.toString());
                    var promise = parsePlayerStatsList(url, x);
                    promises.push(promise);
                }
                Q.all(promises).then(function () {
                    console.log("Parsing player stats complete");
                    d.resolve();
                }).done();
            }
        });
        return d.promise;
    }

    /* ================================================================================================================
     /    Get list of players
     /* ============================================================================================================== */
    function getPlayerInfo() {
        var d = Q.defer();
        console.log("3. Getting player info...");

        var promises = [];
        for (var i = 0; i < stats.length; i++) {
            var player = stats[i].id;
            var url = playerInfoURL.replace('{}', player);
            var promise = parsePlayerInfo(url, player, (i + 1));
            promises.push(promise);
        }

        Q.all(promises).then(function () {
            console.log("Getting list of players complete");
            d.resolve();
        });

        return d.promise;
    }

    /* ================================================================================================================
     /    Get all the games played by the teams
     /* ============================================================================================================== */
    function getGameResults() {
        var d = Q.defer();
        console.log("4. Getting game results...");
        request(gameStatsURL, function(error, response, html) {
            if (!error && response.statusCode === 200) {
                console.log("Parsing game results...");
                var $ = cheerio.load(html);

                var numPages = $(".contentBlock table.data tfoot .pages a").last().attr('href').split('&').pop().split("=").pop();

                var promises = [];
                for (var x = 1; x <= numPages; x++) {
                    var url = gameStatsURL.replace('{}', x.toString());
                    var promise = parseGameResultsPage(url, x);
                    promises.push(promise);
                }
                Q.all(promises).then(function () {
                    console.log("Parsing game results complete");
                    d.resolve();
                });
            }
        });
        return d.promise;
    }

    function parsePlayerInfo(url, id, index) {
        var d = Q.defer();
        request({
            url: url,
            json: true
        }, function (error, response, html) {
            if (!error && response.statusCode === 200) {
                var $ = cheerio.load(html);

                var name, bioinfo, height, weight;
                var json = { id : "", name : "", weight : "", height : "", position : "", dob : ""};

                name = $("#tombstone .headshot img").attr("alt");
                bioinfo = $(".bioInfo td");
                height = entities.decodeHTML($(bioinfo[5]).html().trim());
                weight = $(bioinfo[9]).html().trim();

                json.id = id;
                json.name = name.replace("'", "''");
                json.weight = weight;
                json.height = height.replace("'", "''");
                json.position = $("#tombstone span[style='color: #666;']").html();
                json.dob = $(bioinfo[3]).html().split('\n')[1];

                players.push(json);
                d.resolve();
            }
        });
        return d.promise;
    }

    function parsePlayerStatsList(url, x) {
        var d = Q.defer();
        request(url, function(error, response, html) {
            if (!error && response.statusCode === 200) {
                var $ = cheerio.load(html);

                $(".contentBlock table.data tbody tr").each(function(i, row) {
                    // Loop through each player row.
                    var columns = $(row).find("td").toArray();

                    var id, team;
                    var json = { id : "", team : "", gp : "", g : "", a : "", p : "", pm : "", pim : "", shots : "", toi : "",
                        ppg : "", shg : "", gwg : "", otg : "" };

                    id = $(columns[1]).find("a").attr('href').split('=').pop();
                    team = $(columns[2]).find("a").html();

                    if (team == null) {
                        team = $(columns[2]).html().split(', ').pop();
                    }

                    json.id   = id;
                    json.team = team;
                    json.gp   = $(columns[4]).html();
                    json.g    = $(columns[5]).html();
                    json.a    = $(columns[6]).html();
                    json.p    = $(columns[7]).html();
                    json.pm   = $(columns[8]).html();
                    json.pim  = $(columns[9]).html();
                    json.ppg  = $(columns[10]).html();
                    json.shg  = $(columns[12]).html();
                    json.gwg  = $(columns[14]).html();
                    json.otg  = $(columns[15]).html();
                    json.shots = $(columns[16]).html();
                    json.toi  = $(columns[5]).html();

                    // Add player stats to stats array
                    stats.push(json);
                    // Add player to team roster
                    rosters.push({player : id, team : team});
                });
                d.resolve();
            }
        });
        return d.promise;
    }

    function parseGameResultsPage(url) {
        var d = Q.defer();
        request(url, function(error, response, html) {
            if (!error && response.statusCode === 200) {
                var $ = cheerio.load(html);

                $(".contentBlock table.data tbody tr").each(function(i, row) {

                    var id, date, home_team, away_team;
                    var json = { home_team : "", away_team : "", home_goals : "", away_goals : "", id : "", date : "" };

                    // Loop through each player row.
                    var columns = $(row).find("td").toArray();

                    id = $(columns[0]).find("a").attr('href').split('/').pop().split('.').shift();
                    date = $(columns[0]).find("a").html();


                    json.id   = id;
                    json.date = entities.decode(date).replace("'", "''");
                    json.away_team = getTeamCode($(columns[1]).html());
                    json.away_goals = $(columns[2]).html();
                    json.home_team = getTeamCode($(columns[3]).html());
                    json.home_goals = $(columns[4]).html();

                    if (json.away_team == undefined)
                        json.away_team = $(columns[1]).find('a').attr('rel');
                    if (json.home_team == undefined)
                        json.home_team = $(columns[3]).find('a').attr('rel');

                    // Add games results to games array
                    games.push(json);
                });
                d.resolve();
            }
        });
        return d.promise;
    }

    function getTeamCode(team) {
        switch (team.toLowerCase()) {
            case 'anaheim':
                return "ANA";
            case 'arizona':
                return "ARI";
            case 'boston':
                return 'BOS';
            case 'buffalo':
                return 'BUF';
            case 'calgary':
                return 'CGY';
            case 'carolina':
                return 'CAR';
            case 'chicago':
                return 'CHI';
            case 'colorado':
                return 'COL';
            case 'columbus':
                return 'CBJ';
            case 'dallas':
                return 'DAL';
            case 'detroit':
                return 'DET';
            case 'edmonton':
                return 'EDM';
            case 'florida':
                return 'FLA';
            case 'los angeles':
                return 'LAK';
            case 'minnesota':
                return 'MIN';
            case 'montreal':
                return 'MTL';
            case 'nashville':
                return 'NSH';
            case 'new jersey':
                return 'NJD';
            case 'ny islanders':
                return 'NYI';
            case 'ny rangers':
                return 'NYR';
            case 'ottawa':
                return 'OTT';
            case 'philadelphia':
                return 'PHI';
            case 'pittsburgh':
                return 'PIT';
            case 'san jose':
                return 'SJS';
            case 'st louis':
                return 'STL';
            case 'tampa bay':
                return 'TBL';
            case 'toronto':
                return 'TOR';
            case 'vancouver':
                return 'VAN';
            case 'washington':
                return 'WSH';
            case 'winnipeg':
                return 'WPG';
            default:
                console.log("Team not found: " + team);
                return team;
        }
    }

    function generateSQLScript() {
        var string =

"begin transaction; \n \
\n \
drop table if exists players; \n \
drop table if exists rosters; \n \
drop table if exists teams; \n \
drop table if exists player_stats; \n \
drop table if exists matches; \n \
\n \
-- Create teams table \n \
CREATE TABLE teams ( \n \
    id TEXT PRIMARY KEY, \n \
    name TEXT NOT NULL, \n \
    conference TEXT NOT NULL, \n \
    division TEXT NOT NULL \n \
); \n \
\n \
-- Create players table \n \
CREATE TABLE players ( \n \
    id INTEGER PRIMARY KEY, \n \
    name TEXT NOT NULL, \n \
    position TEXT NOT NULL, \n \
    height TEXT NOT NULL, \n \
    weight INTEGER NOT NULL, \n \
    dob TEXT NOT NULL \n \
); \n \
\n \
-- Create rosters table \n \
CREATE TABLE rosters ( \n \
    player INTEGER, \n \
    team TEXT, \n \
    PRIMARY KEY (player, team), \n \
    FOREIGN KEY (player) REFERENCES players(id) \n \
FOREIGN KEY (team) REFERENCES teams(id) \n \
); \n \
\n \
-- Create player stats table \n \
CREATE TABLE player_stats ( \n \
    player INTEGER, \n \
    team TEXT, \n \
    games_played INTEGER NOT NULL, \n \
    goals INTEGER NOT NULL, \n \
    assists INTEGER NOT NULL, \n \
    points INTEGER NOT NULL, \n \
    plus_minus INTEGER NOT NULL, \n \
    pim INTEGER NOT NULL, \n \
    shots INTEGER NOT NULL, \n \
    toi TEXT NOT NULL, \n \
    ppg INTEGER NOT NULL, \n \
    shg INTEGER NOT NULL, \n \
    gwg INTEGER NOT NULL, \n \
    otg INTEGER NOT NULL, \n \
    PRIMARY KEY (player, team), \n \
    FOREIGN KEY (player) REFERENCES players(id), \n \
    FOREIGN KEY (team) REFERENCES teams(id) \n \
); \n \
\n \
-- Create matches table \n \
\n \
CREATE TABLE matches ( \n \
    id TEXT PRIMARY KEY , \n \
    home_team TEXT, \n \
    away_team TEXT, \n \
    home_goals INTEGER, \n \
    away_goals INTEGER, \n \
    date TEXT, \n \
    FOREIGN KEY (home_team) REFERENCES teams(id), \n \
    FOREIGN KEY (away_team) REFERENCES teams(id) \n \
); \n\n";

        teams.forEach(function (team) {
            string += printTeam(team);
        });

        string += "\n";

        players.forEach(function (player) {
            string += printPlayer(player);
        });

        string += "\n";

        rosters.forEach(function (roster) {
            string += printRoster(roster);
        });

        string += "\n";

        stats.forEach(function (stat) {
            string += printPlayerStats(stat);
        });

        string += "\n";

        games.forEach(function (game) {
            string += printGameResult(game);
        });

        string += "\n end transaction;"

        return string;
    }

    function printTeam(team) {
        return "INSERT INTO teams (id, name, conference, division) VALUES ('" +
            team.id + "', '" +
            team.name + "', '" +
            team.conference + "', '" +
            team.division + "'); \n";
    }

    function printPlayer(player) {
        return "INSERT INTO players (id, name, weight, height, position, dob) VALUES (" +
            player.id + ", '" +
            player.name + "', " +
            player.weight + ", '" +
            player.height + "', '" +
            player.position + "', '" +
            player.dob + "'); \n";
    }

    function printRoster(obj) {
        return "INSERT INTO rosters VALUES (" + obj.player + ", '" + obj.team + "'); \n";
    }

    function printPlayerStats(player) {
        return "INSERT INTO player_stats VALUES (" +
            player.id + ", '" +
            player.team + "', " +
            player.gp + ", " +
            player.g + ", " +
            player.a + ", " +
            player.p + ", " +
            player.pm + ", " +
            player.pim + ", " +
            player.shots + ", '" +
            player.toi + "', " +
            player.ppg + ", " +
            player.shg + ", " +
            player.gwg + ", " +
            player.otg + "); \n";
    }

    function printGameResult(game) {
        return "INSERT INTO matches VALUES ('" +
            game.id + "', '" +
            game.home_team + "', '" +
            game.away_team + "', " +
            game.home_goals + ", " +
            game.away_goals + ", '" +
            game.date + "'); \n";
    }

    function writeScriptToDisk() {
        console.log("5. Writing results to disk");

        console.log("Summary");
        console.log("Teams - " + teams.length);
        console.log("Players - " + players.length);
        console.log("Rosters - " + rosters.length);
        console.log("Stats - " + stats.length);
        console.log("Games - " + games.length);

        fs.writeFile('pool.sql', generateSQLScript(), function(err){
            console.log('File successfully written! - Check your project directory for the output.json file');
        });
    }

    console.log("Starting scrape");

    getListOfTeams()
        .then(getPlayerStats)
        .then(getPlayerInfo)
        .then(getGameResults)
        .then(writeScriptToDisk)
        .done();

    res.send('Check your console!');
});

app.listen('8081');
console.log('Magic happens on port 8081');
exports = module.exports = app;