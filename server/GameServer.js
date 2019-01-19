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
        return this.user[socket.id].name;
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

    saveData() {

        let gamedata = {rooms: this.rooms, user: this.user, usernames: this.usernames, invites: this.invites};

        fs.writeFile("userdata.json", JSON.stringify(gamedata, null, 4), 'utf8', (err) => {
            if (err) throw err;
            console.log('The file has been saved!');
        });
    }

    changeId(oldId, username, newSocket) {
        this.usernames[username] = newSocket.id; // rebind username
        this.user[newSocket.id] = {"name": username}; // rebind user socket
        this.updateInviteId(oldId, newSocket.id); // Updaten der Einladung
        console.log("old", oldId);
        console.log("bound to", this.user[newSocket.id]);
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
            this.invites[socketIdSecond].splice($.inArray(socketIdFirst, this.invites[socketIdSecond]), 1);
        }

        this.saveData()
    }

    updateInviteId(oldid, newid) {
        // Updaten der erhalten Einladungen
        this.invites[newid] = oldid;
        delete this.invites[oldid];

        // Updaten der versendeten Einladungen
        for (let key in this.invites) {
            if (this.invites[key].includes(oldid)) {
                this.invites[key][this.invites[key].indexOf(oldid)] = newid;
            }
        }

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
    }


}

module.exports = new GameServer();