var Game = require("./Game");

class Battleships extends Game {

    constructor(player1, player2) {
        super(player1, player2);
        this.players = {};
        this.players[player1] = {
            "id": player1,
            "field": [...Array(10)].map(x => Array(10).fill(Battleships.FieldType.EMPTY)), // Fill 10x10 Arrays with Battleships.FieldType.EMPTY
            "shipsInStock": {
                5: 1,
                4: 2,
                3: 3,
                2: 4
            },
            "shipsInStockCount": 10,
            "state": Battleships.StateType.PLACING
        };

        this.players[player2] = {
            "id": player2,
            "field": [...Array(10)].map(x => Array(10).fill(Battleships.FieldType.EMPTY)), // Fill 10x10 Arrays with Battleships.FieldType.EMPTY
            "shipsInStock": {
                5: 1,
                4: 2,
                3: 3,
                2: 4
            },
            "shipsInStockCount": 10,
            "state": Battleships.StateType.PLACING
        };

    };

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

    static get StateType() {
        return {
            PLAYING: 1,
            WAITING: 2,
            PLACING: 3,
            READY: 4
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
        let field = this.players[playerId].field.map(rows => rows.map(fieldType => (fieldType === Battleships.FieldType.SHIP_UNDAMAGED) ? Battleships.FieldType.UNKNOWN : fieldType));

        return field;
    }

    _isLengthAvailable(length, playerId) {
        return this.players[playerId].shipsInStock[length] > 0;
    }

    _touchesShip(coordinates, field) {
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
            for (let i = startColumn; i <= endColumn && isFree; i++) {
                isFree = !this._touchesShip({row: start.row, column: i}, field);
            }
        } else if (start.row !== end.row && start.column === end.column) { // senkrecht
            startRow = (start.row > end.row ? end.row : start.row);
            endRow = (start.row < end.row ? end.row : start.row);
            for (let i = startRow; i <= endRow && isFree; i++) {
                isFree = !this._touchesShip({row: i, column: start.column}, field);
            }
        }

        return isFree;
    }

    _isInLine(start, end) {
        return (start.row === end.row && start.column !== end.column) || (start.column === end.column && start.row !== end.row)
    }

    _reduceShipCounter(length, playerId) {
        this.players[playerId].shipsInStock[length]--;
    }

    positionShip(position, playerId) {
        let field = this.players[playerId].field;
        //console.log(field);
        let startPosition = {row: -1, column: -1};
        startPosition.row = field.findIndex(row => {
            startPosition.column = row.findIndex(value => value === 3);
            return startPosition.column !== -1;
        });
        console.log(startPosition);
        let hasStartPosition = (startPosition.row !== -1 && startPosition.column !== -1);
        console.log("has start", hasStartPosition);
        if (this._touchesShip(position, field)) {
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

                    let shipLength = this._getShipLength(startPosition, position);
                    if (this._isLengthAvailable(shipLength, playerId)) {
                        if (this._isPathAvailable(startPosition, position, field)) {

                            this._reduceShipCounter(shipLength, playerId);
                            this._setPathActive(startPosition, position, field);
                            return {
                                start: startPosition,
                                end: position,
                                type: Battleships.FieldType.SHIP_UNDAMAGED,
                                reduceCounter: shipLength
                            };

                        } else {
                            return "Zwischen den Koordinaten befinden sich Felder die nicht besetzt werden können.";
                        }
                    } else {
                        //length not available oy
                        return "Du hast kein Schiff in dieser Länge.";
                    }
                }
            }

        }
        //return (errorMessage) ? errorMessage : true;
    }

}

module.exports = Battleships;