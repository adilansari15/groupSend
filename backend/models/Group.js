import mongoose from 'mongoose';

const memberSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 60 },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
});

export default mongoose.model('Group', new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  description: { type: String, default: '', maxlength: 500 },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  members: [memberSchema],
}, { timestamps: true }));
