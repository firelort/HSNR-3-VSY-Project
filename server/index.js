var express = require('express');
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var secondHost = false;
var gameserver = require("./GameServer.js");

app.use(express.static('../client/'));

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
        console.log("Hauptserver nicht mehr verfügbar, weiterleitung für künfutgie Verbindungen erstellen");
        var fork = require('child_process').fork;
        var child = fork('./index.js'); // ersetzen durch forwarding script
        // TODO Daten vom ersten Server ziehen -> Ausfallsicherheit!
    }

    /**
     * Usernamen setzen für den Socket
     */
    socket.on('set username', function (username) {

        // Leerstring prüfen
        if (username.trim() === "") {
            socket.emit('set username', {
                'code': 401, 'msg': "Ihr Benutzername darf nicht leer sein", 'error': true
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
                'code': 409, 'msg': "conflict: name '" + username + "' existiert bereits", 'error': true
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
        // prüfen ob der Benutzer noch online ist
        // if (!gameserver.isUser(data)) {
        //     console.log(data + ' ist nicht mehr online');
        //     // TODO Anfragen Spieler benachrichtigen
        // } else {
        //     // Spieler noch online, Einladung anzeigen
        //     console.log(usernames[data] + ' wurde eingeladen von ' + user[socket.id].name);
        //     io.to(`${usernames[data]}`).emit('chat message', {
        //         msg: user[socket.id].name + " lädt dich ein  ",
        //         type: 'event',
        //         servertimestamp: Date.now()
        //     })
        // }
    });


    // Zeigt an ob jemand tipp, eventuell bessere Nachrichteb anzeigen lassen wie z.B.
    // $NAME tippt oder mehrere Leute tippen
    socket.on('typing', function (msg) {
        socket.broadcast.emit('typing', msg);
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
        console.log("[SERVER] '" + gameserver.getUsername(socket) + "' disconnected");
        let data = {
            "msg": gameserver.getUsername(socket) + " hat den Server verlassen",
            type: "event",
            servertimestamp: Date.now()
        };
        socket.broadcast.emit('chat message', data);

        gameserver.deleteUser(socket);

        // Benutzerliste updaten
        io.emit('user update', gameserver.getUsernames());
    });

});


/**
 * Starten des Servers
 */
function startServer() {

    http.listen(80, function () {
        console.log('listening on *:80');

    }).on('error', function () {
        console.log("Port belegt versuche Port 3000");
        http.listen(3000, function () {
            console.log('listening on *:3000');
            secondHost = true;

        }).on('error', function (data) {
            console.log("Beide Ports belegt, Prozess kann nicht benutzt werden.")
        });


    });


}

startServer();
