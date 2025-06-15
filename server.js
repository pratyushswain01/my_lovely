const express = require('express');
const path = require('path');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server, {
    // Add cors configuration to prevent connection issues
    cors: {
        origin: "*", // Allow connections from any origin
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

// This is our in-memory "database" to store room information.
// In a larger application, this would be a real database like Redis or MongoDB.
const rooms = {};

// Serve static files (HTML, etc.)
app.use(express.static(__dirname));

// The "catch-all" route for personal rooms
app.get('/*', (req, res) => {
    res.sendFile(path.join(__dirname, 'VirtualClassroom.html'));
});

// --- Main Socket.IO Connection Logic ---
io.on('connection', socket => {
    console.log(`Socket connected: ${socket.id}`);

    // When a user wants to join a room
    socket.on('join-room', (roomId, userId, userName) => {
        // --- Join the Socket.IO Room ---
        socket.join(roomId);
        console.log(`${userName} (${userId}) joined room: ${roomId}`);

        // --- Create room if it doesn't exist ---
        if (!rooms[roomId]) {
            rooms[roomId] = {};
        }

        // --- Add the new user to our room state ---
        // We store their name against their socket ID for easy lookup on disconnect
        rooms[roomId][socket.id] = { peerId: userId, name: userName };

        // --- Announce the new user to OTHERS in the room ---
        // This tells existing users to initiate a peer-to-peer connection with the newcomer.
        socket.to(roomId).emit('user-connected', userId, userName);

        // --- Send the complete, current participant list to the NEW user ---
        // This ensures the new user knows who is already in the call.
        // We filter out the new user themselves from the list they receive.
        const otherUsersInRoom = Object.values(rooms[roomId]).filter(p => p.peerId !== userId);
        socket.emit('existing-participants', otherUsersInRoom);
        
        // --- Announce the updated participant list to EVERYONE in the room ---
        io.in(roomId).emit('update-participant-list', Object.values(rooms[roomId]));


        // --- Handle user disconnecting ---
        socket.on('disconnect', () => {
            console.log(`Socket disconnected: ${socket.id}`);

            // Find the user who disconnected from the room's state
            const disconnectedUser = rooms[roomId]?.[socket.id];

            if (disconnectedUser) {
                // Remove the user from our room state
                delete rooms[roomId][socket.id];
                
                console.log(`${disconnectedUser.name} (${disconnectedUser.peerId}) left room: ${roomId}`);

                // --- Announce that a user has left to all OTHERS in the room ---
                // This tells their clients to remove the video tile and peer connection.
                socket.to(roomId).emit('user-disconnected', disconnectedUser.peerId);
                
                // --- Announce the new, updated participant list to everyone remaining ---
                io.in(roomId).emit('update-participant-list', Object.values(rooms[roomId]));
            }
        });
    });
});

// This line is already correct for Render deployment.
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Zenith Server (Stateful Version) listening on port ${PORT}`);
});
