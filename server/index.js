var express = require('express');
var path = require('path');
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var secondHost = false;
var gameserver = require("./GameServer.js");
var games = require("./Games.js");

function log(data) {
    console.log(require('util').inspect(data, true, 10));
}

class Chat {

    /**
     * Setzt Socket.io Instanz als Member zur Verwaltung der Nachrichten
     * @param io Socket.io Instanz
     */
    constructor(io) {
        this.io = io;

    }

    /**
     * Sendet eine Nachricht an Chat-Teilnehmer. Sollte vorher mit <code>.to</code> eine ID oder ein Raum
     * festgelegt worden sein wird die Nachricht geflüstert.
     * @param sender Name des Senders
     * @param message Die Nachricht des Senders
     */
    message(sender, message) {
        // whisper to room/person
        if (this._to !== null && this._to !== undefined) {
            io.to(`${this._to}`).emit('chat message', {
                msg: message,
                type: "message",
                name: sender,
                servertimestamp: Date.now()
            });
            this._to = null;
        } else {
            //Talk to everyone
            this.io.emit('chat message', {
                msg: message,
                type: "message",
                name: sender,
                servertimestamp: Date.now()
            });
        }
    }

    /**
     * Sendet eine Event Nachricht an Chat-Teilnehmer. Sollte vorher mit <code>.to</code> eine ID oder ein Raum
     * festgelegt worden sein wird die Nachricht geflüstert.
     * @param message Der Text des Events
     */
    event(message) {
        // whisper to room/person
        if (this._to !== null && this._to !== undefined) {
            io.to(`${this._to}`).emit('chat message', {
                msg: message,
                type: "event",
                servertimestamp: Date.now()
            });
            this._to = null;
        } else {
            //Talk to everyone
            this.io.emit('chat message', {
                msg: message,
                type: "event",
                servertimestamp: Date.now()
            });
        }
    }

    /**
     * Setzt den Socket zum korrekten Senden der Nachrichten.
     * @param socket Socket.io Socket der aktuellen Verbindung
     */
    setSocket(socket) {
        this.socket = socket;
    }

    /**
     * Setzt den/die Empfänger für die nächste Nachricht/das Nächste Event
     * @param id Socket- oder Raum-Id
     * @returns {Chat}
     */
    to(id) {
        this._to = id;
        return this;
    }

    /**
     * Sendet eine Nachricht an alle ausser dem Absender
     * @param sender Name des Senders
     * @param message Die Nachricht des Senders
     */
    broadcast(sender, message) {
        this.socket.broadcast.emit('chat message', {
            msg: message,
            type: "message",
            name: sender,
            servertimestamp: Date.now()
        });
    }

    /**
     * Sendet eine Event Nachricht an alle ausser dem Absender
     * @param message der Text des Events
     */
    broadcastEvent(message) {
        this.socket.broadcast.emit('chat message', {
            msg: message,
            type: "event",
            servertimestamp: Date.now()
        });
    }

}

