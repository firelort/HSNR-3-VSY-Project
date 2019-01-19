const fs = require('fs');

class GameServer {

    constructor() {
        this.user = {};
        this.usernames = {};
        this.rooms = {};
        this.invite = {};
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
        this.saveData();
    }

    getUsernames() {
        return this.usernames;
    }

    saveData() {

        let gamedata = {rooms: this.rooms, user: this.user, usernames: this.usernames};

        fs.writeFile("userdata.json", JSON.stringify(gamedata, null, 4), 'utf8', (err) => {
            if (err) throw err;
            console.log('The file has been saved!');
        });
    }

    changeId(oldId, username, newSocket) {
        this.usernames[username] = newSocket.id; // rebind username
        this.user[newSocket.id] = {"name": username}; // rebind user socket
        console.log("old", oldId);
        console.log("bound to", this.user[newSocket.id]);
        this.saveData();
    }

    createRoom() {

    }

    createInvite(firstPlayerSocket, secondPlayerUsername) {
        let secondSocket = this.getUser(secondPlayerUsername);
        if (secondSocket !== firstPlayerSocket.id) {
            if (this.invite[secondSocket] === undefined) {
                this.invite[secondSocket] = [firstPlayerSocket.id]
            } else {
                this.invite[secondSocket].push(firstPlayerSocket.id);
            }

        }
    }

    cancelInvite(firstPlayerSocket, asdf) {
        
    }
    
    updateInviteOldId(oldId, newId) {
        this.invite[newId] = this.invite[oldId];
        // Updaten der ID auch in den versendeten Einladungen
    }
    
    updateInvite(firstPlayerSocket, secondPlayerUsername) {

    }

    deleteInvites(socketid) {
        delete this.invite[socketid]
    }

}

module.exports = new GameServer();