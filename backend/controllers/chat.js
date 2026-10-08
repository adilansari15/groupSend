import Group from '../models/Group.js';
import ChatMessage from '../models/ChatMessage.js';
import { emitToGroup } from '../src/socket.js';

export async function listChatMessages(req, res, next) {
  try {
    const { id } = req.params;
    const group = req.group || (await Group.findById(id));
    if (!group) return res.status(404).json({ error: 'Group not found' });

    // Verify membership if user is authenticated and not already checked by middleware
    if (req.user && !req.group) {
      const isMember = String(group.ownerId) === String(req.user._id) ||
        group.members.some((m) => m.userId && String(m.userId) === String(req.user._id));
      if (!isMember) {
        return res.status(403).json({ error: 'Unauthorized: You are not a member of this group' });
      }
    }

    const messages = await ChatMessage.find({ groupId: id })
      .sort('createdAt')
      .limit(100)
      .lean();

    res.json(messages);
  } catch (err) {
    next(err);
  }
}

export async function sendChatMessage(req, res, next) {
  try {
    const { id } = req.params;
    const { message } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }

    const group = req.group || (await Group.findById(id));
    if (!group) return res.status(404).json({ error: 'Group not found' });

    // Verify membership
    const isMember = String(group.ownerId) === String(req.user._id) ||
      group.members.some((m) => m.userId && String(m.userId) === String(req.user._id));
    if (!isMember) {
      return res.status(403).json({ error: 'Unauthorized: You are not a member of this group' });
    }

    const chatMessage = await ChatMessage.create({
      groupId: id,
      senderId: req.user._id,
      senderName: req.user.name,
      message: message.trim(),
      isSystem: false
    });

    emitToGroup(id, 'new-message', chatMessage);

    res.status(201).json(chatMessage);
  } catch (err) {
    next(err);
  }
}
