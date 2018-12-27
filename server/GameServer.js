class GameServer {

    constructor() {
        this.user = {};
        this.usernames = {};
        this.rooms = {};
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
    }

    getUsername(socket) {
        return this.user[socket.id].name;
    }

    getUser(name){
        return this.usernames[name];
    }

    deleteUser(socket) {
        delete this.usernames[this.user[socket.id].name];
        delete this.user[socket.id];
    }

    getUsernames() {
        return this.usernames;
    }
}

module.exports = new GameServer();