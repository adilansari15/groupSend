let ioInstance = null;

export function initSocket(io) {
  ioInstance = io;
  io.on('connection', (socket) => {
    socket.on('join_group', (groupId) => {
      if (groupId) {
        socket.join(`group:${groupId}`);
      }
    });

    socket.on('leave_group', (groupId) => {
      if (groupId) {
        socket.leave(`group:${groupId}`);
      }
    });
  });
}

export function emitToGroup(groupId, event, data) {
  if (ioInstance && groupId) {
    ioInstance.to(`group:${groupId}`).emit(event, data);
  }
}
