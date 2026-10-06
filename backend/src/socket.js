import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../middleware/auth.js';
import User from '../models/User.js';
import Group from '../models/Group.js';
import ChatMessage from '../models/ChatMessage.js';
import Notification from '../models/Notification.js';

let ioInstance = null;

export function initSocket(io) {
  ioInstance = io;

  // Socket Authentication Handshake Middleware
  io.use(async (socket, next) => {
    try {
      const rawToken = socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '');

      if (rawToken) {
        try {
          const decoded = jwt.verify(rawToken, getJwtSecret());
          const user = await User.findById(decoded.id).select('-passwordHash');
          if (user) {
            socket.user = user;
          }
        } catch (_tokenErr) {
          // Token invalid, allow anonymous or reject if strictly required
        }
      }
      next();
    } catch (err) {
      next(err);
    }
  });

  io.on('connection', (socket) => {
    // Join group room with membership validation
    const handleJoin = async (groupId) => {
      if (!groupId) return;
      try {
        const group = await Group.findById(groupId);
        if (!group) return;

        // If authenticated user, verify membership
        if (socket.user) {
          const isMember = String(group.ownerId) === String(socket.user._id) ||
            group.members.some((m) => m.userId && String(m.userId) === String(socket.user._id));
          if (!isMember) {
            socket.emit('error', { message: 'Unauthorized: You are not a member of this group' });
            return;
          }
        }

        socket.join(`group:${groupId}`);
      } catch (err) {
        console.error('Error in socket join-group:', err);
      }
    };

    socket.on('join_group', handleJoin);
    socket.on('join-group', handleJoin);

    const handleLeave = (groupId) => {
      if (groupId) {
        socket.leave(`group:${groupId}`);
      }
    };

    socket.on('leave_group', handleLeave);
    socket.on('leave-group', handleLeave);

    // Real-time Chat message handling
    socket.on('send-message', async (data) => {
      try {
        const { groupId, message } = data;
        if (!groupId || !message?.trim()) return;

        if (!socket.user) {
          socket.emit('error', { message: 'Authentication required to send chat messages' });
          return;
        }

        const group = await Group.findById(groupId);
        if (!group) return;

        // Verify membership
        const isMember = String(group.ownerId) === String(socket.user._id) ||
          group.members.some((m) => m.userId && String(m.userId) === String(socket.user._id));

        if (!isMember) {
          socket.emit('error', { message: 'Unauthorized: You are not a member of this group' });
          return;
        }

        const chatMessage = await ChatMessage.create({
          groupId,
          senderId: socket.user._id,
          senderName: socket.user.name,
          message: message.trim(),
          isSystem: false
        });

        const payload = {
          _id: chatMessage._id,
          groupId: chatMessage.groupId,
          senderId: chatMessage.senderId,
          senderName: chatMessage.senderName,
          message: chatMessage.message,
          isSystem: false,
          createdAt: chatMessage.createdAt
        };

        io.to(`group:${groupId}`).emit('new-message', payload);
      } catch (err) {
        console.error('Failed to handle send-message socket event:', err);
      }
    });
  });
}

/**
 * Emits an event to all connected sockets in a group room.
 */
export function emitToGroup(groupId, event, data) {
  if (ioInstance && groupId) {
    ioInstance.to(`group:${groupId}`).emit(event, data);
  }
}

/**
 * Persists a notification to MongoDB and broadcasts it in real time to the group.
 */
export async function createAndBroadcastNotification({ groupId, type, actorId, actorName, message, metadata = {} }) {
  try {
    const notification = await Notification.create({
      groupId,
      type,
      actorId: actorId || null,
      actorName: actorName || 'System',
      message,
      metadata
    });

    emitToGroup(groupId, 'group-notification', notification);
    return notification;
  } catch (err) {
    console.error('Failed to create and broadcast notification:', err);
    return null;
  }
}
