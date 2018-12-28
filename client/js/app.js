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


$(function () {

    function log(eventName, message) {
        if (typeof message == 'object')
            message = JSON.stringify(message);
        var content = eventName + '>' + (message ? message : '');
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

            var userList = [];

            $.each(usernames, function (k, entry) {
                userList.push("<li><a class='player-link' href='#'>" + k + "</a></li>");

            });

            $(".chat-rooms").html(userList.join(""));


        });
        ;
    }


    var isLoggedIn = false;

    var typingTimeout;


    function closeContextmenu() {
        $('.contextmenu').hide();
        $('.contextmenu-background').hide();
        $('.contextmenu .options').html('');
    }

    $(document).on('contextmenu', '.player-link', function (e) {


        e.preventDefault();

        var cm = $('.contextmenu').show();
        var cmbg = $('.contextmenu-background').show();

        $(this).addClass('active');
        let etop = ($(this).offset().top);
        let text = $(this).text() + " zum Spiel einladen";
        let template = `<li><a data-player="${$(this).text()}" class="player-invite" href="#">${text}</a></li>`;


        var opt = $('.contextmenu .options');
        cm.css("top", etop + $(this).height());
        opt.append(template);
    }).on('click', '.contextmenu-background', function (e) {

        closeContextmenu();

    }).on('click', '.player-invite', function (e) {
        e.preventDefault();
        socket.emit('invite player', $(this).data('player'));
        closeContextmenu();

    });
    $('#login').submit(function () {
        socket.emit('set username', $('#u').val());
        //$('#m').val('');
        return false;
    });


    $(".game-player-container tbody tr").click(function (e) {

        let row = this.rowIndex;
        let column = e.target.cellIndex;
        if ((row) >= 1 && (row) <= 10 && column >= 1 && column <= 10) {
            positionShip({row: row, column: column});
        }

    });

    $('.chat-form').submit(function () {
        socket.emit('chat message', {msg: $('#m').val(), timestamp: Date.now()});
        $('#m').val('');
        return false;
    });


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

});