const fs = require('fs');

class GameServer {

    constructor() {
        this.user = {};
        this.usernames = {};
        this.rooms = {};
        this.invites = {};
        this.GameTypes = {
            TICTACTOE: 1,
            BATTLESHIPS: 2
        };
        Object.freeze(this.GameTypes);

    }

    isUser(name) {
        return this.usernames.hasOwnProperty(name);
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
    }

    readData() {
        let data = fs.readFileSync("userdata.json");
        data = JSON.parse(data);
        this.invites = data.invites;
        this.rooms = data.rooms;
        this.usernames = data.usernames;
        this.user = data.user;

        // console.log(this);
    }

    changeId(oldId, username, newSocket) {
        this.usernames[username] = newSocket.id; // rebind username
        this.user[newSocket.id] = {"name": username}; // rebind user socket
        this.updateInviteId(oldId, newSocket.id); // Updaten der Einladung
        this.deleteUser({id: oldId});
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
        this.rooms[roomname].game = game;
        this.saveData();
    }

    getGame(roomname){
        return this.rooms[roomname].game;
    }

    getRoomByUser(socketId) {
        return (this.user[socketId].room) ? this.rooms[this.user[socketId].room] : false;
    }

    createRoom(usernameFirst, socketIdSecond, gameType) {
        let socketIdFirst = this.getUser(usernameFirst);

        let roomname = gameType + "::" + socketIdFirst + "::" + socketIdSecond;


        this.rooms[roomname] = {
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
        console.log(roomArray);
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
        delete this.user[socketid].room;
        let rooms = Object.keys(this.rooms);
        let entry;
        for (let index = 0; index < rooms.length; index++) {
            entry = rooms[index];
            if (entry.includes(socketid)) {
                let data = this.rooms[entry];
                delete this.rooms[entry];
                data.roomname = entry;
                return data;
            }
        }

        this.saveData();
    }
}

module.exports = new GameServer();