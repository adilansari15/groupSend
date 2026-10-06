import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { signToken } from '../middleware/auth.js';

test('Auth: bcrypt hashes and verifies password correctly', async () => {
  const password = 'mySecretPassword123';
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);

  assert.notEqual(hash, password);
  const isMatch = await bcrypt.compare(password, hash);
  assert.equal(isMatch, true);

  const isWrongMatch = await bcrypt.compare('wrongpassword', hash);
  assert.equal(isWrongMatch, false);
});

test('Auth: signToken generates valid JWT with user id and email', () => {
  const mockUser = { _id: '507f1f77bcf86cd799439011', email: 'adil@example.com' };
  const token = signToken(mockUser);
  assert.ok(token);

  const decoded = jwt.decode(token);
  assert.equal(decoded.id, mockUser._id);
  assert.equal(decoded.email, mockUser.email);
});

test('Auth: verification code generation and expiry validation', () => {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  assert.equal(code.length, 6);
  assert.match(code, /^\d{6}$/);

  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  assert.ok(expires > new Date());

  const expiredDate = new Date(Date.now() - 1000);
  assert.ok(expiredDate < new Date());
});
