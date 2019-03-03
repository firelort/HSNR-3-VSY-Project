class Game {
    constructor(player1, player2, io) {
        /*
        //copy construtor
        if (player1 && typeof player1 === 'object') {
            Object.assign(this, player1);
        } else {
            this.player = [player1, player2];
            this.playerTurn = 0; //playerTurn 0 = player1 1 = player2
            this.gameState = Game.GameState.PREPARATION;
            this.player1 = player1;
            this.player2 = player2;

            this.activePlayer = player1;
            // this.state = this.GameTypes.PREPARATION;
        }*/
        this.io = io;
        this.activePlayer = player1;
        this.gameState = Game.GameState.PREPARATION;
    }

    whoseTurn() {
        return this.activePlayer;
    }

    static get GameState() {
        return {
            PREPARATION: 0,
            ONGOING: 1,
            FINISHED: 2
        }
    }

}

module.exports = Game;