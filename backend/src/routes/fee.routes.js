import { Router } from "express";
import {
  getFees, collectFee, getPendingFees, getStudentFees,
  waiveFee, getFeeReport, generateFeeForBatch
} from "../controllers/fee.controller.js";
import { protect, adminAndAbove, allRoles } from "../middleware/auth.middleware.js";

const router = Router();
router.use(protect);

router.get("/",                  allRoles,       getFees);
router.post("/collect",          allRoles,       collectFee);
router.get("/pending",           allRoles,       getPendingFees);
router.get("/report",            allRoles,       getFeeReport);
router.post("/generate-batch",   adminAndAbove,  generateFeeForBatch);
router.get("/student/:studentId",allRoles,       getStudentFees);
router.put("/:id/waive",         adminAndAbove,  waiveFee);  // ✅ FIXED: added adminAndAbove

export default router;
