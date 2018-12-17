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

function isInLine(start, end) {
    return (start.row === end.row && start.column !== end.column) || (start.column === end.column && start.row !== end.row)

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
            let startCell = $('.game-player-container .player-field tr').eq(startPosition.row).find('td').eq(startPosition.column)
            if (isInLine(startPosition, position) && isPathAvailable(startPosition, position)) {
                setPathActive(startPosition, position);
            } else {
                startCell.removeClass('highlighted');
                let item = $('<li>');
                item.addClass('message');
                item.html("<i>Ungültiger Move du Bitch</i>");
                $('#messages').append(item);
            }
        }

        hasStartPosition = !hasStartPosition;
    }

}