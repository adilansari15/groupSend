import Group from '../models/Group.js';
import Notification from '../models/Notification.js';
import AuditLog from '../models/AuditLog.js';

export async function listNotifications(req, res, next) {
  try {
    const { id } = req.params;
    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    const notifications = await Notification.find({ groupId: id })
      .sort('-createdAt')
      .limit(50)
      .lean();

    res.json(notifications);
  } catch (err) {
    next(err);
  }
}

export async function listActivity(req, res, next) {
  try {
    const { id } = req.params;
    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    // Fetch both audit logs and notifications
    const [auditLogs, notifications] = await Promise.all([
      AuditLog.find({ groupId: id }).sort('-timestamp').limit(50).lean(),
      Notification.find({ groupId: id }).sort('-createdAt').limit(50).lean()
    ]);

    // Unify activity feed
    const items = [
      ...auditLogs.map((a) => ({
        id: a._id,
        type: a.action,
        actorName: a.actorName,
        payload: a.payload,
        timestamp: a.timestamp,
        isAudit: true
      })),
      ...notifications.map((n) => ({
        id: n._id,
        type: n.type,
        actorName: n.actorName,
        message: n.message,
        metadata: n.metadata,
        timestamp: n.createdAt,
        isAudit: false
      }))
    ];

    // Deduplicate or sort chronologically descending
    items.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json(items.slice(0, 60));
  } catch (err) {
    next(err);
  }
}
