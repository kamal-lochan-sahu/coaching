import { Router } from "express";
import { getBranches, createBranch, getBranch, updateBranch, deleteBranch } from "../controllers/branch.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { adminAndAbove, ownerOnly } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { createBranchSchema, updateBranchSchema } from "../validators/schemas.js";

const router = Router();
router.use(protect);

router.get("/",    getBranches);
router.post("/",   ownerOnly, validate(createBranchSchema), createBranch);
router.get("/:id",    getBranch);
router.put("/:id",    adminAndAbove, validate(updateBranchSchema), updateBranch);
router.delete("/:id", ownerOnly, deleteBranch);

export default router;
