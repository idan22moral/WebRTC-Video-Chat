const { v4: generateUUID } = require('uuid');

module.exports = (client, io) => {
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
}