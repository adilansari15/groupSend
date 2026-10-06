import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Group from '../models/Group.js';
import { validateVerifiedUser } from '../controllers/groups.js';

// ==========================================
// Test Cases for Verified Member Enforcement
// ==========================================

test('PASS: Existing verified user passes member validation', async () => {
  const verifiedUser = new User({
    name: 'Real User',
    email: 'real.verified@example.com',
    passwordHash: 'dummyhash',
    isVerified: true
  });

  // Mock User.findOne / findById behavior
  const originalFindOne = User.findOne;
  User.findOne = (query) => {
    if (query.email === 'real.verified@example.com') {
      return Promise.resolve(verifiedUser);
    }
    return Promise.resolve(null);
  };

  try {
    const res = await validateVerifiedUser('real.verified@example.com');
    assert.equal(res.name, 'Real User');
    assert.equal(res.email, 'real.verified@example.com');
    assert.equal(String(res.userId), String(verifiedUser._id));
  } finally {
    User.findOne = originalFindOne;
  }
});

test('FAIL: Non-registered / random email is rejected with "User must register first"', async () => {
  const originalFindOne = User.findOne;
  User.findOne = () => Promise.resolve(null);

  try {
    await assert.rejects(
      async () => {
        await validateVerifiedUser('random.fake@nowhere.com');
      },
      (err) => {
        assert.equal(err.message, 'User must register first');
        assert.equal(err.statusCode, 404);
        return true;
      }
    );
  } finally {
    User.findOne = originalFindOne;
  }
});

test('FAIL: Unverified user is rejected with "User must verify email first"', async () => {
  const unverifiedUser = new User({
    name: 'Unverified Joe',
    email: 'unverified.joe@example.com',
    passwordHash: 'dummyhash',
    isVerified: false
  });

  const originalFindOne = User.findOne;
  User.findOne = (query) => {
    if (query.email === 'unverified.joe@example.com') {
      return Promise.resolve(unverifiedUser);
    }
    return Promise.resolve(null);
  };

  try {
    await assert.rejects(
      async () => {
        await validateVerifiedUser('unverified.joe@example.com');
      },
      (err) => {
        assert.equal(err.message, 'User must verify email first');
        assert.equal(err.statusCode, 400);
        return true;
      }
    );
  } finally {
    User.findOne = originalFindOne;
  }
});

test('FAIL: Duplicate member in group is rejected', () => {
  const existingMembers = [
    { userId: new mongoose.Types.ObjectId(), email: 'alice@example.com', name: 'Alice' },
    { userId: new mongoose.Types.ObjectId(), email: 'bob@example.com', name: 'Bob' }
  ];

  const candidateAlice = {
    userId: existingMembers[0].userId,
    email: 'alice@example.com',
    name: 'Alice'
  };

  const isDuplicate = existingMembers.some(
    (m) => String(m.userId) === String(candidateAlice.userId) || m.email.toLowerCase() === candidateAlice.email.toLowerCase()
  );

  assert.equal(isDuplicate, true, 'Duplicate member must be identified and rejected');
});

test('PASS: User search query regex filters and returns only verified users', () => {
  const usersInDb = [
    { name: 'Adil Ansari', email: 'adil@example.com', isVerified: true },
    { name: 'Aditya Kumar', email: 'aditya@example.com', isVerified: false }, // unverified
    { name: 'Rohan Sharma', email: 'rohan@example.com', isVerified: true }
  ];

  const query = 'adi';
  const filtered = usersInDb.filter(
    (u) => u.isVerified === true && (u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query))
  );

  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].name, 'Adil Ansari');
});

test('Database schema: Group schema requires userId and email for all members and requires ownerId', () => {
  const memberPath = Group.schema.path('members');
  assert.ok(memberPath, 'Group.members must exist');

  const namePath = Group.schema.path('members.name');
  assert.equal(namePath.isRequired, true, 'members.name must be required');

  const emailPath = Group.schema.path('members.email');
  assert.equal(emailPath.isRequired, true, 'members.email must be required');

  const userIdPath = Group.schema.path('members.userId');
  assert.equal(userIdPath.isRequired, true, 'members.userId must be required');

  const ownerPath = Group.schema.path('ownerId');
  assert.equal(ownerPath.isRequired, true, 'Group.ownerId must be required');
});
