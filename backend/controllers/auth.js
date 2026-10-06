import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { signToken } from '../middleware/auth.js';
import { sendVerificationEmail } from '../src/email.js';

export async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;
    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Generate 6-digit OTP and random secure token
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      isVerified: false,
      verificationCode,
      verificationToken,
      verificationExpires
    });

    let mailResult = null;
    try {
      mailResult = await sendVerificationEmail({
        email: user.email,
        name: user.name,
        code: verificationCode,
        token: verificationToken
      });
    } catch (mailErr) {
      console.error('Failed to send verification email:', mailErr);
    }

    const token = signToken(user);
    res.status(201).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isVerified: user.isVerified
      },
      token,
      requiresVerification: true,
      previewUrl: mailResult?.previewUrl || null,
      verificationCode: process.env.NODE_ENV !== 'production' ? verificationCode : undefined
    });
  } catch (err) {
    next(err);
  }
}

export async function verifyEmail(req, res, next) {
  try {
    const { token, code, email } = req.body;

    let user = null;
    if (token) {
      user = await User.findOne({
        verificationToken: token,
        verificationExpires: { $gt: new Date() }
      });
    } else if (code && email) {
      user = await User.findOne({
        email: email.trim().toLowerCase(),
        verificationCode: code.trim(),
        verificationExpires: { $gt: new Date() }
      });
    }

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired verification code/token' });
    }

    user.isVerified = true;
    user.verificationToken = null;
    user.verificationCode = null;
    user.verificationExpires = null;
    await user.save();

    res.json({
      message: 'Email verified successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isVerified: true
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function resendVerification(req, res, next) {
  try {
    const { email } = req.body;
    if (!email?.trim()) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      return res.status(404).json({ error: 'No account found with this email' });
    }

    if (user.isVerified) {
      return res.status(400).json({ error: 'This email is already verified' });
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    user.verificationCode = verificationCode;
    user.verificationToken = verificationToken;
    user.verificationExpires = verificationExpires;
    await user.save();

    const mailResult = await sendVerificationEmail({
      email: user.email,
      name: user.name,
      code: verificationCode,
      token: verificationToken
    });

    res.json({
      message: 'Verification email sent',
      previewUrl: mailResult?.previewUrl || null,
      verificationCode: process.env.NODE_ENV !== 'production' ? verificationCode : undefined
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email?.trim() || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = signToken(user);
    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isVerified: user.isVerified || false
      },
      token
    });
  } catch (err) {
    next(err);
  }
}

export async function me(req, res) {
  res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      isVerified: req.user.isVerified || false
    }
  });
}

export async function logout(_req, res) {
  res.json({ ok: true });
}
