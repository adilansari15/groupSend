import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    enum: [
      'payment_created',
      'payment_edited',
      'payment_deleted',
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
    required: true
  },
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true,
    index: true
  },
  payload: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { timestamps: false });

auditLogSchema.index({ groupId: 1, timestamp: -1 });

export default mongoose.model('AuditLog', auditLogSchema);
