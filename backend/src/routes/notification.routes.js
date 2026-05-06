import { Router } from "express";
import { sendNotification, getNotificationHistory } from "../controllers/notification.controller.js";
import { protect, adminAndAbove, allRoles } from "../middleware/auth.middleware.js";
const router = Router();
router.use(protect);
router.post("/send",  adminAndAbove, sendNotification);
router.get("/history",allRoles, getNotificationHistory);
export default router;
