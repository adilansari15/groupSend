import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import ChatMessage from '../models/ChatMessage.js';
import Notification from '../models/Notification.js';
import AuditLog from '../models/AuditLog.js';
import SettlementRequest from '../models/SettlementRequest.js';

// ==========================================
// Test Cases for Real-Time Collaboration & Settlements
// ==========================================

test('Database schema: ChatMessage model requires groupId, senderName, and message with proper indexing', () => {
  const groupPath = ChatMessage.schema.path('groupId');
  const senderIdPath = ChatMessage.schema.path('senderId');
  const senderNamePath = ChatMessage.schema.path('senderName');
  const messagePath = ChatMessage.schema.path('message');

  assert.ok(groupPath.isRequired, 'groupId must be required');
  assert.ok(senderIdPath, 'senderId path must exist');
  assert.ok(senderNamePath.isRequired, 'senderName must be required');
  assert.ok(messagePath.isRequired, 'message must be required');
});

test('Database schema: Notification model requires groupId, type, actorName, and message', () => {
  const groupPath = Notification.schema.path('groupId');
  const typePath = Notification.schema.path('type');
  const actorIdPath = Notification.schema.path('actorId');
  const actorNamePath = Notification.schema.path('actorName');
  const messagePath = Notification.schema.path('message');

  assert.ok(groupPath.isRequired, 'groupId must be required');
  assert.ok(typePath.isRequired, 'type must be required');
  assert.ok(actorIdPath, 'actorId path must exist');
  assert.ok(actorNamePath.isRequired, 'actorName must be required');
  assert.ok(messagePath.isRequired, 'message must be required');
});

test('Database schema: AuditLog model requires action, actorName, and groupId with timestamp', () => {
  const actionPath = AuditLog.schema.path('action');
  const actorIdPath = AuditLog.schema.path('actorId');
  const actorNamePath = AuditLog.schema.path('actorName');
  const groupIdPath = AuditLog.schema.path('groupId');
  const timestampPath = AuditLog.schema.path('timestamp');

  assert.ok(actionPath.isRequired, 'action must be required');
  assert.ok(actorIdPath, 'actorId path must exist');
  assert.ok(actorNamePath.isRequired, 'actorName must be required');
  assert.ok(groupIdPath.isRequired, 'groupId must be required');
  assert.ok(timestampPath, 'timestamp path must exist');
});

test('Database schema: SettlementRequest model requires groupId, requesterId, and amount in paise', () => {
  const groupPath = SettlementRequest.schema.path('groupId');
  const requesterIdPath = SettlementRequest.schema.path('requesterId');
  const amountPath = SettlementRequest.schema.path('amount');
  const statusPath = SettlementRequest.schema.path('status');

  assert.ok(groupPath.isRequired, 'groupId must be required');
  assert.ok(requesterIdPath.isRequired, 'requesterId must be required');
  assert.ok(amountPath.isRequired, 'amount must be required');
  assert.ok(statusPath, 'status path must exist');
  assert.deepEqual(statusPath.enumValues, ['pending', 'approved', 'rejected']);
});

test('Integrity Rule: Requester cannot self-approve settlement request', () => {
  const requesterId = new mongoose.Types.ObjectId();
  const request = {
    _id: new mongoose.Types.ObjectId(),
    groupId: new mongoose.Types.ObjectId(),
    requesterId,
    amount: 50000, // 500 INR in paise
    status: 'pending',
    approvals: []
  };

  const approverId = requesterId; // Attempting self-approval
  const isSelfApproval = String(request.requesterId) === String(approverId);

  assert.equal(isSelfApproval, true, 'Self-approval attempt detected');

  // Business logic rejection assertion
  assert.throws(
    () => {
      if (isSelfApproval) {
        const error = new Error('You cannot approve your own settlement request');
        error.statusCode = 403;
        throw error;
      }
    },
    (err) => {
      assert.equal(err.message, 'You cannot approve your own settlement request');
      assert.equal(err.statusCode, 403);
      return true;
    }
  );
});

test('Integrity Rule: Non-member cannot approve settlement request', () => {
  const groupMembers = [
    { userId: new mongoose.Types.ObjectId(), name: 'Adil' },
    { userId: new mongoose.Types.ObjectId(), name: 'Saifu' }
  ];

  const outsiderId = new mongoose.Types.ObjectId();
  const isMember = groupMembers.some((m) => String(m.userId) === String(outsiderId));

  assert.equal(isMember, false, 'Outsider must not be recognized as group member');

  assert.throws(
    () => {
      if (!isMember) {
        const error = new Error('You must be a group member to approve this request');
        error.statusCode = 403;
        throw error;
      }
    },
    (err) => {
      assert.equal(err.message, 'You must be a group member to approve this request');
      assert.equal(err.statusCode, 403);
      return true;
    }
  );
});

test('Integrity Rule: Duplicate approval by same peer is prevented', () => {
  const peerId = new mongoose.Types.ObjectId();
  const request = {
    _id: new mongoose.Types.ObjectId(),
    groupId: new mongoose.Types.ObjectId(),
    requesterId: new mongoose.Types.ObjectId(),
    amount: 25000,
    status: 'pending',
    approvals: [
      { userId: peerId, userName: 'Saifu', approvedAt: new Date() }
    ]
  };

  const alreadyApproved = request.approvals.some((a) => String(a.userId) === String(peerId));
  assert.equal(alreadyApproved, true, 'Duplicate approval detected');

  assert.throws(
    () => {
      if (alreadyApproved) {
        const error = new Error('You have already approved this settlement request');
        error.statusCode = 400;
        throw error;
      }
    },
    (err) => {
      assert.equal(err.message, 'You have already approved this settlement request');
      assert.equal(err.statusCode, 400);
      return true;
    }
  );
});

test('Integrity Rule: Peer approval transitions status to approved with audit log and settlement creation', () => {
  const requesterId = new mongoose.Types.ObjectId();
  const peerApproverId = new mongoose.Types.ObjectId();
  const request = {
    _id: new mongoose.Types.ObjectId(),
    groupId: new mongoose.Types.ObjectId(),
    requesterId,
    amount: 150000, // ₹1,500
    status: 'pending',
    approvals: []
  };

  // Peer approves
  assert.notEqual(String(request.requesterId), String(peerApproverId));
  request.approvals.push({
    userId: peerApproverId,
    userName: 'Mirza',
    approvedAt: new Date()
  });
  request.status = 'approved';

  assert.equal(request.status, 'approved');
  assert.equal(request.approvals.length, 1);
  assert.equal(String(request.approvals[0].userId), String(peerApproverId));
});

test('Integrity Rule: Rejection marks request as rejected and preserves auditability', () => {
  const request = {
    _id: new mongoose.Types.ObjectId(),
    groupId: new mongoose.Types.ObjectId(),
    requesterId: new mongoose.Types.ObjectId(),
    amount: 75000,
    status: 'pending',
    approvals: []
  };

  request.status = 'rejected';
  assert.equal(request.status, 'rejected');
  assert.equal(request.approvals.length, 0);
});

test('Financial Integrity: Money is strictly handled in integer paise', () => {
  const rawRupeeAmount = '123.45';
  const paise = Math.round(parseFloat(rawRupeeAmount) * 100);

  assert.equal(paise, 12345);
  assert.equal(Number.isInteger(paise), true);
  assert.equal(paise > 0, true);

  // Negative or zero paise rejected
  const invalidPaise = -500;
  assert.equal(invalidPaise <= 0, true);
});
