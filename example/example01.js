const Socket = require('../dist').default;

const socket = new Socket('http://localhost:5000');

socket.on('connected', (socket) => {
  console.log('connected:', socket.id);
});

socket.on('disconnected', () => {
  console.log('disconnected');
});

socket.on('echo', (data) => {
  console.log('echo:', JSON.stringify(data));
});

setInterval(() => {
  console.log('emit');
  socket.emit('echo', { message: 'TEST' });
}, 2000);
