import express from 'express';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { join } from 'path';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3000; // Use default port if not set
const app = express();
const server = createServer(app);
const io = new Server(server);

// Store rooms and their members in memory
let rooms = {};  // Object to store room info
let users = {};  // Object to store user info

app.get('/', (req, res) => {
    res.sendFile(join(process.cwd(), 'views', 'index.html')); // Serve the HTML page
});

// Handle socket connections
io.on('connection', (socket) => {
    console.log('a user connected');
    
    let currentUser = null;

    // User joins chat by providing a username
    socket.on('user join', (username) => {
        currentUser = username;
        users[socket.id] = username;
        console.log(`${username} has joined the chat`);
        io.emit('user joined', `${username} has joined the chat.`);
        io.emit('rooms', Object.keys(rooms)); // Send updated list of rooms
    });

    // User sends a message to a specific room
    socket.on('chat message', (data) => {
        const { roomId, content } = data;
        const username = users[socket.id];

        if (rooms[roomId]) {
            rooms[roomId].messages.push({ username, content });
            io.to(roomId).emit('chat message', { username, content });
        }
    });

    // User creates a new room
    socket.on('create room', (roomName) => {
        if (!rooms[roomName]) {
            rooms[roomName] = { members: [], messages: [] }; // Create a new room with no members or messages initially
            io.emit('rooms', Object.keys(rooms)); // Notify all users about the new room
        } else {
            socket.emit('error', 'Room already exists');
        }
    });

    // User joins a room
    socket.on('join room', (roomName) => {
        if (rooms[roomName]) {
            rooms[roomName].members.push(socket.id);
            socket.join(roomName);
            io.to(roomName).emit('chat message', {
                username: 'System',
                content: `${users[socket.id]} has joined the room.`,
            });
            socket.emit('joined room', roomName);
        } else {
            socket.emit('error', 'Room does not exist');
        }
    });

    // User leaves a room
    socket.on('leave room', (roomName) => {
        if (rooms[roomName]) {
            const index = rooms[roomName].members.indexOf(socket.id);
            if (index !== -1) {
                rooms[roomName].members.splice(index, 1);
                socket.leave(roomName);
                io.to(roomName).emit('chat message', {
                    username: 'System',
                    content: `${users[socket.id]} has left the room.`,
                });
            }
        }
    });

    // Disconnecting the user
    socket.on('disconnect', () => {
        if (currentUser) {
            console.log(`${currentUser} disconnected`);
            io.emit('user left', `${currentUser} has left the chat.`);
            delete users[socket.id];
        }
    });

    // Handle unknown request type
    socket.on('request', (data) => {
        const { type, roomId, userId, content } = data;

        // Example: Handle different request types
        if (type === 'message') {
            console.log(`User ${userId} sent a message in room ${roomId}: ${content}`);
        } else if (type === 'create') {
            console.log(`User ${userId} created room ${roomId}`);
        } else if (type === 'join') {
            console.log(`User ${userId} joined room ${roomId}`);
        } else if (type === 'leave') {
            console.log(`User ${userId} left room ${roomId}`);
        } else if (type === 'view_rooms') {
            console.log(`User ${userId} requested all rooms`);
        } else {
            console.log('Unknown request type:', type);
        }
    });
});

// Start the server
server.listen(PORT, (err) => {
    if (err) {
        console.error('Error Starting Server', err);
    } else {
        console.log(`Server is up and running on port ${PORT}`);
    }
});
