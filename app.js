const express = require('express');
const http = require('http');
require('dotenv').config();
const socketIo = require('socket.io');
const cors = require('cors');
const routes = require('./routes');
const { initializeSocket } = require('./sockets/chat');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

app.use(cors());
app.use(express.json());
app.use('/', routes);
app.use(express.static(path.join(__dirname, 'public')))

initializeSocket(io);

const port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});