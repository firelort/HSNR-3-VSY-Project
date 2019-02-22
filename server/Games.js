class Game {
    constructor(player1, player2) {

        //copy construtor
        if (player1 && typeof player1 === 'object') {
            Object.assign(this, player1);
        } else {
            this.player1 = player1;
            this.player2 = player2;

            this.activePlayer = player1;
            // this.state = this.GameTypes.PREPARATION;
        }

    }

    whoseTurn() {
        this.activePlayer;
    }

    static get GameState() {
        return {
            PREPARATION: 0,
            ONGOING: 1,
            FINISHED: 2
        }
    }

}


class Battleships extends Game {

    constructor(player1, player2) {
        super(player1, player2);
        // Fill 10x10 Arrays with Battleships.FieldType.EMPTY
        this.player1Field = [...Array(10)].map(x => Array(10).fill(Battleships.FieldType.EMPTY));
        this.player2Field = [...Array(10)].map(x => Array(10).fill(Battleships.FieldType.EMPTY));

        this.player1Field[0][0] = Battleships.FieldType.SHIP_UNDAMAGED;
        this.player1Field[0][1] = Battleships.FieldType.SHIP_UNDAMAGED;
        this.player1Field[0][2] = Battleships.FieldType.SHIP_UNDAMAGED;
        this.player1Field[0][3] = Battleships.FieldType.SHIP_DAMAGED;
        this.player1Field[0][4] = Battleships.FieldType.MISSED_SHOT;
        this.player1Field[5][7] = Battleships.FieldType.SELECTED;


    }

    static get FieldType() {
        return {
            EMPTY: 0,
            UNKNOWN: 0,
            SHIP_UNDAMAGED: 1,
            SHIP_DAMAGED: 2,
            SELECTED: 3,
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

    _touchesShip(coordinates, playerId) {
        let field = (playerId == this.player1) ? this.player1Field : this.player2Field;

        return (field[coordinates.row - 1] && field[coordinates.row - 1][coordinates.column] === Battleships.FieldType.SHIP_UNDAMAGED) // top
            || (field[coordinates.row][coordinates.column + 1] && field[coordinates.row][coordinates.column + 1] === Battleships.FieldType.SHIP_UNDAMAGED) // right
            || (field[coordinates.row + 1] && field[coordinates.row + 1][coordinates.column] === Battleships.FieldType.SHIP_UNDAMAGED) // bottom
            || (field[coordinates.row][coordinates.column - 1] && field[coordinates.row][coordinates.column - 1] === Battleships.FieldType.SHIP_UNDAMAGED) // left

    }


    _setPathActive(start, end, field) {

        let startRow, startColumn, endRow, endColumn;
        // let rows = $('.game-player-container .player-field tr');
        if (start.row === end.row && start.column !== end.column) { // horizontal
            startColumn = (start.column > end.column ? end.column : start.column);
            endColumn = (start.column < end.column ? end.column : start.column);
            for (let i = startColumn; i <= endColumn; i++) {
                field[start.row][i] = Battleships.FieldType.SHIP_UNDAMAGED;
                //rows.eq(start.row).find('td').eq(i).addClass('active');
            }
        } else if (start.row !== end.row && start.column === end.column) { // senkrecht
            startRow = (start.row > end.row ? end.row : start.row);
            endRow = (start.row < end.row ? end.row : start.row);
            for (let i = startRow; i <= endRow; i++) {
                field[i][start.column] = Battleships.FieldType.SHIP_UNDAMAGED;
                //rows.eq(i).find('td').eq(start.column).addClass('active');
            }
        }

    }

    _getShipLength(start, end) {
        if ((start.row === end.row && start.column !== end.column))
            return Math.abs(start.column - end.column) + 1;
        else
            return Math.abs(start.row - end.row) + 1;
    }

    _isPathAvailable(start, end, field) {

        let isFree = true;
        let startRow, startColumn, endRow, endColumn;

        if (start.row === end.row && start.column !== end.column) { // horizontal
            startColumn = (start.column > end.column ? end.column : start.column);
            endColumn = (start.column < end.column ? end.column : start.column);
            for (let i = startColumn; i <= endColumn && (isFree); i++) {
                isFree = !this._touchesShip({row: start.row, column: i}, field);
            }
        } else if (start.row !== end.row && start.column === end.column) { // senkrecht
            startRow = (start.row > end.row ? end.row : start.row);
            endRow = (start.row < end.row ? end.row : start.row);
            for (let i = startRow; i <= endRow && (isFree); i++) {
                isFree = !this._touchesShip({row: i, column: start.column}, field);
            }
        }

        return isFree;
    }

    _isInLine(start, end) {
        return (start.row === end.row && start.column !== end.column) || (start.column === end.column && start.row !== end.row)

    }

    positionShip(position, playerId) {


        let field = (playerId == this.player1) ? this.player1Field : this.player2Field;
        //console.log(field);
        let startPosition = {row: -1, column: -1};
        startPosition.row = field.findIndex(row => {
            startPosition.column = row.findIndex(value => value === 3);
            return startPosition.column !== -1;
        });
        console.log(startPosition);
        let hasStartPosition = (startPosition.row !== -1 && startPosition.column !== -1);
        console.log("has start", hasStartPosition);
        if (this._touchesShip(position, playerId)) {
            return "Dein Auswahlfeld darf kein anderes Schiff berühren."
        } else {
            let clickedCellValue = field[position.row][position.column];


            if (clickedCellValue != Battleships.FieldType.EMPTY) {
                return "Dieses Feld ist bereits belegt.";
            }
            if (!hasStartPosition) {
                field[position.row][position.column] = Battleships.FieldType.SELECTED;
                return {...position, type: Battleships.FieldType.SELECTED};
            } else {
                //let startCell = $('.game-player-container .player-field tr').eq(startPosition.row).find('td').eq(startPosition.column);
                if (this._isInLine(startPosition, position)) {

                    // if (isLengthAvailable(getShipLength(startPosition, position))) {
                    if (this._isPathAvailable(startPosition, position, field)) {

                        //console.log(reduceShipCounter(getShipLength(startPosition, position)));
                        this._setPathActive(startPosition, position, field);
                        return {start: startPosition, end: position, type: Battleships.FieldType.SHIP_UNDAMAGED};

                    } else {
                        return "Zwischen den Koordinaten befinden sich Felder die nicht besetzt werden können.";
                    }
                    // } else {
                    //     //length not available oy
                    //     $('.player-field .highlighted').removeClass('highlighted');
                    //     let item = $('<li>');
                    //     item.addClass('message');
                    //     item.html("<i>Game: Du hast kein Schiff in dieser Länge</i>");
                    //     $('#messages').append(item);
                    // }
                }
            }

        }
        //return (errorMessage) ? errorMessage : true;
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