import AuditLog from '../models/AuditLog.js';

/**
 * Creates an immutable audit log entry for group financial and membership events.
 */
export async function recordAuditLog({ action, actorId, actorName, groupId, payload = {} }) {
  try {
    const entry = await AuditLog.create({
      action,
      actorId: actorId || null,
      actorName: actorName || 'System',
      groupId,
      payload,
      timestamp: new Date()
    });
    return entry;
  } catch (err) {
    console.error('Failed to write audit log entry:', err);
    return null;
  }
}
