const fs = require('fs');
const Battleships = require('./Battleships');
const TicTacToe = require('./TicTacToe');


function log(data) {
    console.log(require('util').inspect(data, true, 10));
}


class GameServer {

    constructor(chat, io) {

        this.chat = chat;
        this.io = io;
        this.user = {};
        this.usernames = {};
        this.rooms = {};
        this.invites = {};
        this.GameTypes = {
            TICTACTOE: 1,
            BATTLESHIPS: 2
        };
        this.chat.setGameServer(this);
        this.initSocketListener();
        Object.freeze(this.GameTypes);

    }

    isUser(name) {
        return this.usernames.hasOwnProperty(name);
    }

    initSocketListener() {
        this.io.on('connection', (socket) => {


            socket.on('oldid', (oldid, username) => {
                console.log(oldid, username, socket.id);
                this.changeId(oldid, username, socket);
                socket.emit('newId', socket.id);
            });

            socket.on('invite player', (usernameSecond) => {
                usernameSecond = usernameSecond.toString();

                if (usernameSecond === this.getUsername(socket)) {

                    console.log('[EVENT-ERROR] ' + usernameSecond + ' hat sich selber eingeladen.');
                    this.chat.to(socket.id).event("Du kannst dich nicht selbst einladen.");

                    return false;
                }

                // prüfen ob der Benutzer noch online ist
                else if (!this.isUser(usernameSecond)) {

                    console.log('[EVENT-ERROR] ' + this.getUsername(socket) + ' hat versucht ' + usernameSecond + ' einzuladen, aber Account offline oder nicht vorhanden.');
                    this.chat.to(socket.id).event("Der Benutzer existiert nicht oder ist offline.");
                } else {
                    // Spieler noch online, Einladung anzeigen
                    console.log("[EVENT] " + usernameSecond + ' wurde eingeladen von ' + this.getUsername(socket));
                    this.createInvite(socket.id, usernameSecond);

                    this.io.to(`${this.getUser(usernameSecond)}`).emit('invite', {
                        gametype: 2,
                        gamename: "BATTLESHIPS",
                        user: this.getUsername(socket),
                        servertimestamp: Date.now()
                    })
                }
            });


            socket.on('set username', (username) => {


                // Leerstring prüfen
                if (username.trim() === "") {
                    socket.emit('set username', {
                        'code': 401, 'msg': "Dein Benutzername darf nicht leer sein", 'error': true
                    });
                    return false;
                }
                // existiert Benutzer bereits?
                if (!this.isUser(username)) {
                    // Username frei, Werte speichern und Erfolg melden
                    this.registerUser(username, socket);
                    console.log("[EVENT] '" + this.getUsername(socket) + "' ist dem server beigetreten");
                    socket.emit('set username', {
                        'code': 200, 'msg': "ok", 'error': false
                    });

                    // Andere über Beitritt des neuen Nutzers informieren
                    this.chat.broadcastEvent(this.getUsername(socket) + " ist dem server beigetreten");

                    // Benutzerliste updaten
                    this.io.emit('user update', this.getUsersInRooms());


                } else {
                    // Username exisitert, Fehler ausgeben
                    socket.emit('set username', {
                        'code': 409, 'msg': "Der Name '" + username + "' existiert bereits", 'error': true
                    });
                }


            });

            socket.on('reject invite', (user) => {
                // Test if the invite is valid
                if (this.isValidInvite(user, socket.id)) {
                    // Remove the invite from the list
                    this.cancelInvite(this.getUser(user), this.getUsername(socket));

                    this.chat.to(this.getUser(user)).event("Die Einladung an " + this.getUsername(socket) + " wurde abgelehnt.");
                    this.chat.to(socket.id).event("Die Einladung von " + user + " wurde abgelehnt.");
                }
            });


            // Spieler in einem Raum stecken
            socket.on('join room', (data) => {
                // Test if player one is in an room already
                if (this.isAlreadyInARoom(this.getUser(data.user))) {
                    this.chat.to(socket.id).event("Dein Gegner ist bereits in einem Spiel");
                    return;
                }

                // Test if player two is in an room already
                if (this.isAlreadyInARoom(socket.id)) {
                    this.chat.to(socket.id).event("Du bist bereits in einem Spiel und kannst deshalb die Einladung nicht annehmen");
                    return;
                }

                // Test if the invite is valid
                if (!this.isValidInvite(data.user, socket.id)) {
                    return;
                }
                // Create a new Room and let the user join
                let roomname = this.createRoom(data.user, socket.id, data.gametype);
                let game;
                if (data.gametype == 2) {
                    game = new Battleships(this.getUser(data.user), socket.id, this.io);
                } else if (data.gametype == 1) {
                    game = new TicTacToe(this.getUser(data.user), socket.id, this.io);
                }

                this.addGame(roomname, game);
                this.io.sockets.sockets[this.getUser(data.user)].join(roomname); // Player 1 joins the room
                socket.join(roomname); // Player 2 joins the room
                this.chat.to(roomname).message("Server", "Good Luck && Have fun");
                this.io.to(roomname).emit('start game battleships');
                //todo: maybe let the sockets save the room name

                // Delete both sockets from the invite obj.
                this.deleteInvitesFromSocketId(this.getUser(data.user));
                this.deleteInvitesFromSocketId(socket.id);

                // Benutzerliste updaten
                this.io.emit('user update', this.getUsersInRooms());
            });


        });
    }

