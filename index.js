var express = require('express');
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var secondHost = false;
app.use(express.static('.'));

/**
 * Rendern der Oberfläche
 */
app.get('/', function (req, res) {
    res.sendFile(__dirname + '/template.html');
});

/*
/**
 * Starten des Websockets
 */
var donethis = false;

var user = {};
var usernames = {};


io.on('connection', function (socket) {

    if (secondHost && !donethis) {
        donethis = true;
        console.log("Erster server abgeschmiert");
        var fork = require('child_process').fork;
        var child = fork('./index.js');

    }

    if (!user.hasOwnProperty(socket.id)) {
        user[socket.id] = {"name": "Unbekannt"};
    }


    socket.on('time', function (date) {
        console.log('time');
    })

    //console.log(socket);
    socket.on('set username', function (msg) {
        console.log(msg);
        if (!usernames.hasOwnProperty(msg)) {
            usernames[msg] = socket.id;
            user[socket.id].name = msg;
            socket.emit('set username', {
                'code': 200, 'msg': "ok", 'error': false
            });

            socket.broadcast.emit('chat message', {
                msg: user[socket.id].name + " ist dem server beigetreten ",
                type: 'event',
                servertimestamp: Date.now()
            });
            io.emit('user update', usernames);


        } else {

            socket.emit('set username', {
                'code': 409, 'msg': "conflict: name '" + msg + "' existiert bereits", 'error': true
            });
        }


    });


    socket.on('game move', function (data) {
        socket.broadcast.emit('accepted game move', {

            msg: user[socket.id].name + " machte move:  " + data.row + ":" + data.column,
            type: 'event',
            servertimestamp: Date.now(),
            move: data
        });


    });

    socket.on('invite player', function (data) {
        if (!usernames.hasOwnProperty(data)) {
            console.log(data + ' is rip');
        } else {
            console.log(usernames[data] + ' wurde eingeladen von ' + user[socket.id].name);
            io.to(`${usernames[data]}`).emit('chat message', {
                msg: user[socket.id].name + " lädt dich ein  ",
                type: 'event',
                servertimestamp: Date.now()
            })
        }


    });

    socket.on('typing', function (msg) {

        socket.broadcast.emit('typing', msg);

    });

    //console.log(socket);
    socket.on('chat message', function (data) {
        console.log(data.msg);
        data.type = "message";
        data.serversimestamp = Date.now();
        data.name = user[socket.id].name;

        data.name = socket.id;
        io.emit('chat message', data);
    });

    socket.on('disconnect', function () {
        console.log(user[socket.id].name + ' disconnected');
        data = {"msg": user[socket.id].name + " hat den Server verlassen", type: "event", servertimestamp: Date.now()};
        socket.broadcast.emit('chat message', data);
        delete usernames[user[socket.id].name];
        delete user[socket.id];
        io.emit('user update', usernames);
    });

});

/**
 * Starten des Servers
 */


function startServer() {
    http.listen(80, function () {
        console.log('listening on *:80');

    }).on('error', function () {

        console.log("port belegt versuche port 3000");


        http.listen(3000, function () {
            console.log('listening on *:3000');

            secondHost = true;


        }).on('error', function (data) {
            console.log("chaos")
        });


    });


}


startServer();
