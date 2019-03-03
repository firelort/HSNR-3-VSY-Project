function setPathActive(start, end) {

    let startRow, startColumn, endRow, endColumn;
    let rows = $('.game-player-container .player-field tr');
    $('.game-player-container .player-field td').removeClass('highlighted');
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

function placeShipImage(start, end, length) {
    let ship;
    switch (length) {
        case 2:
            ship = $("<img>").addClass("ship uboot").attr("src", "./images/uboot.png");
            break;
        case 3:
            ship = $("<img>").addClass("ship zerstoerer").attr("src", "./images/zerstoerer.png");
            break;
        case 4:
            ship = $("<img>").addClass("ship kreuzer").attr("src", "./images/kreuzer.png");
            break;
        case 5:
            ship = $("<img>").addClass("ship schlachtschiff").attr("src", "./images/schlachtschiff.png");
            break;
    }

    let startCell = $('.game-player-container .player-field tr').eq(start.row).find('td').eq(start.column);
    let clickedCell = $('.game-player-container .player-field tr').eq(end.row).find('td').eq(end.column);
    let offset = (clickedCell.offset());
    //let ship = $("<img>").addClass("ship uboot").attr("src", "/images/uboot.png");
    if (start.column === end.column) {
        // hochkannt
        ship.addClass("senkrecht");

        if (start.row < end.row) {
            offset = (startCell.offset());
            ship.offset({top: offset.top, left: offset.left + clickedCell.outerWidth()});

        } else {
            offset = clickedCell.offset();
            ship.offset({top: offset.top, left: offset.left + clickedCell.outerWidth()});
        }
    } else {
        if (start.column < end.column) {
            offset = (startCell.offset());
            ship.offset({top: offset.top, left: offset.left});
        } else {

            offset = clickedCell.offset();
            ship.offset({top: offset.top, left: offset.left});
        }
    }


    // ship.offset({top: offset.top - clickedCell.outerHeight(), left: offset.left});
    $('body').append(ship);
}


function reduceShipCounter(length) {
    let counter = $('.game-player-container li[data-length=' + length + ']');
    let amount = counter.data("count") - 1;
    counter.data("count", amount);
    counter.children("span").text(amount);
    return amount;


}