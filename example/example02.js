const Socket = require('../dist').default;

const socket = new Socket('http://localhost:4000');

socket.on('connected', (socket) => {
  console.log('connected:', socket.id);

  socket.emit('join', { group: 'test' });
});

socket.on('disconnected', () => {
  console.log('disconnected');
});

socket.on('send', (data) => {
  console.log('->:', JSON.stringify(data));
});

setInterval(() => {
  // console.log('emit');
  // socket.emit('send', { to: 'test', message: 'TEST' });
}, 2000);
