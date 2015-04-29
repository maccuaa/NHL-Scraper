var request = require("request")

var teams = [];

var getTeamsURL = "http://www.nicetimeonice.com/api/teams?";
var teamRosterURL = "http://nhlwc.cdnak.neulion.com/fs1/nhl/league/teamroster/{}/iphone/clubroster.json";
var playerStatsURL = "http://nhlwc.cdnak.neulion.com/fs1/nhl/league/playerstatsline/20132014/2/{}/iphone/playerstatsline.json"

function getTeams() {
    request({
        url: getTeamsURL,
        json: true
    }, function (error, response, body) {
        if (!error && response.statusCode === 200) {
            teams = body;

            for (var i in teams) {
                var team = teams[i].teamID;
                var name = teams[i].name;
                var conference = teams[i].conference;
                var division = teams[i].division;

                if (name !== "Phoenix Coyotes" && name !== "Atlanta Thrashers") {
                    // printTeam(team, name, conference, division);
                    // showRoster(team);
                    showPlayerStats(team);
                }
            }
        }
    });
}

function showPlayerStats (team) {
    var url = playerStatsURL;
    url = url.replace('{}', team);
    request({
        url: url,
        json: true
    }, function (error, response, body) {
        if (!error && response.statusCode === 200) {
            var players = [];

            players = body.skaterData;

            for (i in players) {

                var player_id = players[i].id;
                var stats = players[i].data.split(", ");

                printPlayerStats(player_id, team, stats[3], stats[4], stats[5], stats[6], stats[7], stats[8], stats[9], stats[10], stats[11], stats[12], stats[13], stats[14]);
            }
        }
    });
}

function showRoster(team) {
    var url = teamRosterURL;
    url = url.replace('{}', team);
    request({
        url: url,
        json: true
    }, function (error, response, body) {
        if (!error && response.statusCode === 200) {
            var players = [];

            players = players.concat(body.defensemen);
            players = players.concat(body.forwards);

            for (i in players) {

                var player_id = players[i].id;

                // printRoster(player_id, team);

                // var name = String(players[i].name).replace("'", "''");
                // var weight = players[i].weight;
                // var height = String(players[i].height).replace("'", "''");
                // var position = players[i].position;
                // var dob = players[i].birthdate;

                // printPlayer(player_id, name, weight, height, position, dob);
            }
        }
    });
}

function printPlayer(id, name, weight, height, position, dob) {
    console.log("INSERT INTO players (id, name, weight, height, position, dob) VALUES (" +
        id + ", '" +
        name + "', " +
        weight + ", '" +
        height + "', '" +
        position + "', '" +
        dob + "');"
    );
}

function printTeam(id, name, conference, division) {
    console.log("INSERT INTO teams (id, name, conference, division) VALUES ('" +
        id + "', '" +
        name + "', '" +
        conference + "', '" +
        division + "');"
    );
}

function printRoster(player, team) {
    console.log ("INSERT INTO rosters VALUES (" + player + ", '" + team + "');");
}

function printPlayerStats(player_id, team, games_played, goals, assists, points, plus_minus, pim, shots, toi, ppg, shg, gwg, otg) {
    console.log ("INSERT INTO player_stats VALUES (" +
        player_id + ", '" +
        team + "', " +
        games_played + ", " +
        goals + ", " +
        assists + ", " +
        points + ", " +
        plus_minus + ", " +
        pim + ", " +
        shots + ", '" +
        toi + "', " +
        ppg + ", " +
        shg + ", " +
        gwg + ", " +
        otg + ");"
    );
}

getTeams();