import { Router } from "express";
import { getAuditLogs } from "../controllers/audit.controller.js";
import { protect, adminAndAbove } from "../middleware/auth.middleware.js";

const router = Router();
router.use(protect);
router.get("/", adminAndAbove, getAuditLogs);

export default router;
