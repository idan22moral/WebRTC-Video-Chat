const colors = require('colors');
const logger = require('./logger');

const rooms = {};

module.exports = (socket, io) => {
    function generateRoomId() {
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';
        let roomId = '';
    
        do {
            roomId = '';
            for (let i = 0; i < 5; i++) {
                roomId += chars[Math.floor(Math.random() * 61)];
            }
        } while (io.sockets.adapter.rooms[roomId]);
    
        return roomId;
    }
    
    socket.on('create-room', async (username) => {
        username = username.trim();

        // user has no existing rooms
        if (Object.keys(socket.rooms).length == 1 && username.match(/^[^@#]+$/)) {
            var roomId = generateRoomId();

            // save room details
            rooms[roomId] = {
                'gameStatus': 'lobby',
                'users': {}
            }
            rooms[roomId].users[socket.id] = {
                'username': username,
                'isAdmin': true
            }

            // add the user to the new room
            socket.join(roomId);

            // send the room ID
            socket.emit('room', {
                'status': 'created',
                'roomId': roomId
            });
            logger.createRoomSuccess(roomId, username);

        } else {
            socket.emit('room', { 'status': 'creation-failed' });
            logger.createRoomFail(username);
        }
    });

    socket.on('join-room', (username, roomId) => {
        username = username.trim();

        // user has no existing rooms, and the username is not used in the given room
        if (Object.keys(socket.rooms).length == 1 && username.match(/^[^@#]+$/) && rooms[roomId] && rooms[roomId].users &&
            !Object.values(rooms[roomId].users).map((user) => user.username).includes(username)) {

            // save room details
            rooms[roomId].users[socket.id] = {
                'username': username,
                'isAdmin': false
            }

            // add the user to the new room
            socket.join(roomId);

            // send the room ID
            socket.emit('room', {
                'status': 'joined',
                'roomId': roomId,
                'roomDetails': rooms[roomId]
            });

            io.sockets.in(roomId).emit('joined', username);
            logger.joinRoomSuccess(roomId, username);

        } else {
            socket.emit('room', { 'status': 'join-failed' });
            logger.joinRoomFail(roomId, username);
        }
    });

    socket.on('start-game', () => {
        Object.keys(socket.rooms).forEach((room) => {
            if (rooms[room] && rooms[room].users && rooms[room].users[socket.id]) {
                // game is unplayable with less than 3 players
                if (Object.keys(rooms[room].users).length < 3) {
                    io.sockets.in(room).emit('game-not-started', 'At least 3 players are required to play.');
                }
                else if (!rooms[room].users[socket.id].isAdmin) {
                    io.sockets.in(room).emit('game-not-started', "You're not this room's admin.");
                }
                else {
                    // shuffle the positions of the users
                    let users = Object.values(rooms[room].users);
                    users.sort(() => Math.random() - 0.5);

                    // change the room's status and notify the users
                    rooms[room].gameStatus = 'ingame';
                    io.sockets.in(room).emit('game-started', users);
                }
            }
        });
    });

    socket.on('disconnecting', (reason) => {
        let id = socket.id;

        Object.keys(socket.rooms).forEach((roomId) => {
            let room = rooms[roomId];
            let users = room?.users;

            if ([undefined, null].includes(room) || [undefined, null].includes(users)) return;

            try {
                let user = users[id];

                // notify about the user's disconnection
                io.sockets.in(roomId).emit('user-disconnecting', user.username);
                logger.notifyDisconnecting(roomId, user.username);

                // remove the user from the room
                delete users[id];

                let usersAfterDelete = Object.keys(users);

                // close the room if its empty
                if (usersAfterDelete.length == 0) {
                    delete rooms[roomId];
                }
                else if (user.isAdmin) {
                    let newAdminUser = users[usersAfterDelete[0]];
                    // replace current admin
                    newAdminUser.isAdmin = true;

                    // notify the room about the change
                    io.sockets.in(roomId).emit('new-admin', newAdminUser.username);
                    console.log('new-admin', newAdminUser.username);
                }
            } catch (error) {
                logger.error(error);
            }
        });
    });
}
