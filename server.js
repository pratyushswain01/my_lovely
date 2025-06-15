const express = require('express');
const path = require('path'); // Use the 'path' module for reliability
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server, {
    // Add cors configuration to prevent any connection issues on Render
    cors: {
        origin: "*", // Allow connections from any origin
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

// This tells Express to serve any static files from the same directory
app.use(express.static(__dirname)); 

// This is the "catch-all" route. It ensures that any request,
// whether to the main URL or a personal room URL, gets the main application file.
app.get('/*', (req, res) => {
    res.sendFile(path.join(__dirname, 'VirtualClassroom.html'));
});

// This is our in-memory "database" to store room information.
const rooms = {};

// --- Main Socket.IO Connection Logic ---
io.on('connection', socket => {
    socket.on('join-room', (roomId, userId, userName) => {
        // --- Join the Socket.IO Room ---
        socket.join(roomId);
        
        // --- Create room state if it doesn't exist ---
        if (!rooms[roomId]) {
            rooms[roomId] = {};
        }

        // --- Add the new user to our room state ---
        rooms[roomId][userId] = { name: userName, isMuted: false };
        
        // Get list of all participants currently in the room
        const participantsInRoom = Object.entries(rooms[roomId]).map(([id, data]) => ({
            peerId: id,
            name: data.name,
            isMuted: data.isMuted
        }));

        // --- Announce the new user to OTHERS in the room ---
        socket.to(roomId).emit('user-connected', userId, userName);

        // --- Announce the NEW, complete participant list to EVERYONE in the room ---
        io.in(roomId).emit('update-participant-list', participantsInRoom);

        // --- Handle user disconnecting ---
        socket.on('disconnect', () => {
            if (rooms[roomId] && rooms[roomId][userId]) {
                delete rooms[roomId][userId]; // Remove user from state
                
                // Announce that a user has left
                socket.to(roomId).emit('user-disconnected', userId);

                // Announce the new, updated participant list
                const updatedParticipants = Object.entries(rooms[roomId]).map(([id, data]) => ({
                    peerId: id,
                    name: data.name,
                    isMuted: data.isMuted
                }));
                io.in(roomId).emit('update-participant-list', updatedParticipants);
            }
        });
    });
});

// This line is correct for Render deployment.
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Zenith Pro Server (Personal Rooms) listening on port ${PORT}`);
});
