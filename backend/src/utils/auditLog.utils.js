import AuditLog from "../models/AuditLog.js";

/**
 * Record an audit log entry. Best-effort — logs to console on failure but
 * never throws, so a broken audit write can never block or fail the real
 * action (fee collection, student update, etc.) that triggered it.
 */
export const logAudit = async ({ req, action, entityType, entityId, description, meta }) => {
  try {
    await AuditLog.create({
      ownerId:   req.ownerId,
      userId:    req.user._id,
      userName:  req.user.name,
      userRole:  req.user.role,
      action, entityType, entityId, description, meta,
    });
  } catch (e) {
    console.error(`Audit log failed (${entityType} ${action}): ${e.message}`);
  }
};
