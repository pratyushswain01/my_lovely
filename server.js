const express = require('express');
const path = require('path'); // Use the path module for reliability
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);

const PORT = process.env.PORT || 3000;

// This serves static files like images or CSS if you add them later.
app.use(express.static(__dirname)); 

// This is the "catch-all" route. It ensures that any request,
// whether it's to the main URL or a personal room URL,
// gets the main application file.
app.get('/*', (req, res) => {
    res.sendFile(path.join(__dirname, 'VirtualClassroom.html'));
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

// This line is already correct for Render deployment.
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Zenith Server (Personal Rooms Version) listening on port ${PORT}`);
});
