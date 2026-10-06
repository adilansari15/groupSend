import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 60
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    maxlength: 100,
    index: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  isVerified: {
    type: Boolean,
    default: false,
    index: true
  },
  // Stored as SHA-256 hashes to prevent plaintext token leakage in DB dumps
  verificationTokenHash: {
    type: String,
    default: null,
    alias: 'verificationToken',
    index: { sparse: true }
  },
  verificationCodeHash: {
    type: String,
    default: null
  },
  verificationTokenExpiry: {
    type: Date,
    default: null
  },
  // Counter to prevent brute force guessing on 6-digit OTP codes
  verificationAttempts: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

// Compound index for efficient, safe OTP verification lookups
userSchema.index({ email: 1, isVerified: 1 });

export default mongoose.model('User', userSchema);
