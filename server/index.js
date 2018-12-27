var express = require('express');
var path = require('path');
var app = require('express')();
var http = require('http');
var server = http.createServer(app);
var io = require('socket.io')(http);
var secondHost = false;
var gameserver = require("./GameServer.js");

const clientPath = path.resolve(path.dirname(require.main.filename) + '/../client/');
app.use(express.static(clientPath));
app.get('/', function (req, res) {
    res.sendFile(clientPath + 'index.html');
});
var donethis = false;

io.on('connection', function (socket) {
    if (secondHost) {
        if (typeof socket.isChecked == 'undefined' || socket.isChecked == null) {
            // überprüfen und isChecked setzen
        }
    }

    /**
     * Es kam eine Verbindung auf den 2. Server, versuche eine Weiterleitung von Port 80 auf 3000 zu erzwingen
     * um Zugriff auf die Standard URL weiterhin zu ermöglichen
     */
    if (secondHost && !donethis) {
        donethis = true;
        console.log("Hauptserver nicht mehr verfügbar");
        // TODO Daten vom ersten Server ziehen -> Ausfallsicherheit!
    }

    /**
     * Usernamen setzen für den Socket
     */
    socket.on('set username', function (username) {

        // Leerstring prüfen
        if (username.trim() === "") {
            socket.emit('set username', {
                'code': 401, 'msg': "Dein Benutzername darf nicht leer sein", 'error': true
            });
            return false;
        }
        // existiert Benutzer bereits?
        if (!gameserver.isUser(username)) {
            // Username frei, Werte speichern und Erfolg melden
            gameserver.registerUser(username, socket);
            console.log("[EVENT] '" + gameserver.getUsername(socket) + "' ist dem server beigetreten");
            socket.emit('set username', {
                'code': 200, 'msg': "ok", 'error': false
            });

            // Andere über Beitritt des neuen Nutzers informieren
            socket.broadcast.emit('chat message', {
                // msg: user[socket.id].name + " ist dem server beigetreten ",
                msg: gameserver.getUsername(socket) + " ist dem server beigetreten",
                type: 'event',
                servertimestamp: Date.now()
            });


            // Benutzerliste updaten
            io.emit('user update', gameserver.getUsernames());


        } else {
            // Username exisitert, Fehler ausgeben
            socket.emit('set username', {
                'code': 409, 'msg': "Der Name '" + username + "' existiert bereits", 'error': true
            });
        }


    });

    // Gegenspieler mitteilen welches Feld gespielt wurde
    // TODO für verschiedene Spiele anpassen
    socket.on('game move', function (data) {
        console.log("[EVENT] " + gameserver.getUsername(socket) + " machte move:  " + data.row + ":" + data.column)

        socket.broadcast.emit('accepted game move', {
            msg: gameserver.getUsername(socket) + " machte move:  " + data.row + ":" + data.column,
            type: 'event',
            servertimestamp: Date.now(),
            move: data
        });


    });

    // Spieler zu einem Spiel einladen
    socket.on('invite player', function (data) {

        console.log(data);
        var username;

        if (data === gameserver.getUsername(socket)) {
            console.log("[EVENT-ERROR] " + username + ' hat sich selber eingeladen.');

            socket.emit('chat message', {
                code: 401,
                msg: "Du kannst dich nicht selbst einladen.",
                type: 'event',
                'error': true
            });
            return false;
        }

        // prüfen ob der Benutzer noch online ist
        else if (!gameserver.isUser(data)) {
            socket.emit('chat message', {
                msg: "Der Benutzer existiert nicht oder ist offline.", //todo wer ist ihr?
                type: 'event',
                servertimestamp: Date.now()
            });
        } else {
            // Spieler noch online, Einladung anzeigen
            //console.log("[EVENT] " + data + ' wurde eingeladen von ' + username);
            console.log("[EVENT] " + data + ' wurde eingeladen von ' + gameserver.getUsername(socket));
            io.to(`${gameserver.getUser(data)}`).emit('chat message', {
                msg: username + " lädt dich ein  ",
                type: 'event',
                servertimestamp: Date.now()
            })
        }
    });


    // Chatnachricht senden
    socket.on('chat message', function (data) {
        // Leerstring ignorieren
        if (data.msg.trim() === "") return false;

        console.log("[CHAT] " + gameserver.getUsername(socket) + ": " + data.msg);
        data.type = "message";
        data.serversimestamp = Date.now();
        data.name = gameserver.getUsername(socket);

        io.emit('chat message', data);
    });


    // Beim schließen der Verbindung eine Meldung an andere Nutzer senden und Spieler aus Listen entfernen
    socket.on('disconnect', function () {
        //Testen, ob Benutzer angemeldet war, ob er existiert hat
        try {
            let username = gameserver.getUsername(socket);
            console.log("[SERVER] '" + username + "' disconnected");
            let data = {
                "msg": username + " hat den Server verlassen",
                type: "event",
                servertimestamp: Date.now()
            };
            socket.broadcast.emit('chat message', data);

            gameserver.deleteUser(socket);

            // Benutzerliste updaten
            io.emit('user update', gameserver.getUsernames());
        } catch (e) {
            console.log("[SERVER] Ein nicht eingeloggter Nutzer hat die Verbindung unterbrochen.");
        }
    });

});


/**
 * Starten des Servers
 */
function startServer() {
    var ports = [80,3000];
    var i = 0;

    server.on('error', function () {
        if (i < ports.length - 1) {
            i += 1;
            console.log("Port " + ports[i-1] + " belegt, versuche " + ports[i] + ".");
            server.listen(ports[i]);
            secondHost = true
        } else {
            console.log("Port " + ports[i] + " belegt, es gibt keinen weiteren Port.");
        }
    });

    server.listen(ports[i], function () {
        console.log("listening on *:" + ports[i]);
    });
}

console.clear();
startServer();