const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(__dirname)); 

// This is the NEW "catch-all" route.
// It will serve your main HTML file for ANY path, like /my-class, /another-class, etc.
app.get('/*', (req, res) => {
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

// This line is already correct for Render deployment
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Zenith Server listening on port ${PORT}`);
});
