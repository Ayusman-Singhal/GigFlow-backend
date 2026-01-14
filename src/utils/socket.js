let io = null;
const userSockets = new Map();

/**
 * Initialize socket.io with the HTTP server
 * @param {Server} httpServer - HTTP server instance
 * @returns {Server} Socket.io server instance
 */
const initSocket = (httpServer) => {
  const { Server } = require('socket.io');

  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on('register', (userId) => {
      if (!userId) return;

      if (!userSockets.has(userId)) {
        userSockets.set(userId, new Set());
      }
      userSockets.get(userId).add(socket.id);

      socket.userId = userId;

      console.log(`User ${userId} registered with socket ${socket.id}`);
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);

      if (socket.userId && userSockets.has(socket.userId)) {
        userSockets.get(socket.userId).delete(socket.id);

        if (userSockets.get(socket.userId).size === 0) {
          userSockets.delete(socket.userId);
        }
      }
    });
  });

  return io;
};

const getIO = () => io;

const emitToUser = (userId, event, data) => {
  if (!io) {
    console.warn('Socket.io not initialized');
    return;
  }

  const socketIds = userSockets.get(userId);

  if (socketIds && socketIds.size > 0) {
    socketIds.forEach((socketId) => {
      io.to(socketId).emit(event, data);
    });
    console.log(`Emitted ${event} to user ${userId}`);
  }
};

/**
 * Emit an event to all connected clients
 * @param {string} event - Event name
 * @param {object} data - Event data
 */
const emitToAll = (event, data) => {
  if (!io) {
    console.warn('Socket.io not initialized');
    return;
  }

  io.emit(event, data);
};

module.exports = {
  initSocket,
  getIO,
  emitToUser,
  emitToAll,
};
