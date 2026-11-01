const http = require('http');
const socketIO = require('socket.io');

const { addNewRoom, getRoomData, isRoomExists, addUserToRoom, removeUserFromRoom, updateRoomData } = require('./store');
const { successResponse } = require('./utils');

const PORT = process.env.PORT || 8000;

const server = http.createServer((req, res) => res.end('Ok'));
const io = socketIO(server, { cors: { origin: '*' } });

io.on('connection', (socket) => {
    console.log('Client connected', socket.id);

    // NOTE: By default socket will join 'default' room
    socket.roomId = 'default';
    socket.join(socket.roomId);
    addUserToRoom(socket.roomId);
    // Check here if we can use socket Id to send back
    io.to(socket.roomId).emit('response', successResponse(socket.roomId, getRoomData(socket.roomId)));

    socket.on('updateText', (data) => {
        updateRoomData(socket.roomId, data);

        socket.broadcast.to(socket.roomId).emit('response', successResponse(socket.roomId, getRoomData(socket.roomId)));
    });

    socket.on('join', (newRoomId) => {
        console.log('Join ', newRoomId);

        if (!isRoomExists(newRoomId)) {
            console.log('Room not exists ', newRoomId);
            addNewRoom(newRoomId);
        }

        const oldRoomId = socket.roomId;
        removeUserFromRoom(oldRoomId);
        socket.leave(oldRoomId);
        socket.join(newRoomId);
        socket.roomId = newRoomId;
        addUserToRoom(newRoomId);

        io.to(newRoomId).emit('response', successResponse(newRoomId, getRoomData(newRoomId)));
        io.to(oldRoomId).emit('response', successResponse(oldRoomId, getRoomData(oldRoomId)));
    });

    socket.on('disconnect', () => {
        const _roomId = socket.roomId;
        if (isRoomExists(_roomId)) {
            removeUserFromRoom(_roomId);
            io.to(_roomId).emit('response', successResponse(_roomId, getRoomData(socket.roomId)));
        }
        console.log('Client disconnected from room', _roomId);
    });
});

server.listen(PORT, () => console.log(`Listening on ${PORT}`));
