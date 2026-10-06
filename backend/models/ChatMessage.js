import mongoose from 'mongoose';

const chatMessageSchema = new mongoose.Schema({
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true,
    index: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  senderName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 60
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  isSystem: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

chatMessageSchema.index({ groupId: 1, createdAt: 1 });

export default mongoose.model('ChatMessage', chatMessageSchema);
