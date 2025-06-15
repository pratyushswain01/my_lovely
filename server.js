const express = require('express');
const path = require('path');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server, {
    // Add cors configuration for robust deployment on services like Render
    cors: {
        origin: "*", // Allows connections from any origin
        methods: ["GET", "POST"]
    }
});


const PORT = process.env.PORT || 3000;

// This is our in-memory "database" to store room information.
// Structure: { roomId: { userId: { name, isMuted } } }
const rooms = {};

// Serve static files (the HTML, etc.) from the main directory
app.use(express.static(__dirname)); 

// A "catch-all" route to serve the main app for any personal room URL
app.get('/*', (req, res) => {
    res.sendFile(path.join(__dirname, 'VirtualClassroom.html'));
});

// --- Main Socket.IO Connection Logic ---
io.on('connection', socket => {
    
    // When a user requests to join a room
    socket.on('join-room', (roomId, userId, userName) => {
        
        // 1. Join the Socket.IO room for efficient broadcasting
        socket.join(roomId);
        
        // 2. Create the room in our state if it's the first user
        if (!rooms[roomId]) {
            rooms[roomId] = {};
        }

        // 3. Add the new user to our room's state object
        rooms[roomId][userId] = { name: userName, isMuted: false };
        console.log(`[JOIN] ${userName} (${userId}) joined room: ${roomId}`);

        // 4. Announce to OTHERS in the room that a new peer has arrived
        // This triggers them to initiate a PeerJS connection to the newcomer
        socket.to(roomId).emit('user-connected', userId, userName);
        
        // 5. Send the complete, updated participant list to EVERYONE in the room
        io.in(roomId).emit('update-participant-list', Object.values(rooms[roomId]));

        // Handle data relays (like mute status) from this user
        socket.on('relay-data', (data) => {
            // Re-broadcast the data to everyone else in the same room
            socket.to(roomId).emit('relayed-data', data);
        });

        // Handle user disconnection
        socket.on('disconnect', () => {
            console.log(`[LEAVE] ${userName} (${userId}) disconnected from room: ${roomId}`);
            
            // Remove the user from the room's state
            if (rooms[roomId]) {
                delete rooms[roomId][userId];
                
                // Announce that the peer has disconnected so clients can close connections
                socket.to(roomId).emit('user-disconnected', userId);
                
                // Send the final, updated participant list to everyone remaining
                io.in(roomId).emit('update-participant-list', Object.values(rooms[roomId]));
            }
        });
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Zenith Pro Server (Stateful) listening on port ${PORT}`);
});
