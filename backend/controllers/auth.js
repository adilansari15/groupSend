import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { signToken } from '../middleware/auth.js';
import { sendVerificationEmail } from '../src/email.js';

// Standard RFC-5322 compatible email regex
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/**
 * Creates SHA-256 hash of raw tokens/codes to prevent database dump exposure.
 */
export function hashToken(value) {
  if (typeof value !== 'string') return '';
  return crypto.createHash('sha256').update(value).digest('hex');
}

/**
 * Register a new user.
 * - Hashes password with bcrypt.
 * - Generates cryptographically secure 256-bit token & 6-digit OTP.
 * - Stores SHA-256 hashes in database.
 * - Does NOT issue a JWT token (user must verify email first).
 */
export async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;

    // Strict type and parameter validation
    if (typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Name, email, and password must be valid strings' });
    }

    const trimmedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!trimmedName || !normalizedEmail || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    if (trimmedName.length > 60) {
      return res.status(400).json({ error: 'Name must be 60 characters or fewer' });
    }

    if (!EMAIL_REGEX.test(normalizedEmail) || normalizedEmail.length > 100) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    if (password.length > 128) {
      return res.status(400).json({ error: 'Password must be 128 characters or fewer' });
    }

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Cryptographically secure token (256 bits) and 6-digit OTP (100000 - 999999)
    const rawVerificationToken = crypto.randomBytes(32).toString('hex');
    const rawVerificationCode = crypto.randomInt(100000, 1000000).toString();
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const user = await User.create({
      name: trimmedName,
      email: normalizedEmail,
      passwordHash,
      isVerified: false,
      verificationTokenHash: hashToken(rawVerificationToken),
      verificationCodeHash: hashToken(rawVerificationCode),
      verificationTokenExpiry,
      verificationAttempts: 0
    });

    let mailResult = null;
    try {
      mailResult = await sendVerificationEmail({
        email: user.email,
        name: user.name,
        code: rawVerificationCode,
        token: rawVerificationToken
      });
    } catch (mailErr) {
      console.error('Failed to send verification email:', mailErr);
    }

    // Security fix: Do NOT issue JWT before verification. User must verify email.
    res.status(201).json({
      message: 'Registration successful. Please verify your email to log in.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isVerified: false
      },
      requiresVerification: true,
      previewUrl: mailResult?.previewUrl || null,
      verificationCode: process.env.NODE_ENV === 'test' ? rawVerificationCode : undefined
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Verifies email via token (one-click URL link) or 6-digit code.
 * Issues JWT upon successful verification.
 */
export async function verifyEmail(req, res, next) {
  try {
    const { token, code, email } = req.body;

    // Parameter tampering & NoSQL injection mitigation: enforce strict types
    if (token !== undefined && typeof token !== 'string') {
      return res.status(400).json({ error: 'Invalid verification token format' });
    }
    if (code !== undefined && typeof code !== 'string') {
      return res.status(400).json({ error: 'Invalid verification code format' });
    }
    if (email !== undefined && typeof email !== 'string') {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    let verifiedUser = null;

    if (token) {
      const cleanToken = token.trim();
      if (!/^[a-f0-9]{64}$/i.test(cleanToken)) {
        return res.status(400).json({ error: 'Invalid or expired verification token' });
      }

      const hashedToken = hashToken(cleanToken);

      // Atomic update prevents race conditions and replay attacks
      verifiedUser = await User.findOneAndUpdate(
        {
          verificationTokenHash: hashedToken,
          verificationTokenExpiry: { $gt: new Date() },
          isVerified: false
        },
        {
          $set: {
            isVerified: true,
            verificationTokenHash: null,
            verificationCodeHash: null,
            verificationTokenExpiry: null,
            verificationAttempts: 0
          }
        },
        { new: true }
      );

      if (!verifiedUser) {
        return res.status(400).json({ error: 'Invalid or expired verification token' });
      }
    } else if (code && email) {
      const cleanCode = code.trim();
      const normalizedEmail = email.trim().toLowerCase();

      if (!/^\d{6}$/.test(cleanCode)) {
        return res.status(400).json({ error: 'Verification code must be exactly 6 digits' });
      }

      const user = await User.findOne({
        email: normalizedEmail,
        isVerified: false
      });

      if (!user) {
        return res.status(400).json({ error: 'Invalid or expired verification code' });
      }

      // Check token expiry
      if (!user.verificationTokenExpiry || user.verificationTokenExpiry < new Date()) {
        return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
      }

      // Brute-force protection: Lockout after 5 failed attempts
      if (user.verificationAttempts >= 5) {
        user.verificationCodeHash = null;
        user.verificationTokenHash = null;
        user.verificationTokenExpiry = null;
        await user.save();
        return res.status(429).json({ error: 'Too many failed verification attempts. Please request a new code.' });
      }

      const hashedInputCode = hashToken(cleanCode);

      // Constant-time comparison between code hashes
      const isCodeValid = user.verificationCodeHash &&
        crypto.timingSafeEqual(Buffer.from(hashedInputCode), Buffer.from(user.verificationCodeHash));

      if (!isCodeValid) {
        user.verificationAttempts += 1;
        await user.save();
        const remaining = 5 - user.verificationAttempts;
        return res.status(400).json({
          error: `Invalid verification code. ${remaining > 0 ? `${remaining} attempts remaining.` : 'Code locked.'}`
        });
      }

      // Success: activate user and clear verification fields
      user.isVerified = true;
      user.verificationTokenHash = null;
      user.verificationCodeHash = null;
      user.verificationTokenExpiry = null;
      user.verificationAttempts = 0;
      await user.save();

      verifiedUser = user;
    } else {
      return res.status(400).json({ error: 'Verification token or email with 6-digit code is required' });
    }

    // Securely issue JWT token after email is verified
    const jwtToken = signToken(verifiedUser);

    res.json({
      message: 'Email verified successfully',
      user: {
        id: verifiedUser._id,
        name: verifiedUser.name,
        email: verifiedUser.email,
        isVerified: true
      },
      token: jwtToken
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Resends verification code and link.
 * Implements anti-enumeration: returns identical message regardless of whether user exists or is verified.
 */
export async function resendVerification(req, res, next) {
  try {
    const { email } = req.body;
    if (typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ error: 'Valid email address is required' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    let previewUrl = null;
    let devCode = undefined;

    if (user && !user.isVerified) {
      const rawVerificationToken = crypto.randomBytes(32).toString('hex');
      const rawVerificationCode = crypto.randomInt(100000, 1000000).toString();
      const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

      user.verificationTokenHash = hashToken(rawVerificationToken);
      user.verificationCodeHash = hashToken(rawVerificationCode);
      user.verificationTokenExpiry = verificationTokenExpiry;
      user.verificationAttempts = 0;
      await user.save();

      try {
        const mailResult = await sendVerificationEmail({
          email: user.email,
          name: user.name,
          code: rawVerificationCode,
          token: rawVerificationToken
        });
        previewUrl = mailResult?.previewUrl || null;
      } catch (mailErr) {
        console.error('Failed to send verification email:', mailErr);
      }

      if (process.env.NODE_ENV === 'test') {
        devCode = rawVerificationCode;
      }
    }

    // Mitigate email enumeration: return constant response
    res.json({
      message: 'If an unverified account exists with this email, a verification link has been sent.',
      previewUrl,
      verificationCode: devCode
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Login user.
 * Blocks unverified users from logging in or receiving JWT tokens.
 */
export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
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

    // Security fix: Ensure unverified users cannot login or obtain a JWT
    if (!user.isVerified) {
      return res.status(403).json({
        error: 'Please verify your email address before logging in',
        requiresVerification: true,
        email: user.email
      });
    }

    const token = signToken(user);
    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isVerified: true
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
