import AuditLog from "../models/AuditLog.js";
import { ApiResponse, asyncHandler } from "../utils/ApiHelpers.js";

// GET /api/audit-logs?entityType=&action=&page=&limit=
export const getAuditLogs = asyncHandler(async (req, res) => {
  const { entityType, action, page = 1, limit = 25 } = req.query;
  const filter = { ownerId: req.ownerId };
  if (entityType) filter.entityType = entityType;
  if (action)     filter.action     = action;

  const skip = (Number(page) - 1) * Number(limit);
  const [logs, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    AuditLog.countDocuments(filter),
  ]);

  return res.json(new ApiResponse(200, { logs, total, page: Number(page), pages: Math.ceil(total / limit) }));
});
