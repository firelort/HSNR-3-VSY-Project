var hasStartPosition;
var startPosition;

function isPathAvailable(start, end) {

    let isFree = true;
    let startRow, startColumn, endRow, endColumn;

    if (start.row === end.row && start.column !== end.column) { // horizontal
        startColumn = (start.column > end.column ? end.column : start.column);
        endColumn = (start.column < end.column ? end.column : start.column);
        for (let i = startColumn; i <= endColumn && (isFree); i++) {
            isFree = !touchesShip({row: start.row, column: i});
        }
    } else if (start.row !== end.row && start.column === end.column) { // senkrecht
        startRow = (start.row > end.row ? end.row : start.row);
        endRow = (start.row < end.row ? end.row : start.row);
        for (let i = startRow; i <= endRow && (isFree); i++) {
            isFree = !touchesShip({row: i, column: start.column});
        }
    }

    return isFree;
}

function touchesShip(coordinates) {

    let rows = $('.game-player-container .player-field tr');
    return rows.eq(coordinates.row - 1).find('td').eq(coordinates.column).hasClass("active") // top
        || rows.eq(coordinates.row).find('td').eq(coordinates.column + 1).hasClass("active") // right
        || rows.eq(coordinates.row + 1).find('td').eq(coordinates.column).hasClass("active") // bottom
        || rows.eq(coordinates.row).find('td').eq(coordinates.column - 1).hasClass("active") // left
}


function setPathActive(start, end) {

    let startRow, startColumn, endRow, endColumn;
    let rows = $('.game-player-container .player-field tr');
    if (start.row === end.row && start.column !== end.column) { // horizontal
        startColumn = (start.column > end.column ? end.column : start.column);
        endColumn = (start.column < end.column ? end.column : start.column);
        for (let i = startColumn; i <= endColumn; i++) {
            rows.eq(start.row).find('td').eq(i).addClass('active');
        }
    } else if (start.row !== end.row && start.column === end.column) { // senkrecht
        startRow = (start.row > end.row ? end.row : start.row);
        endRow = (start.row < end.row ? end.row : start.row);
        for (let i = startRow; i <= endRow; i++) {
            rows.eq(i).find('td').eq(start.column).addClass('active');
        }
    }

}

function getShipLength(start, end) {
    if ((start.row === end.row && start.column !== end.column))
        return Math.abs(start.column - end.column) + 1;
    else
        return Math.abs(start.row - end.row) + 1;
}


function isLengthAvailable(length) {
    let count = $('.game-player-container li[data-length=' + length + ']');
    return count.data("count") > 0;
}

function isInLine(start, end) {
    return (start.row === end.row && start.column !== end.column) || (start.column === end.column && start.row !== end.row)

}

function decreaseShipCounter(shiplength) {
    console.log("Ooof");
    let count = $('.game-player-container li[data-length=' + shiplength + ']');
    console.log(count.data());
    //count.attr("data-count",);

}

function positionShip(position) {
    if (touchesShip(position)) {
        let item = $('<li>');
        item.addClass('message');
        item.html("<i>Darf kein anderes SChiff berühren</i>");
        $('#messages').append(item);
    } else {
        let clickedCell = $('.game-player-container .player-field tr').eq(position.row).find('td').eq(position.column);


        if (clickedCell.hasClass('active') || clickedCell.hasClass('highlighted')) {
            console.log("invalid"); // TODO spieler wissen lassen
            return false;
        }
        if (!hasStartPosition) {
            startPosition = position;
            clickedCell.addClass('highlighted');
        } else {
            console.log();
            let startCell = $('.game-player-container .player-field tr').eq(startPosition.row).find('td').eq(startPosition.column);
            if (isInLine(startPosition, position)) {

                console.log(isLengthAvailable(getShipLength(startPosition, position)));

                decreaseShipCounter(getShipLength(startPosition, position));

                if (isPathAvailable(startPosition, position)) {
                    setPathActive(startPosition, position);


                    let ship;
                    switch (getShipLength(startPosition, position)) {
                        case 2:
                            ship = $("<img>").addClass("ship uboot").attr("src", "/images/uboot.png");
                            break;
                        case 3:
                            ship = $("<img>").addClass("ship zerstoerer").attr("src", "/images/zerstoerer.png");
                            break;
                        case 4:
                            ship = $("<img>").addClass("ship kreuzer").attr("src", "/images/kreuzer.png");
                            break;
                        case 5:
                            ship = $("<img>").addClass("ship schlachtschiff").attr("src", "/images/schlachtschiff.png");
                            break;
                    }

                    let offset = (clickedCell.offset());
                    //let ship = $("<img>").addClass("ship uboot").attr("src", "/images/uboot.png");
                    if (startPosition.column === position.column) {
                        // hochkannt
                        ship.addClass("senkrecht");

                        if (startPosition.row < position.row) {
                            offset = (startCell.offset());
                            ship.offset({top: offset.top, left: offset.left + 2 * clickedCell.outerWidth()});

                        } else {
                            offset = clickedCell.offset();
                            ship.offset({top: offset.top, left: offset.left + 2 * clickedCell.outerWidth()});
                        }
                    } else {
                        if (startPosition.column < position.column) {
                            offset = (startCell.offset());
                            ship.offset({top: offset.top - clickedCell.outerHeight(), left: offset.left});
                        } else {

                            offset = clickedCell.offset();
                            ship.offset({top: offset.top - clickedCell.outerHeight(), left: offset.left});
                        }
                    }


                    // ship.offset({top: offset.top - clickedCell.outerHeight(), left: offset.left});
                    $('body').append(ship);


                } else {
                    startCell.removeClass('highlighted');
                    let item = $('<li>');
                    item.addClass('message');
                    item.html("<i>Ungültiger Move du Bitch</i>");
                    $('#messages').append(item);
                }
            }
        }

        hasStartPosition = !hasStartPosition;
    }

}