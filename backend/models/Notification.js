import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true,
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: [
      'expense_created',
      'expense_edited',
      'expense_deleted',
      'settlement_requested',
      'settlement_approved',
      'settlement_rejected',
      'settlement_completed',
      'member_added',
      'member_removed'
    ]
  },
  actorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  actorName: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 300
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, { timestamps: true });

notificationSchema.index({ groupId: 1, createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);
