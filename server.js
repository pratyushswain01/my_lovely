const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(__dirname)); 

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/VirtualClassroom.html');
});

io.on('connection', socket => {
    socket.on('join-room', (roomId, userId, userName) => {
        socket.join(roomId);
        socket.to(roomId).emit('user-connected', userId, userName);
        socket.on('disconnect', () => {
            socket.to(roomId).emit('user-disconnected', userId);
        });
    });
});

server.listen(PORT, () => console.log(`Zenith Server listening on port ${PORT}`));
