const fs = require('fs');
const https = require('https');
const { v4: generateUUID } = require('uuid');
const express = require('express');
const app = express();
const morgan = require('morgan');

const PORT = 8080;
const httpsOptions = {
    key: fs.readFileSync('../certificates/key.pem'),
    cert: fs.readFileSync('../certificates/cert.pem')
};

app.use(morgan('common'));
app.use(express.static('public'));

let server = https.createServer(httpsOptions, app);
const io = require('socket.io')(server);

io.on('connect', (client) => {
    console.log('connect', client.id);
    client.on('join', () => {
        console.log('join', client.id);
        client.emit('uuid', generateUUID());
    });

    client.on('uuid-recieved', (uuid) => {
        console.log('uuid-recieved', uuid);
        client.join('room');
        client.broadcast.to('room').emit('joined', uuid);
    });

    client.on('offer', (uuid, offer) => {
        console.log('offer from', uuid);
        client.join('room');
        client.broadcast.to('room').emit('offer', uuid, offer);
    });

    client.on('answer', (uuid, answer) => {
        console.log(`answer should trigger answer-${uuid}`);
        client.to('room').emit(`answer-${uuid}`, answer);
    });

    client.on('new-ice-candidate', (candidate) => {
        console.log('new-ice-candidate', candidate);
        client.broadcast.to('room').emit('new-ice-candidate', candidate);
    });
});

server.listen(PORT, () => console.log(`Serving files on port: ${PORT}`));