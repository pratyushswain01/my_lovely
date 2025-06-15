const express = require('express');
const path = require('path'); // We need the 'path' module
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);

const PORT = process.env.PORT || 3000;

// This tells Express to serve any static files (like CSS, images, or client-side JS)
// from the same directory where the server is running.
app.use(express.static(__dirname)); 

// This is the "catch-all" route. After trying to find a static file,
// any other request (like /my-class, /another-room, etc.) will be handled here.
app.get('/*', (req, res) => {
    // It sends the main HTML file, which contains all the application logic.
    res.sendFile(path.join(__dirname, 'VirtualClassroom.html'));
});

io.on('connection', socket => {
    socket.on('join-room', (roomId, userId, userName) => {
        socket.join(roomId);
        // Important: Use socket.to(roomId).emit to send to others in the room
        socket.to(roomId).emit('user-connected', userId, userName);

        socket.on('disconnect', () => {
            socket.to(roomId).emit('user-disconnected', userId);
        });
    });
});

// This line is already correct for Render deployment.
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Zenith Server listening on port ${PORT}`);
});
