import express from 'express';
import https from 'https';
import fs from 'fs';
import cors from 'cors';

import dotenv from 'dotenv';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { join } from 'path';
import {_connectToDB} from './connection.js'
// app.js or server.js
import createAccountRouter from './routes/createAccountRouter.js';
import loginAccountRouter from './routes/loginAccountRouter.js';
import getAllUsersRouter from './routes/getAllUsersRouter.js';
import connectedUsers from './models/peersMap.js';


import cookieParser from 'cookie-parser';
import { authenticateJWT, requireAuth, logoutUser } from './middlewares/auth.js'
import friendsRouter from './routes/friends.js';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3000; // Use default port if not set
const app = express();
const server = https.createServer({
    key: fs.readFileSync('./key.pem'),
    cert: fs.readFileSync('./cert.pem'),
  }, app);

  const io = new Server(server);
app.use(cookieParser());

app.use(cors({
    origin: '*',
    credentials: true // if using cookies or HTTP auth
}));


  
_connectToDB();
// Store rooms and their members in memory
let rooms = {};  // Object to store room info
let users = {};  // Object to store user info


app.use('/assets', express.static('assets'));
app.use(express.static(join(process.cwd(), 'public')));

app.use(express.json());

app.get('/', authenticateJWT, (req, res) => {
    res.sendFile(join(process.cwd(), 'views', 'index.html'));
});

// Serve dashboard only if authenticated
app.get('/userDashboard', requireAuth, (req, res) => {
    res.sendFile(join(process.cwd(), 'views', 'personalAccount.html'));
});

app.use('/userDashboard', getAllUsersRouter);
app.use('/friends', friendsRouter)

app.use('/createAccount', createAccountRouter);
app.use('/loginAccount', loginAccountRouter);

// Logout route
app.get('/logout', (req, res) => {
    logoutUser(res);
    res.redirect('/');
});

// Handle socket connections
io.on('connection', (socket) => {
    console.log('a user connected');
    socket.emit('your-socket-id', socket.id);

    let currentUser = null;

    socket.on('register-username', (username) => {
        connectedUsers.set(username, socket.id);
        console.log(connectedUsers)
        console.log(`User ${username} registered with socket ID ${socket.id}`);
    });


    socket.on("chat", ({ sender, target, data }) => {
        const targetSocketId = connectedUsers.get(target) || target;
    
        if (io.sockets.sockets.get(targetSocketId)) {
            io.to(targetSocketId).emit("chat", {
                senderName: sender,
                senderSocketId: socket.id,
                message: data
            });
        } else {
            console.log("Target user/socket not found:", target);
        }
    });
    

    socket.on("offer", ({ sender, target, offer }) => {
        // Check if target is a known username
        const targetSocketId = connectedUsers.get(target) || target;
    
        if (io.sockets.sockets.get(targetSocketId)) {
            io.to(targetSocketId).emit("offer", { senderName: sender, sender: socket.id, offer });
        } else {
            console.log("Target user/socket not found:", target);
        }
    });
    

    socket.on("answer", ({ target, answer }) => {
        io.to(target).emit("answer", { sender: socket.id, answer });
    });

    socket.on("ice-candidate", ({ target, candidate }) => {
        io.to(target).emit("ice-candidate", { candidate });
    });

    socket.on("register", userId => {
        socket.join(userId); // maps socket to userId
    });

    socket.on("end-call", ({target}) =>{
        const targetSocketId = connectedUsers.get(target) || target;
        if (io.sockets.sockets.get(targetSocketId)) {
            io.to(targetSocketId).emit("end-call");
        } else {
            console.log("Target user/socket not found:", target);
        }
    })
    // User joins chat by providing a username
    // User joins chat by providing a username and gender
    socket.on('user join', (userData) => {
        const { username, gender } = userData;  // Extract username and gender from the received JSON

        if (!username || !gender) {
            // Handle the case if username or gender is missing
            socket.emit('error', 'Username and Gender are required.');
            return;
        }

        // Store user data (username and gender)
        currentUser = username;
        users[socket.id] = { username, gender };  // Save both username and gender for the user

        console.log(`${username} (${gender}) has joined the chat`);

        // Emit the message that the user has joined
        io.emit('user joined', `${username} (${gender}) has joined the chat.`);

        // Send the updated list of rooms
        io.emit('rooms', Object.keys(rooms));  // This sends the updated list of rooms to all clients


    });

    // User sends a message to a specific room
    // User sends a message to a specific room
    socket.on('chat message', (data) => {
        // Destructure the roomId and content from the incoming data
        const { roomId, content } = data;

        // Retrieve the user object based on socket.id
        const user = users[socket.id];

        if (!user) {
            // If the user is not found, log and return early
            console.log("User not found.");
            return;
        }

        const username = user.username;  // Extract the username from the user object

        // Check if the room exists
        if (rooms[roomId]) {
            // Add the new message to the room's message history
            rooms[roomId].messages.push({ username, content });

            // Emit the new message to all clients in the room
            io.to(roomId).emit('chat message', { username, content });
        } else {
            // If room doesn't exist, log a warning (optional)
            console.log(`Room ${roomId} does not exist.`);
        }
    });



    // User creates a new room
    // Server-side event to handle room creation
    socket.on('create room', (data) => {
        // Parse the JSON string into an object (optional if already an object)
        const roomData = JSON.parse(data);
        const { roomName, maxMembers } = roomData;

        // Check if the room already exists
        if (!rooms[roomName]) {
            // Create the new room with max members
            rooms[roomName] = {
                members: [], // Initial empty array of members
                maxMembers: maxMembers, // Store the max number of members for the room
                messages: [] // Initial empty array of messages
            };

            // Notify all users about the new room
            io.emit('rooms', Object.keys(rooms)); // Send the updated list of room names
        } else {
            // If the room already exists, emit an error message
            socket.emit('error', 'Room already exists');
        }
    });


    // User joins a room
    socket.on('join room', (roomName) => {
        if (rooms[roomName]) {
            rooms[roomName].members.push(socket.id);
            socket.join(roomName);
            // io.to(roomName).emit('chat message', {
            //     username: 'System',
            //     content: `${users[socket.id]} has joined the room.`,
            // });
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
                content: `${users[socket.id].username} has left the room.`,
            });
            io.emit('rooms', Object.keys(rooms)); // Emit updated room list
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
