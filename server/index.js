var express = require('express');
var path = require('path');
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var secondHost = false;
var GameServer = require("./GameServer.js");
var Battleships = require("./Battleships.js");
var TicTacToe = require("./TicTacToe.js");
var Chat = require("./Chat.js");


function log(data) {
    console.log(require('util').inspect(data, true, 10));
}

let chat = new Chat(io);

let gameserver = new GameServer(chat, io);

const clientPath = path.resolve(path.dirname(require.main.filename) + '/../client/');
app.use(express.static(clientPath));
app.get('/', function (req, res) {
    res.sendFile(clientPath + 'index.html');
});
var donethis = false;

io.on('connection', function (socket) {
    chat.setSocket(socket);
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
        gameserver.readData();
    }

    /**
     * Usernamen setzen für den Socket
     */






    // Spieler zu einem Spiel einladen


    // Beim schließen der Verbindung eine Meldung an andere Nutzer senden und Spieler aus Listen entfernen
    socket.on('disconnect', function () {
        //Testen, ob Benutzer angemeldet war, ob er existiert hat
        try {

            let username = gameserver.getUsername(socket);
            if (username) {


                console.log("[SERVER] '" + username + "' disconnected");
                chat.broadcastEvent(username + " hat den Server verlassen");

                if (gameserver.isAlreadyInARoom(socket.id)) {
                    let roomData = gameserver.disbandRoom(socket.id);

                    // Notify the other user
                    let notifySocket;
                    if (roomData.firstplayer === socket.id) {
                        notifySocket = roomData.secondplayer;
                    } else {
                        notifySocket = roomData.firstplayer;
                    }
                    chat.to(notifySocket).event("Dein Gegenspieler hat den Raum verlassen");
                    gameserver.disbandRoom(notifySocket);

                    //Let the other player leave the room
                    io.sockets.sockets[notifySocket].leave(roomData.roomname);
                }
                gameserver.deleteUser(socket);

                // Benutzerliste updaten
                io.emit('user update', gameserver.getUsersInRooms());
            }
        } catch (e) {
            console.log("[SERVER] Ein unbekannter Fehler ist aufgetreten.");
            console.log(e);
        }
    });
});


/**
 * Starten des Servers
 */
function startServer() {
    var ports = [80, 3000];
    var i = 0;

    http.on('error', function () {
        if (i < ports.length - 1) {
            i += 1;
            console.log("Port " + ports[i - 1] + " belegt, versuche " + ports[i] + ".");
            http.listen(ports[i]);
            secondHost = true
        } else {
            console.log("Port " + ports[i] + " belegt, es gibt keinen weiteren Port.");
        }
    });

    http.listen(ports[i], function () {
        console.log("listening on *:" + ports[i]);
    });
}

startServer();