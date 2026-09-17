import { Router } from "express";
import {
  getFees, collectFee, getPendingFees, getStudentFees,
  waiveFee, getFeeReport, generateFeeForBatch
} from "../controllers/fee.controller.js";
import { protect, adminAndAbove, allRoles } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { collectFeeSchema, waiveFeeSchema, generateFeeForBatchSchema } from "../validators/schemas.js";

const router = Router();
router.use(protect);

router.get("/",                  allRoles,       getFees);
router.post("/collect",          allRoles,       validate(collectFeeSchema), collectFee);
router.get("/pending",           allRoles,       getPendingFees);
router.get("/report",            allRoles,       getFeeReport);
router.post("/generate-batch",   adminAndAbove,  validate(generateFeeForBatchSchema), generateFeeForBatch);
router.get("/student/:studentId",allRoles,       getStudentFees);
router.put("/:id/waive",         adminAndAbove,  validate(waiveFeeSchema), waiveFee);  // ✅ FIXED: added adminAndAbove

export default router;
