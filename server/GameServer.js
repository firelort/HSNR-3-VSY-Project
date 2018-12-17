
class GameServer {

    constructor(){
        this.user = {};
        this.usernames = {}

    }

    speak(){
        console.log("still works");
    }

    isUser(name){
        return this.usernames.hasOwnProperty(name);
    }
}

module.exports = new GameServer();