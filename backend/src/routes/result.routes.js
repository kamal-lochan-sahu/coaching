import { Router } from "express";
import { getStudentResults, getReportCard } from "../controllers/result.controller.js";
import { protect, allRoles } from "../middleware/auth.middleware.js";
const router = Router();
router.use(protect);
router.get("/student/:studentId",     allRoles, getStudentResults);
router.get("/report-card/:studentId", allRoles, getReportCard);
export default router;
