var chatw = class {
    constructor() {
        if (!chatw.instance) {
            chatw.instance = this;
            this.container = $("#messages");
        }
        return chatw.instance;

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
                var item = $('<li>');
                item.addClass('message');

                if (msg.type == 'message') {
                    item.html("<b>" + msg.name + "</b>: " + msg.msg);
                } else if (msg.type == 'event') {
                    item.html("<i>" + msg.msg + "</i>");
                }

                $('#messages').append(item);
            }
        }).on('accepted game move', function (data) {

            var item = $('<li>');
            item.addClass('message');

            item.html("<i>" + data.msg + "</i>");
            $('.player-field tr').eq(data.move.row).find('td').eq(data.move.column).addClass('active')

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
                    userList.push("<li><a class='player-link' href='#'>" + entry.name + "</a></li>");
                });


            });

            $(".chat-rooms").html(userList.join(""));


        }).on('invite', function (data) {
            $('div.invite-box p.invite-message').html("<b>" + data.user + "</b> lädt dich zu <b>" + data.gamename + "</b> ein.");
            $('div.invite-box div.buttons button.btn-green').data('gametype', data.gametype);
            $('div.invite-box div.buttons button.btn-green').data('user', data.user);
            $('div.invite-box div.buttons button.btn-red').data('user', data.user);
            $('div.invite-box')[0].style.zIndex = 100;
        });
    }


    var isLoggedIn = false;

    var typingTimeout;


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


    $(".game-player-container tbody tr").click(function (e) {

        let row = this.rowIndex;
        let column = e.target.cellIndex;
        if ((row) >= 1 && (row) <= 10 && column >= 1 && column <= 10) {
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
                        break;
                    case 3: // Field selected
                        //increase by one because field descriptions are in [0]
                        selectField({row: ++moveResult.row, column: ++moveResult.column});
                        break;
                }
            });
            //positionShip({row: row, column: column});
        }

    });

    $('.chat-form').submit(function () {
        socket.emit('chat message', {msg: $('#m').val(), timestamp: Date.now()});
        $('#m').val('');
        return false;
    });

    function selectField(coordinates, removeOtherSelections = true) {
        if (removeOtherSelections) {
            $('.highlighted').removeClass('highlighted')
        }

        let field = $('.game-player-container .player-field')[0]; // get player field
        let cell = field.rows[coordinates.row].cells[coordinates.column]; // get cell
        let $cell = $(cell); // cast to jquery object
        $cell.addClass('highlighted');

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
        socket.emit('reject invite', {user: $('div.invite-box div.buttons button.btn-red').data('user')});
        closeInvite();
    });

});