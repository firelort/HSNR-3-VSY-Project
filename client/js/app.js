var chatw = class {
    constructor() {
        if (!chatw.instance) {
            chatw.instance = this;
            this.container = $("#messages");
        }
        return chatw.instance;

    }

    message(messageDetails) {
        let item = $('<li>');
        item.addClass('message');

        if (messageDetails.type == 'message') {
            item.html("<b>" + messageDetails.name + "</b>: " + messageDetails.msg);
        } else if (messageDetails.type == 'event') {
            item.html("<i>" + messageDetails.msg + "</i>");
        } else {
            item.html("<i>" + messageDetails.msg + "</i>");
        }

        this.container.append(item);
    }
};


const chat = new chatw();
console.log(chat);

var userid;
var username;

$(function () {


    function log(eventName, message) {
        if (typeof message == 'object')
            message = JSON.stringify(message);
        let content = eventName + '>' + (message ? message : '');
        console.log(content);
    }

    var donethis = false;

    socket = io.connect('http://localhost', {
        'reconnection': true,
        'reconnectionDelay': 1000,
        'reconnectionDelayMax': 5000,
        'reconnectionAttempts': 1
    });
    socket.on('connect_error', handleNoConnect);
    socket.on('connect_timeout', handleNoConnect);
    socket.on('connect', onConnect);
    socket.on('connect', function () {
        log('connect', 'connected');
    })
        .on('connect_error', function (err) {
            log('connect_error', err);
        })
        .on('connect_timeout', function () {
            log('connect_timeout');
        })
        .on('reconnect', function (attempt) {
            log('reconnect', 'Attempt #' + attempt);
        })
        .on('reconnecting', function (attempt) {
            log('reconnecting', 'Attempt #' + attempt);
        })
        .on('reconnect_attempt', function () {
            log('reconnect_attempt');
            handleNoConnect();
        })
        .on('reconnect_error', function (err) {
            log('reconnect_error', err);
        })
        .on('reconnect_failed', function () {
            log('reconnect_failed');
        })
        .on('news', function (data) {
            log('news', data);
        });

    function handleNoConnect() {
        if (!donethis) {


            delete socket;
            socket = io.connect('http://localhost:3000', {
                'forceNew': true,
                'reconnection': true,
                'reconnectionDelay': 1000,
                'reconnectionDelayMax': 5000,
                'reconnectionAttempts': 2
            });
            socket.on('connect_error', handleNoConnect2);
            socket.on('connect_timeout', handleNoConnect2);
            socket.on('connect', onConnect);
            donethis = !donethis;
        }
    }

    function handleNoConnect2() {
        $('.connection-error')[0].style.zIndex = 9001;
    }

    function onConnect() {

        if (donethis) {
            socket.emit('oldid', userid, username);
        }
        userid = socket.id;


        // set other event handlers on a connected socket
        socket.on('disconnect', function () {

        }).on('chat message', function (msg) {
            if (isLoggedIn) {
                chat.message(msg);
            }
        }).on('accepted game move', function (data) {

            var item = $('<li>');
            item.addClass('message');

            item.html("<i>" + data.msg + "</i>");
            $('.player-field tr').eq(data.move.row).find('td').eq(data.move.column).addClass('active');

            $('#messages').append(item);

        }).on('set username', function (msg) {
            if (!msg.error) {
                $('.login-wrapper').hide();
                isLoggedIn = true;
                $('.chat-input').focus();
            } else {
                $('.login-error').text(msg.msg);
            }
        }).on('typing', function (data) {
            if (data) {
                $('.typing').html(data);
            } else {
                $('.typing').html("");
            }
        }).on('user update', function (usernames) {

            let battleshipCounter = 0;
            let ticTacToeCounter = 0;
            var userList = [];

            $.each(usernames, function (k, entry) {
                if (k.startsWith("l")) {  //Lobby
                    userList.push("<li class='room-title'>Lobby</li>");
                } else if (k.startsWith("1")) { // tictactoe
                    userList.push("<li class='room-title'>TicTacToe " + ++ticTacToeCounter + "</li>");
                } else if (k.startsWith("2")) { // battleships
                    userList.push("<li class='room-title'>Battleships " + ++battleshipCounter + "</li>");
                }

                $.each(entry, function (k, entry) {
                    let highlighted = (entry.name === username) ? ' highlighted' : '';
                    userList.push("<li><a class='player-link" + highlighted + "' href='#'>" + entry.name + "</a></li>");
                });


            });

            $(".chat-rooms").html(userList.join(""));


        }).on('invite', function (data) {
            $('div.invite-box p.invite-message').html("<b>" + data.user + "</b> lädt dich zu <b>" + data.gamename + "</b> ein.");
            $('div.invite-box div.buttons button.btn-green').data('gametype', data.gametype);
            $('div.invite-box div.buttons button.btn-green').data('user', data.user);
            $('div.invite-box div.buttons button.btn-red').data('user', data.user);
            $('div.invite-box')[0].style.zIndex = 100;
        }).on('battleships player change state', function (playerId, state, startPlayer) {
            let field = document.querySelector('.game-player-turn');
            if (playerId === userid) {
                playerReady = true;
                if (enemyReady) {
                    startPlayingMode(startPlayer)
                } else {
                    chat.message({msg: "Dein Gegner ist noch nicht bereit. Warte einen Augenblick."});
                    field.innerText = "Warte auf Gegner";
                }
            } else {
                enemyReady = true;
                if (playerReady) {
                    startPlayingMode(startPlayer)
                } else {
                    chat.message({msg: "Dein Gegner ist bereit. Lass ihn nicht zu lange warten."});
                    field.innerText = "Bitte platziere deine Schiffe - Dein Gegner wartet auf dich";
                }
            }

        }).on('start game battleships', function () {
            clearField();
            createTables();
            createShipCounter();
            gameState = 3; // placing

            let field = document.querySelector('.game-player-turn');
            field.style.visibility = "visible";
            field.innerText = "Bitte platziere deine Schiffe";
        }).on('battleships attack accepted', function (moveResult) {
            console.log(moveResult);
            let field;
            let playerInfo = document.querySelector('.game-player-turn');
            if (moveResult.attacker !== username) {
                field = $('.game-player-container .player-field tr');
            } else {
                field = $('.game-opponent-container .player-field tr');
            }

            switch (moveResult.fieldType) {
                case 2: // hit
                    console.log('hit');
                    field.eq(++moveResult.position.row).find('td').eq(++moveResult.position.column).addClass('ship-hit');
                    break;
                case -1: //miss
                    console.log('miss');
                    field.eq(++moveResult.position.row).find('td').eq(++moveResult.position.column).addClass('ship-miss');
                    if (moveResult.attacker !== username) {
                        playerInfo.innerText = "Du bist am Zug!";
                    } else {
                        playerInfo.innerText = "Dein Gegner ist am Zug!";
                    }
                    break;

            }
        });
    }

    function startPlayingMode(startPlayer) {
        gameState = 1; // playing
        let field = document.querySelector('.player-ships ul').innerHTML = ''; // remove ship counter
        let playerInfo = document.querySelector('.game-player-turn');
        if (startPlayer !== username) {
            playerInfo.innerText = "Dein Gegner ist am Zug!";
        } else {
            playerInfo.innerText = "Du bist am Zug!";
        }
    }


    var isLoggedIn = false;

    var typingTimeout;

    var enemyReady = false;
    var playerReady = false;

    var gameState = 2; // waiting

    function clearField() {
        document.querySelector('.player-ships ul').innerHTML = '';
        let opponentField = document.querySelector('.game-opponent-container .player-field');
        let playerField = document.querySelector('.game-player-container .player-field')
        if (playerField) playerField.remove();
        if (opponentField) opponentField.remove();


    }


    function createTables() {
        var opponent = document.querySelector('.game-opponent-container'),
            player = document.querySelector('.game-player-container'),
            tbl = document.createElement('table');
        tbl.classList.add('player-field');
        var header = tbl.createTHead();
        var body = document.createElement('tbody');
        var row = header.insertRow();
        for (var i = 0; i < 11; i++) {
            var th = row.appendChild(document.createElement("th"));

            if (i !== 0) {

                th.appendChild(document.createTextNode(i));
            }
        }


        for (var i = 0; i < 10; i++) {
            var tr = body.insertRow();
            for (var j = 0; j < 11; j++) {

                var td = tr.insertCell();
                if (j === 0) {
                    td.appendChild(document.createTextNode(String.fromCharCode(65 + i)));

                }
            }
        }

        tbl.appendChild(body);
        player.prepend(tbl);
        opponent.prepend(tbl.cloneNode(true));
    }

    function createShipCounter() {

        let list = document.querySelector('.player-ships ul');

        for (let i = 0; i < 4; i++) {
            let length = 5 - i;
            let count = 1 + i;

            let item = document.createElement('li');
            item.setAttribute('data-length', length);
            item.setAttribute('data-count', count);

            let amountSpan = document.createElement('span');
            amountSpan.classList.add('amount');
            amountSpan.appendChild(document.createTextNode(count));

            let img = document.createElement('img');
            img.classList.add('static-ship');

            let shipType;

            switch (length) {
                case 5:
                    shipType = 'schlachtschiff';
                    break;
                case 4:
                    shipType = 'kreuzer';
                    break;
                case 3:
                    shipType = 'zerstoerer';
                    break;
                case 2:
                    shipType = 'uboot';
                    break;
            }

            img.setAttribute('src', './images/' + shipType + '.png');
            img.classList.add(shipType);

            item.appendChild(amountSpan);
            item.appendChild(document.createTextNode(" x "));
            item.appendChild(img);

            list.appendChild(item);

        }


    }


    function closeContextmenu() {
        $('.contextmenu').hide();
        $('.contextmenu-background').hide();
        $('.contextmenu .options').html('');
        $('.sidebar-menu .active').removeClass('active');
    }

    $(document).on('contextmenu click', '.player-link', function (e) {


        e.preventDefault();

        var cm = $('.contextmenu').show();
        var cmbg = $('.contextmenu-background').show();

        $(this).addClass('active');
        let etop = ($(this).offset().top);
        let text = $(this).text() + " zum Spiel einladen";
        let template = `<li><a data-player="${$(this).text()}" class="player-invite" href="#">${text}</a></li>`;


        var opt = $('.contextmenu .options');
        cm.css("top", etop + $(this).height() + 5);
        opt.append(template);
    }).on('click', '.contextmenu-background', closeContextmenu)
        .on('click', '.player-invite', function (e) {
            e.preventDefault();
            socket.emit('invite player', $(this).data('player'));
            closeContextmenu();

        });


    $('#login').submit(function () {
        socket.emit('set username', $('#u').val());
        username = $('#u').val();
        //$('#m').val('');
        return false;
    });


    $(document).on('click', ".game-player-container tbody tr", function (e) {

        if (gameState != 3) return;
        let row = this.rowIndex;
        let column = e.target.cellIndex;
        if ((row) >= 1 && (row) <= 10 && column >= 1 && column <= 10) {
            console.log("clicke");
            // decrease coordinates by 1 to match array counting
            socket.emit('battleships game move', {row: --row, column: --column}, function (moveResult) {

                console.log(moveResult);
                switch (moveResult.type) {
                    case 1: // select path (position ship)
                        //increase by one because field descriptions are in [0]
                        // thats ugly, need better solution
                        moveResult.start.row++;
                        moveResult.start.column++;
                        moveResult.end.row++;
                        moveResult.end.column++;
                        setPathActive(moveResult.start, moveResult.end);
                        reduceShipCounter(moveResult.reduceCounter);
                        placeShipImage(moveResult.start, moveResult.end, moveResult.reduceCounter);
                        break;
                    case 3: // Field selected
                    case 0: // Field unselected
                        //increase by one because field descriptions are in [0]
                        selectField({row: ++moveResult.row, column: ++moveResult.column});
                        break;

                }
            });
            //positionShip({row: row, column: column});
        }

    });

    $(document).on('click', ".game-opponent-container tbody tr", function (e) {

        if (gameState !== 1) return;
        let row = this.rowIndex;
        let column = e.target.cellIndex;
        if ((row) >= 1 && (row) <= 10 && column >= 1 && column <= 10) {
            // decrease coordinates by 1 to match array counting
            console.log("batte attacke");
            socket.emit('battleships game attack', {row: --row, column: --column});
        }

    });

    $('.chat-form').submit(function () {
        socket.emit('chat message', {msg: $('#m').val(), timestamp: Date.now()});
        $('#m').val('');
        return false;
    });

    function selectField(coordinates, removeOtherSelections = true) {
        // if (removeOtherSelections) {
        //     $('.player-field .highlighted').removeClass('highlighted')
        // }

        let field = $('.game-player-container .player-field')[0]; // get player field
        let cell = field.rows[coordinates.row].cells[coordinates.column]; // get cell
        let $cell = $(cell); // cast to jquery object
        $cell.toggleClass('highlighted');

    }


    function timeoutFunction() {
        typing = false;
        socket.emit("typing", false);
    }

    $('#m').keypress(function () {
        typing = true;
        socket.emit('typing', 'typing...');
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(timeoutFunction, 500);
    });


    function closeInvite() {
        $('div.invite-box p.invite-message').html("");
        $('div.invite-box div.buttons button.btn-green').removeData('gametype');
        $('div.invite-box div.buttons button.btn-green').removeData('user');
        $('div.invite-box div.buttons button.btn-red').removeData('user');
        $('div.invite-box').removeAttr('style');
    }

    // Hinzufügen von Eventlistener für die Invite Buttons
    $('div.invite-box div.buttons button.btn-green').click(function () {
        socket.emit('join room', {
            gametype: $('div.invite-box div.buttons button.btn-green').data('gametype'),
            user: $('div.invite-box div.buttons button.btn-green').data('user')
        });
        closeInvite();
    });

    $('div.invite-box div.buttons button.btn-red').click(function () {
        socket.emit('reject invite', $('div.invite-box div.buttons button.btn-red').data('user'));
        closeInvite();
    });

});