    registerUser(username, socket) {
        this.usernames[username] = socket.id;
        this.user[socket.id] = {"name": username};
        this.saveData();
    }

    getUsername(socket) {
        return (this.user[socket.id]) ? this.user[socket.id].name : false;
    }

    getUser(name) {
        return this.usernames[name];
    }

    deleteUser(socket) {
        delete this.usernames[this.user[socket.id].name];
        delete this.user[socket.id];
        this.deleteInvitesFromSocketId(socket.id);
        this.saveData();
    }

    getUsernames() {
        return this.usernames;
    }

    getUsers() {
        return this.user;
    }

    saveData() {
        let gamedata = {rooms: this.rooms, user: this.user, usernames: this.usernames, invites: this.invites};
        fs.writeFileSync("userdata.json", JSON.stringify(gamedata, null, 4), 'utf8');
        fs.writeFileSync("userdata_rec.json", JSON.stringify(gamedata, null, 4), 'utf8');
    }

    readData() {
        let data
        try {
            data = fs.readFileSync("userdata.json");
        } catch (e) {
            data = fs.readFileSync("userdata_rec.json");
        } finally {
            console.log("No files available");
        }
        data = JSON.parse(data);
        this.invites = data.invites;
        this.rooms = data.rooms;
        this.usernames = data.usernames;
        this.user = data.user;

        // console.log(this);
    }

    restoreFromFiles() {
        this.readData();
        for (let roomname in this.rooms) {
            console.log(typeof this.rooms[roomname].game.constructor.name);
            let roomData = roomname.split('::');
            if (roomData[0] == '2') {
                this.rooms[roomname].game = Object.assign(new Battleships(roomData[1], roomData[2], this.io), this.rooms[roomname].game)
            }

            this.rooms[roomname].game.setGameServer(this);
            console.log(this.rooms[roomname].game.constructor.name);
            console.log(this.rooms[roomname].game.players);
        }
    }

    changeId(oldId, username, newSocket) {
        if (oldId == newSocket.id || this.usernames[username] == newSocket.id) return false;
        this.usernames[username] = newSocket.id; // rebind username
        this.user[newSocket.id] = {...this.user[oldId]}; // rebind user socket
        delete this.user[oldId];
        this.updateInviteId(oldId, newSocket.id); // Updaten der Einladung
        //todo updaten der Räume???

        if (this.user[newSocket.id].room) {
            let oldroomname = this.user[newSocket.id].room;
            let roomData = oldroomname.split('::');
            let isPlayerOne = roomData[1] == oldId;
            let newRoomName;
            if (isPlayerOne) {
                newRoomName = roomData[0] + '::' + newSocket.id + '::' + roomData[2];
                this.rooms[oldroomname].firstplayer = newSocket.id;
                this.user[roomData[2]].room = newRoomName;
            } else {
                newRoomName = roomData[0] + '::' + roomData[1] + '::' + newSocket.id;
                this.rooms[oldroomname].secondplayer = newSocket.id;

                this.user[roomData[1]].room = newRoomName;
            }
            console.log("pre join", this.io.sockets.adapter.rooms);

            this.user[newSocket.id].room = newRoomName;


            this.rooms[oldroomname].game.changeId(oldId, newSocket.id, newRoomName);

            this.rooms[oldroomname].id = newRoomName;
            this.rooms[newRoomName] = {...this.rooms[oldroomname]};

            console.log('oldroomname', oldroomname);
            let gameroom = this.io.sockets.connected;
           // console.log("gameroom", gameroom);
            Object.keys(this.rooms[oldroomname].game.players).forEach((element) => {
                console.log("id", element);
                let socket = gameroom[element];
                if (socket) {
                    socket.join(newRoomName);
                    socket.leave(oldroomname);
                }
            });

            console.log("post join", this.io.sockets.adapter.rooms);
            delete this.rooms[oldroomname];


        }
        //this.deleteUser({id: oldId});
        this.initSocketListener();
        this.saveData();
    }

