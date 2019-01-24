class Game {
    constructor(player1, player2) {

        if (player1 && typeof player1 === 'object') {
            Object.assign(this, player1);
        } else {
            this.player1 = player1;
            this.player2 = player2;

            this.activePlayer = player1;
        }

    }

    whoseTurn() {
        this.activePlayer;
    }

}


class Battleships extends Game {

    constructor(player1, player2) {
        super(player1, player2);
        this.player1Field = [...Array(10)].map(x => Array(10).fill(Battleships.FieldType.EMPTY));
        this.player2Field = [...Array(10)].map(x => Array(10).fill(Battleships.FieldType.EMPTY));

        this.player1Field[0][0] = Battleships.FieldType.SHIP_UNDAMAGED;
        this.player1Field[0][1] = Battleships.FieldType.SHIP_UNDAMAGED;
        this.player1Field[0][2] = Battleships.FieldType.SHIP_UNDAMAGED;
        this.player1Field[0][3] = Battleships.FieldType.SHIP_DAMAGED;
        this.player1Field[0][4] = Battleships.FieldType.MISSED_SHOT;


    }

    static get FieldType() {
        return {
            EMPTY: 0,
            UNKNOWN: 0,
            SHIP_UNDAMAGED: 1,
            SHIP_DAMAGED: 2,
            MISSED_SHOT: -1
        }
    }

    /**
     * Gibt das verschleierte Feld des Spielers zurück. Alle Felder die den Typ SHIP_UNDAMAGED enthalten werden durch
     * den Typ UNKNOWN ersetzt.
     *
     * @param playerId Ids des Spielers des Feld zurückgeben werden soll.
     * @returns boolean|number[10][10] Das verschleierte Feld.
     */
    getObfuscatedField(playerId) {

        let obfuscatedField;
        if (playerId === this.player1) {
            obfuscatedField = this.player1Field.map(rows => rows.map(fieldType => (fieldType === Battleships.FieldType.SHIP_UNDAMAGED) ? Battleships.FieldType.UNKNOWN : fieldType));
        } else if (playerId === this.player2) {
            obfuscatedField = this.player2Field.map(rows => rows.map(fieldType => (fieldType === Battleships.FieldType.SHIP_UNDAMAGED) ? Battleships.FieldType.UNKNOWN : fieldType));
        } else {
            obfuscatedField = false
        }

        return obfuscatedField;


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