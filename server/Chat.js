class Chat {

    /**
     * Setzt Socket.io Instanz als Member zur Verwaltung der Nachrichten
     * @param io Socket.io Instanz
     */
    constructor(io) {
        this.io = io;
        this.initSocketListener();

    }

    setGameServer(gameserver){
        this.gameserver = gameserver;
    }

    /**
     * Sendet eine Nachricht an Chat-Teilnehmer. Sollte vorher mit <code>.to</code> eine ID oder ein Raum
     * festgelegt worden sein wird die Nachricht geflüstert.
     * @param sender Name des Senders
     * @param message Die Nachricht des Senders
     */
    message(sender, message) {
        // whisper to room/person
        if (this._to !== null && this._to !== undefined) {
            this.io.to(`${this._to}`).emit('chat message', {
                msg: message,
                type: "message",
                name: sender,
                servertimestamp: Date.now()
            });
            this._to = null;
        } else {
            //Talk to everyone
            this.io.emit('chat message', {
                msg: message,
                type: "message",
                name: sender,
                servertimestamp: Date.now()
            });
        }
    }

    /**
     * Sendet eine Event Nachricht an Chat-Teilnehmer. Sollte vorher mit <code>.to</code> eine ID oder ein Raum
     * festgelegt worden sein wird die Nachricht geflüstert.
     * @param message Der Text des Events
     */
    event(message) {
        // whisper to room/person
        if (this._to !== null && this._to !== undefined) {
            this.io.to(`${this._to}`).emit('chat message', {
                msg: message,
                type: "event",
                servertimestamp: Date.now()
            });
            this._to = null;
        } else {
            //Talk to everyone
            this.io.emit('chat message', {
                msg: message,
                type: "event",
                servertimestamp: Date.now()
            });
        }
    }

    /**
     * Setzt den Socket zum korrekten Senden der Nachrichten.
     * @param socket Socket.io Socket der aktuellen Verbindung
     */
    setSocket(socket) {
        this.socket = socket;
    }

    /**
     * Setzt den/die Empfänger für die nächste Nachricht/das Nächste Event
     * @param id Socket- oder Raum-Id
     * @returns {Chat}
     */
    to(id) {
        this._to = id;
        return this;
    }

    /**
     * Sendet eine Nachricht an alle ausser dem Absender
     * @param sender Name des Senders
     * @param message Die Nachricht des Senders
     */
    broadcast(sender, message) {
        this.socket.broadcast.emit('chat message', {
            msg: message,
            type: "message",
            name: sender,
            servertimestamp: Date.now()
        });
    }

    /**
     * Sendet eine Event Nachricht an alle ausser dem Absender
     * @param message der Text des Events
     */
    broadcastEvent(message) {
        this.socket.broadcast.emit('chat message', {
            msg: message,
            type: "event",
            servertimestamp: Date.now()
        });
    }

    initSocketListener() {
        //this.io.on('connection', (socket) => {});
        this.io.on('connection', (socket) => {
            socket.on('chat message',  (data) => {
                // Leerstring ignorieren
                if (data.msg.trim() === "") return false;
                console.log("[CHAT] " + this.gameserver.getUsername(socket) + ": " + data.msg);
                this.message(this.gameserver.getUsername(socket), data.msg);
            });
        });

    }

}

module.exports = Chat;