import { Router } from "express";
import { getBatchTimetable, createTimetable, updateTimetable } from "../controllers/timetable.controller.js";
import { protect, adminAndAbove, allRoles } from "../middleware/auth.middleware.js";
const router = Router();
router.use(protect);
router.get("/batch/:batchId", allRoles, getBatchTimetable);
router.post("/",              adminAndAbove, createTimetable);
router.put("/:id",            adminAndAbove, updateTimetable);
export default router;
