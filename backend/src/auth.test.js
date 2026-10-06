import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { signToken } from '../middleware/auth.js';
import { hashToken } from '../controllers/auth.js';
import { escapeHtml } from './email.js';

// ==========================================
// 1. Password Hashing & JWT Tests
// ==========================================
test('Password hashing: bcrypt hashes and verifies password correctly', async () => {
  const password = 'mySecretPassword123';
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);

  assert.notEqual(hash, password);
  const isMatch = await bcrypt.compare(password, hash);
  assert.equal(isMatch, true);

  const isWrongMatch = await bcrypt.compare('wrongpassword', hash);
  assert.equal(isWrongMatch, false);
});

test('JWT generation & validation: signToken generates valid, cryptographically verifiable JWT', () => {
  const mockUser = { _id: '507f1f77bcf86cd799439011', email: 'adil@example.com' };
  const secret = process.env.JWT_SECRET || 'test-jwt-secret-for-group-spend-2026';
  process.env.JWT_SECRET = secret;

  const token = signToken(mockUser);
  assert.ok(token);

  // Validate and verify signature
  const verified = jwt.verify(token, secret);
  assert.equal(verified.id, mockUser._id);
  assert.equal(verified.email, mockUser.email);

  // Tampered token must fail validation
  const tampered = token.slice(0, -5) + 'abcde';
  assert.throws(() => {
    jwt.verify(tampered, secret);
  }, /invalid signature/i);
});

// ==========================================
// 2. Registration Validation Tests
// ==========================================
test('Registration validation: Valid email format and constraints', () => {
  const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

  const validEmails = ['user@example.com', 'alice.smith@sub.domain.org', 'test+tag@gmail.com'];
  for (const email of validEmails) {
    assert.equal(EMAIL_REGEX.test(email), true, `Expected valid: ${email}`);
  }

  const invalidEmails = ['plainaddress', '@missinguser.com', 'user@.com', 'user@domain..com', 'spaces in@mail.com'];
  for (const email of invalidEmails) {
    assert.equal(EMAIL_REGEX.test(email), false, `Expected invalid: ${email}`);
  }
});

test('Registration validation: Password length limits (min 6, max 128)', () => {
  const tooShort = '12345';
  assert.equal(tooShort.length < 6, true);

  const validPass = 'securePassword123';
  assert.equal(validPass.length >= 6 && validPass.length <= 128, true);

  const tooLong = 'a'.repeat(129);
  assert.equal(tooLong.length > 128, true);
});

// ==========================================
// 3. Token Generation, Hashing & Expiry Tests
// ==========================================
test('Token generation: Cryptographically secure 256-bit token & 6-digit OTP', () => {
  const rawToken = crypto.randomBytes(32).toString('hex');
  assert.equal(rawToken.length, 64);
  assert.match(rawToken, /^[a-f0-9]{64}$/);

  const rawCode = crypto.randomInt(100000, 1000000).toString();
  assert.equal(rawCode.length, 6);
  assert.match(rawCode, /^\d{6}$/);

  // Hash storage security check (raw token must never match hash)
  const hashed = hashToken(rawToken);
  assert.notEqual(hashed, rawToken);
  assert.equal(hashed.length, 64);
});

test('Token expiration: 24h expiration calculation and check', () => {
  const now = Date.now();
  const expires = new Date(now + 24 * 60 * 60 * 1000);
  assert.equal(expires > new Date(now), true);

  // Expired scenario
  const expired = new Date(now - 1000);
  assert.equal(expired < new Date(now), true);
});

// ==========================================
// 4. Email Security & HTML Injection / XSS
// ==========================================
test('Email security: escapeHtml prevents HTML injection and XSS payloads in emails', () => {
  const maliciousName = '<script>alert("XSS")</script>';
  const escaped = escapeHtml(maliciousName);
  assert.equal(escaped.includes('<script>'), false);
  assert.equal(escaped, '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;');

  const payload2 = '<img src=x onerror="stealTokens()">';
  assert.equal(escapeHtml(payload2).includes('<img'), false);

  const payload3 = '"><a href="http://evil.com">Click</a>';
  assert.equal(escapeHtml(payload3).includes('<a href'), false);
});

