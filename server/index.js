const fs = require('fs');
const https = require('https');
const express = require('express');
const app = express();
const morgan = require('morgan');
const registerRoomHandlers = require('./rooms');
const registerPeerConnectionHandlers = require('./peerConnections');

const PORT = 8080;
const httpsOptions = {
    key: fs.readFileSync('../certificates/key.pem'),
    cert: fs.readFileSync('../certificates/cert.pem')
};

// Use log formatter for HTTP logs
app.use(morgan('common'));

// Serve the app's files statically
app.use(express.static('public'));

// Create HTTPS server and Socket.IO server
let server = https.createServer(httpsOptions, app);
const io = require('socket.io')(server);

// Register the event handlers for every client connection
io.on('connection', (client) => {
    console.log('connection', client.id);

    registerRoomHandlers(client, io);
    registerPeerConnectionHandlers(client, io);
});

// Listen for clients on PORT
server.listen(PORT, () => console.log(`Serving files on port: ${PORT}`));