class Game {
    constructor(player1, player2) {

        this.player1 = player1;
        this.player2 = player2;

        this.activePlayer = player1;


    }

    whoseTurn() {
        this.activePlayer;
    }

}


class Battleships extends Game {

    constructor(player1, player2) {
        super(player1, player2)
    }
}

class TicTacToe extends Game {

    constructor(player1, player2) {
        super(player1, player2)
    }
}

module.exports = {
    Battleships,
    TicTacToe
};