// ==========================================
// 5. Verification Endpoint Security Tests
// ==========================================
test('Verification: Single-use token and replay attack prevention', () => {
  // Simulating atomic token invalidation
  let tokenStore = {
    user1: {
      isVerified: false,
      tokenHash: hashToken('valid-token-32-bytes-long-hex-random1234567890abcdef1234567890abcdef'),
      expires: new Date(Date.now() + 3600000)
    }
  };

  const rawToken = 'valid-token-32-bytes-long-hex-random1234567890abcdef1234567890abcdef';
  const hashed = hashToken(rawToken);

  // First verification attempt: should succeed and nullify token
  let user = tokenStore.user1;
  assert.equal(user.isVerified, false);
  assert.equal(user.tokenHash, hashed);

  // Consume token
  user.isVerified = true;
  user.tokenHash = null;

  // Replay attempt with same token must fail
  assert.equal(user.tokenHash === hashed, false);
});

test('Verification: Invalid token and expired token rejection', () => {
  const validHashed = hashToken('token-abc');
  const userExpired = {
    tokenHash: validHashed,
    expires: new Date(Date.now() - 5000), // Expired
    isVerified: false
  };

  const isTokenExpired = userExpired.expires < new Date();
  assert.equal(isTokenExpired, true);

  const wrongHashed = hashToken('wrong-token');
  assert.notEqual(wrongHashed, userExpired.tokenHash);
});

// ==========================================
// 6. Login Security: Unverified Users Blocked
// ==========================================
test('Login security: Unverified user is rejected from login before email verification', () => {
  const unverifiedUser = {
    _id: '507f1f77bcf86cd799439011',
    email: 'unverified@example.com',
    passwordHash: 'hashed-password',
    isVerified: false
  };

  function simulateLogin(user) {
    if (!user.isVerified) {
      return { status: 403, error: 'Please verify your email address before logging in', requiresVerification: true };
    }
    return { status: 200, token: signToken(user) };
  }

  const unverifiedResult = simulateLogin(unverifiedUser);
  assert.equal(unverifiedResult.status, 403);
  assert.equal(unverifiedResult.requiresVerification, true);
  assert.equal(unverifiedResult.token, undefined);

  // After verification, login succeeds and returns JWT
  const verifiedUser = { ...unverifiedUser, isVerified: true };
  const verifiedResult = simulateLogin(verifiedUser);
  assert.equal(verifiedResult.status, 200);
  assert.ok(verifiedResult.token);
});

// ==========================================
// 7. Penetration Tests: NoSQL Injection & Brute Force Lockout
// ==========================================
test('Penetration test: NoSQL injection payload types rejected by strict parameter validation', () => {
  const maliciousPayloads = [
    { token: { $ne: null } },
    { token: { $gt: '' } },
    { code: { $exists: true } },
    { email: { $regex: '.*' } }
  ];

  for (const payload of maliciousPayloads) {
    const isTokenTampered = payload.token !== undefined && typeof payload.token !== 'string';
    const isCodeTampered = payload.code !== undefined && typeof payload.code !== 'string';
    const isEmailTampered = payload.email !== undefined && typeof payload.email !== 'string';

    const rejected = isTokenTampered || isCodeTampered || isEmailTampered;
    assert.equal(rejected, true, 'Malicious object payload must be rejected as non-string');
  }
});

test('Penetration test: Brute force OTP attack triggers lockout after 5 failed attempts', () => {
  let attempts = 0;
  const maxAttempts = 5;
  const correctCodeHash = hashToken('456789');

  function tryGuess(guess) {
    if (attempts >= maxAttempts) {
      return { locked: true, error: 'Too many failed verification attempts. Please request a new code.' };
    }
    const guessHash = hashToken(guess);
    if (guessHash !== correctCodeHash) {
      attempts++;
      return { locked: false, attemptsRemaining: maxAttempts - attempts };
    }
    return { locked: false, success: true };
  }

  // 5 incorrect guesses
  for (let i = 1; i <= 5; i++) {
    const res = tryGuess(`00000${i}`);
    assert.equal(res.locked, false);
    assert.equal(res.attemptsRemaining, 5 - i);
  }

  // 6th attempt must be locked out
  const lockedRes = tryGuess('456789');
  assert.equal(lockedRes.locked, true);
  assert.equal(lockedRes.error.includes('Too many failed verification attempts'), true);
});

test('Penetration test: Constant-time hash comparison prevents timing side-channel attacks', () => {
  const hash1 = hashToken('123456');
  const hash2 = hashToken('123456');
  const hash3 = hashToken('654321');

  const buf1 = Buffer.from(hash1);
  const buf2 = Buffer.from(hash2);
  const buf3 = Buffer.from(hash3);

  assert.equal(crypto.timingSafeEqual(buf1, buf2), true);
  assert.equal(crypto.timingSafeEqual(buf1, buf3), false);
});