let chat = new Chat(io);

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
            chat.broadcastEvent(gameserver.getUsername(socket) + " ist dem server beigetreten");

            // Benutzerliste updaten
            io.emit('user update', gameserver.getUsersInRooms());


        } else {
            // Username exisitert, Fehler ausgeben
            socket.emit('set username', {
                'code': 409, 'msg': "Der Name '" + username + "' existiert bereits", 'error': true
            });
        }


    });

    socket.on('oldid', function (oldid, username) {
        console.log(oldid, username, socket.id);
        gameserver.changeId(oldid, username, socket);
    });

    // Gegenspieler mitteilen welches Feld gespielt wurde
    // TODO für verschiedene Spiele anpassen
    socket.on('game move', function (data) {
        console.log("[EVENT] " + gameserver.getUsername(socket) + " machte move:  " + data.row + ":" + data.column)

        log(gameserver.getRoomByUser(socket.id));


        socket.broadcast.emit('accepted game move', {
            msg: gameserver.getUsername(socket) + " machte move:  " + data.row + ":" + data.column,
            type: 'event',
            servertimestamp: Date.now(),
            move: data
        });


    });

    socket.on('battleships game move', function (coordinates, callback) {
        console.log("[EVENT] " + gameserver.getUsername(socket) + " machte move:  " + coordinates.row + ":" + coordinates.column)

        //log(gameserver.getRoomByUser(socket.id));
        let game = gameserver.getRoomByUser(socket.id).game;
        if (game !== undefined) {
            //console.log(game.positionShip(coordinates, socket.id));
            let moveResult = game.positionShip(coordinates, socket.id);

            if (typeof moveResult === 'string') {
                console.log(chat);

                chat.to(socket.id).event(moveResult);
            } else if (typeof moveResult === 'object') {
                gameserver.saveData();
                callback(moveResult);
            } else {
                console.log("[ERROR] battleships game move gab kein gültiges ergebnis ");
            }
            console.log(game.player1Field, game.player2Field);


        } else {
            chat.to(socket.id).event("Das Spiel hat noch nicht angefangen");
        }
    });

    // Spieler zu einem Spiel einladen
    socket.on('invite player', function (usernameSecond) {
        usernameSecond = usernameSecond.toString();

        if (usernameSecond === gameserver.getUsername(socket)) {

            console.log('[EVENT-ERROR] ' + usernameSecond + ' hat sich selber eingeladen.');
            chat.to(socket.id).event("Du kannst dich nicht selbst einladen.");

            return false;
        }

        // prüfen ob der Benutzer noch online ist
        else if (!gameserver.isUser(usernameSecond)) {

            console.log('[EVENT-ERROR] ' + gameserver.getUsername(socket) + ' hat versucht ' + usernameSecond + ' einzuladen, aber Account offline oder nicht vorhanden.');
            chat.to(socket.id).event("Der Benutzer existiert nicht oder ist offline.");
        } else {
            // Spieler noch online, Einladung anzeigen
            console.log("[EVENT] " + usernameSecond + ' wurde eingeladen von ' + gameserver.getUsername(socket));
            gameserver.createInvite(socket.id, usernameSecond);

            io.to(`${gameserver.getUser(usernameSecond)}`).emit('invite', {
                gametype: 2,
                gamename: "BATTLESHIPS",
                user: gameserver.getUsername(socket),
                servertimestamp: Date.now()
            })
        }
    });

    // Spieler in einem Raum stecken
    socket.on('join room', function (data) {
        // Test if player one is in an room already
        if (gameserver.isAlreadyInARoom(gameserver.getUser(data.user))) {
            chat.to(socket.id).event("Dein Gegner ist bereits in einem Spiel");
            return;
        }

        // Test if player two is in an room already
        if (gameserver.isAlreadyInARoom(socket.id)) {
            chat.to(socket.id).event("Du bist bereits in einem Spiel und kannst deshalb die Einladung nicht annehmen");
            return;
        }

        // Test if the invite is valid
        if (!gameserver.isValidInvite(data.user, socket.id)) {
            return;
        }
        // Create a new Room and let the user join
        let roomname = gameserver.createRoom(data.user, socket.id, data.gametype);
        let game;
        if (data.gametype == 2) {
            game = new games.Battleships(gameserver.getUser(data.user), socket.id);
        } else if (data.gametype == 1) {
            game = new games.TicTacToe(gameserver.getUser(data.user), socket.id);
        }

        gameserver.addGame(roomname, game);
        io.sockets.sockets[gameserver.getUser(data.user)].join(roomname); // Player 1 joins the room
        socket.join(roomname); // Player 2 joins the room
        chat.to(roomname).message("Server", "Good Luck && Have fun");

        //todo: maybe let the sockets save the room name

        // Delete both sockets from the invite obj.
        gameserver.deleteInvitesFromSocketId(gameserver.getUser(data.user));
        gameserver.deleteInvitesFromSocketId(socket.id);

        // Benutzerliste updaten
        io.emit('user update', gameserver.getUsersInRooms());
    });

    socket.on('reject invite', function (data) {
        // Test if the invite is valid
        if (gameserver.isValidInvite(data.user, socket.id)) {
            // Remove the invite from the list
            gameserver.cancelInvite(gameserver.getUser(data.user), gameserver.getUsername(socket));

            chat.to(gameserver.getUser(data.user)).event("Die Einladung an " + gameserver.getUsername(socket) + " wurde abgelehnt.");
            chat.to(socket.id).event("Die Einladung von " + data.user + " wurde abgelehnt.");
        }
    });


    // Chatnachricht senden
    socket.on('chat message', function (data) {
        // Leerstring ignorieren
        if (data.msg.trim() === "") return false;
        console.log("[CHAT] " + gameserver.getUsername(socket) + ": " + data.msg);
        chat.message(gameserver.getUsername(socket), data.msg);
    });


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