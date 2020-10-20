const Socket = require('../dist').default;

const socket = new Socket('http://localhost:4000');

socket.on('connected', (socket) => {
  console.log('connected:', socket.id);
});

socket.on('disconnected', () => {
  console.log('disconnected');
});

setInterval(() => {
}, 1000);
