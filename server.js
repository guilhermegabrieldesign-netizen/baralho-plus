const path = require('path');
const http = require('http');
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const { Server } = require('socket.io');
const authRoutes = require('./routes/auth');
const coinsRoutes = require('./routes/coins');
const gamesRoutes = require('./routes/games');
const { initializeDatabase } = require('./database/db');

initializeDatabase();

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = 3000;
let onlineConnections = 0;

app.use(
  cors({
    origin: true,
    credentials: true
  })
);

app.use(express.json());
app.use(
  session({
    secret: 'baralho-plus-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24
    }
  })
);

app.use('/auth', authRoutes);
app.use('/coins', coinsRoutes);
app.use('/games', gamesRoutes);
app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

io.on('connection', (socket) => {
  onlineConnections += 1;
  io.emit('online_count', onlineConnections);

  socket.on('disconnect', () => {
    onlineConnections = Math.max(onlineConnections - 1, 0);
    io.emit('online_count', onlineConnections);
  });
});

setInterval(() => {
  io.emit('online_count', onlineConnections);
}, 5000);

server.listen(PORT, () => {
  console.log(`Baralho+ rodando em http://localhost:${PORT}`);
});
