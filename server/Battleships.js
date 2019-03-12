var Game = require("./Game");
var util = require('util');

class Battleships extends Game {

    constructor(player1, player2, io) {
        super(player1, player2, io);


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
            "undamagesShipFields": 0,
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
            "undamagesShipFields": 0,
            "state": Battleships.StateType.PLACING
        };

        Object.keys(this.players[player1].shipsInStock).forEach(element => {
            this.players[player1].undamagesShipFields += this.players[player1].shipsInStock[element] * element;
        });

        this.players[player2].undamagesShipFields = this.players[player1].undamagesShipFields;
        this.roomname = "2::" + player1 + "::" + player2;

        if (Object.keys(this.io.sockets.sockets).includes(player1) || Object.keys(this.io.sockets.sockets).includes(player2)) {
            this.io.sockets.sockets[player1].join(this.roomname);
            this.io.sockets.sockets[player2].join(this.roomname);
            this.initSocketListener();
        }
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

    setGameServer(gameserver) {
        this.gameserver = gameserver;
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
        this.players[playerId].shipsInStockCount--;
    }

    positionShip(position, playerId) {

        let field = this.players[playerId].field;
        let startPosition = {row: -1, column: -1};
        startPosition.row = field.findIndex(row => {
            startPosition.column = row.findIndex(value => value === 3);
            return startPosition.column !== -1;
        });
        //console.log(startPosition);
        let hasStartPosition = (startPosition.row !== -1 && startPosition.column !== -1);
        //console.log("has start", hasStartPosition);


        if (startPosition.row === position.row && startPosition.column === position.column) {
            field[position.row][position.column] = Battleships.FieldType.EMPTY;
            return {...position, type: Battleships.FieldType.EMPTY};
        }

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
                            if (this.players[playerId].shipsInStockCount === 0 && this.players[playerId].state === Battleships.StateType.PLACING) {
                                this.players[playerId].state = Battleships.StateType.READY;
                                if (this.players[this.getOpponentId(playerId)].state === Battleships.StateType.READY) {
                                    this.players[this.getOpponentId(playerId)].state = Battleships.StateType.PLAYING;
                                    this.players[playerId].state = Battleships.StateType.PLAYING;
                                }

                                this.io.to(this.roomname).emit('battleships player change state', playerId, Battleships.StateType.READY, this.gameserver.getUsername({id: this.activePlayer}));


                            }
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

    getOpponentId(playerId) {
        let opponentId = null;
        Object.keys(this.players).forEach((element) => {
            if (playerId !== element) opponentId = element;
        });
        return opponentId;

    }

    changeId(oldId, newId, newRoomName) {
        if (oldId == this.activePlayer) this.activePlayer = newId;
        this.players[oldId].id = newId;
        this.players[newId] = {...this.players[oldId]};
        delete this.players[oldId];
        this.roomname = newRoomName;

        this.initSocketListener();



    }

    initSocketListener() {

        // io.on connection kann nicht genutzt werden da keine Instanz dieser Klasse zu dem Zeitpunkt exisitert
        let gameroom = this.io.sockets.in(this.roomname);
        Object.keys(gameroom.sockets).forEach((element) => {
            let socket = gameroom.sockets[element];

            if (socket.eventNames().includes('battleships game move')) {
                socket.removeAllListeners('battleships game move');
                socket.removeAllListeners('battleships game attack')
            }

            socket.on('battleships game move', (coordinates, callback) => {
                console.log("[EVENT] " + this.gameserver.getUsername(socket) + " machte move:  " + coordinates.row + ":" + coordinates.column)

                //log(gameserver.getRoomByUser(socket.id));
                let game = this.gameserver.getRoomByUser(socket.id).game;
                if (game !== undefined) {
                    //console.log(game.positionShip(coordinates, socket.id));
                    let moveResult = game.positionShip(coordinates, socket.id);

                    if (typeof moveResult === 'string') {
                        this.gameserver.chat.to(socket.id).event(moveResult);
                    } else if (typeof moveResult === 'object') {
                        this.gameserver.saveData();
                        callback(moveResult);
                    } else {
                        console.log("[ERROR] battleships game move gab kein gültiges ergebnis ");
                    }
                    //console.log(game.player1Field, game.player2Field);


                } else {
                    this.gameserver.chat.to(socket.id).event("Das Spiel hat noch nicht angefangen");
                }
            });


            socket.on('battleships game attack', (coordinates) => {
                console.log("[EVENT] " + this.gameserver.getUsername(socket) + " attackierte:  " + coordinates.row + ":" + coordinates.column)


                if (this.whoseTurn() !== socket.id) {
                    return this.gameserver.chat.to(socket.id).event('Du bist nicht am Zug');
                }
                //log(gameserver.getRoomByUser(socket.id));

                //console.log(game.positionShip(coordinates, socket.id));
                let moveResult = this.attackPosition(coordinates, socket.id);

                if (typeof moveResult === 'string') {
                    this.gameserver.chat.to(socket.id).event(moveResult);
                } else if (typeof moveResult === 'object') {
                    this.gameserver.saveData();
                    //callback(moveResult);
                    this.io.to(this.roomname).emit('battleships attack accepted', moveResult);
                } else {
                    console.log("[ERROR] battleships game attack gab kein gültiges ergebnis ");
                }

            });


        });
    }

    attackPosition(coordinates, playerId) {

        if (coordinates.row >= 0 && coordinates.row <= 9 && coordinates.column >= 0 && coordinates.column <= 9) {
            let opponentField = this.players[this.getOpponentId(playerId)].field;
            let currentStateOnPosition = opponentField[coordinates.row][coordinates.column];
            //console.log('currentStateOnPosition', currentStateOnPosition);
            switch (currentStateOnPosition) {
                case 0:
                    // miss

                    opponentField[coordinates.row][coordinates.column] = -1;
                    this.activePlayer = this.getOpponentId(playerId);
                    //console.log('field after', this.players[this.getOpponentId(playerId)].field);
                    return {
                        position: coordinates,
                        fieldType: -1,
                        attacker: this.gameserver.getUsername({id: playerId}),
                    };
                case 1:
                    // hit
                    opponentField[coordinates.row][coordinates.column] = 2;
                    this.players[this.getOpponentId(playerId)].undamagesShipFields--;

                    if (this.players[this.getOpponentId(playerId)].undamagesShipFields === 0) {
                        // opponent lost
                        this.io.to(this.roomname).emit('battleships game ended');
                        this.gameserver.chat.to(this.roomname).event(this.gameserver.getUsername({id: this.activePlayer}) + ' hat das Spiel gewonnen!');
                        this.gameserver.disbandRoom(this.getOpponentId(playerId));
                        this.gameserver.disbandRoom(playerId);
                        this.io.emit('user update', this.gameserver.getUsersInRooms());

                    }
                    //this.activePlayer = this.getOpponentId(playerId);
                    return {
                        position: coordinates,
                        fieldType: 2,
                        attacker: this.gameserver.getUsername({id: playerId}),
                    };
                case 2:
                case -1:
                    // cant hit againin
                    return "Du kannst kein bereits attackiertes Feld erneut abgreifen.";
            }
        } else {
            console.log("coordinates out of bounds ", coordinates);
            return "coordinates out of bounds ";
        }
    }

    /**
     * Benutzerdefinierte toJSON um circular dependencies zu vermeiden.
     * @returns {{players: ({}|*)}} Spielerstatistiken
     */
    toJSON() {
        return {
            players: this.players,
            roomname: this.roomname,
            activePlayer: this.activePlayer
        };
    }

}

module.exports = Battleships;