    createInvite(socketIdFirst, usernameSecond) {
        let socketIdSecond = this.getUser(usernameSecond);

        if (Array.isArray(this.invites[socketIdSecond])) {
            if (!this.invites[socketIdSecond].includes(socketIdFirst)) {
                this.invites[socketIdSecond].push(socketIdFirst);
            }
        } else {
            this.invites[socketIdSecond] = [socketIdFirst];
        }

        this.saveData()
    }

    cancelInvite(socketIdFirst, usernameSecond) {
        let socketIdSecond = this.getUser(usernameSecond);

        if (this.invites[socketIdSecond].includes(socketIdFirst)) {
            this.invites[socketIdSecond].splice(this.invites[socketIdSecond].indexOf(socketIdFirst), 1);
        }

        this.saveData()
    }

    updateInviteId(oldid, newid) {
        // Updaten der erhalten Einladungen
        if (oldid in this.invites) {
            this.invites[newid] = this.invites[oldid];
            delete this.invites[oldid];
        }

        // Updaten der versendeten Einladungen
        for (let key in this.invites) {
            if (this.invites[key].includes(oldid)) {
                this.invites[key][this.invites[key].indexOf(oldid)] = newid;
            }
        }

    }

    getUsersInRooms() {
        let rooms = {"lobby": []};
        for (let key in this.user) {
            if (this.user[key].room) {
                if (!rooms.hasOwnProperty(this.user[key].room))
                    rooms[this.user[key].room] = [];
                rooms[this.user[key].room].push(this.user[key]);
            } else {
                rooms.lobby.push(this.user[key]);
            }
        }
        return rooms;
    }

    deleteInvitesFromSocketId(id) {
        // Löschen der bekommen Einladungen
        delete this.invites[id];

        // Löschen der versendeten Einladungen
        for (let key in this.invites) {
            if (this.invites[key].includes(id)) {
                this.invites[key].splice(this.invites[key].indexOf(id), 1);
            }
        }

        this.saveData();
    }

    isValidInvite(usernameFirst, socketIdSecond) {
        return this.invites[socketIdSecond].includes(this.getUser(usernameFirst));
    }

    addGame(roomname, game) {
        game.setGameServer(this);
        this.rooms[roomname].game = game;

        this.saveData();
    }

    getGame(roomname) {
        return this.rooms[roomname].game;
    }

    getRoomByUser(socketId) {
        return (this.user[socketId].room) ? this.rooms[this.user[socketId].room] : false;
    }

    createRoom(usernameFirst, socketIdSecond, gameType) {
        let socketIdFirst = this.getUser(usernameFirst);

        let roomname = gameType + "::" + socketIdFirst + "::" + socketIdSecond;


        this.rooms[roomname] = {
            id: roomname,
            gametype: gameType,
            firstplayer: socketIdFirst,
            secondplayer: socketIdSecond
        };

        this.user[socketIdFirst].room = roomname;
        this.user[socketIdSecond].room = roomname;

        this.saveData();

        return roomname
    }

    isAlreadyInARoom(socketid) {
        let roomArray = Object.keys(this.rooms);
        let entry;
        for (let index = 0; index < roomArray.length; index++) {
            entry = roomArray[index];
            if (entry.includes(socketid)) {
                return true;
            }
        }
        return false;
    }

    disbandRoom(socketid) {
        let roomName = this.user[socketid].room;
        this.io.sockets.sockets[socketid].leave(roomName); //pyhsikalisch all done!

        if(Object.keys(this.rooms).includes(roomName)) {
            delete this.rooms[roomName].game.players;
            delete this.rooms[roomName].game;
            delete this.rooms[roomName];
        }
        delete this.user[socketid].room;

        this.saveData();
    }
}

module.exports = GameServer;