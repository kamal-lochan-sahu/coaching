import Branch from "../models/Branch.js";
import Batch from "../models/Batch.js";
import Student from "../models/Student.js";
import User from "../models/User.js";
import { ApiError, ApiResponse, asyncHandler } from "../utils/ApiHelpers.js";
import { logAudit } from "../utils/auditLog.utils.js";

const BRANCH_FIELDS = ["name", "address", "phone", "email"];

const pick = (src, keys) =>
  Object.fromEntries(keys.filter((k) => src[k] !== undefined).map((k) => [k, src[k]]));

// A branch may only be closed when nothing active depends on it. Otherwise its batches and
// students would point at a branch that no dropdown shows any more (and a deleted LAST branch
// would stop the institute from adding students at all).
const assertBranchCanBeClosed = async (ownerId, branchId) => {
  const otherBranches = await Branch.countDocuments({ ownerId, isActive: true, _id: { $ne: branchId } });
  if (otherBranches === 0) throw new ApiError(400, "You must keep at least one branch");

  const batches = await Batch.countDocuments({ ownerId, branchId, isActive: true });
  if (batches > 0) throw new ApiError(400, `This branch still has ${batches} active batch(es) — deactivate or move them first`);

  const students = await Student.countDocuments({ ownerId, branchId, status: "active" });
  if (students > 0) throw new ApiError(400, `This branch still has ${students} active student(s) — move or deactivate them first`);
};

// GET /api/branches
export const getBranches = asyncHandler(async (req, res) => {
  const branches = await Branch.find({ ownerId: req.ownerId, isActive: true })
    .sort({ createdAt: -1 });
  return res.status(200).json(new ApiResponse(200, branches, "Branches fetched"));
});

// POST /api/branches
export const createBranch = asyncHandler(async (req, res) => {
  const branch = await Branch.create({ ...pick(req.body, BRANCH_FIELDS), ownerId: req.ownerId });
  logAudit({ req, action:"create", entityType:"Branch", entityId:branch._id, description:`Created branch "${branch.name}"` });
  return res.status(201).json(new ApiResponse(201, branch, "Branch created"));
});

// GET /api/branches/:id
export const getBranch = asyncHandler(async (req, res) => {
  const branch = await Branch.findOne({ _id: req.params.id, ownerId: req.ownerId });
  if (!branch) throw new ApiError(404, "Branch not found");
  return res.status(200).json(new ApiResponse(200, branch));
});

// PUT /api/branches/:id
export const updateBranch = asyncHandler(async (req, res) => {
  const branch = await Branch.findOne({ _id: req.params.id, ownerId: req.ownerId });
  if (!branch) throw new ApiError(404, "Branch not found");

  const updates = pick(req.body, BRANCH_FIELDS);

  if (req.body.managerId !== undefined) {
    const managerId = req.body.managerId || null;
    if (managerId && !(await User.exists({ _id: managerId, isActive: true, $or: [{ _id: req.ownerId }, { ownerId: req.ownerId }] }))) {
      throw new ApiError(404, "Manager not found");
    }
    updates.managerId = managerId;
  }

  // Closing a branch through PUT must follow the same rules as DELETE (it used to bypass them).
  if (req.body.isActive !== undefined && req.body.isActive !== branch.isActive) {
    if (!req.body.isActive) await assertBranchCanBeClosed(req.ownerId, branch._id);
    updates.isActive = req.body.isActive;
  }

  branch.set(updates);
  await branch.save();
  logAudit({ req, action:"update", entityType:"Branch", entityId:branch._id, description:`Updated branch "${branch.name}"` });
  return res.status(200).json(new ApiResponse(200, branch, "Branch updated"));
});

// DELETE /api/branches/:id
export const deleteBranch = asyncHandler(async (req, res) => {
  const branch = await Branch.findOne({ _id: req.params.id, ownerId: req.ownerId });
  if (!branch) throw new ApiError(404, "Branch not found");
  if (!branch.isActive) return res.status(200).json(new ApiResponse(200, null, "Branch already deleted"));

  await assertBranchCanBeClosed(req.ownerId, branch._id);
  branch.isActive = false;
  await branch.save();
  logAudit({ req, action:"delete", entityType:"Branch", entityId:branch._id, description:`Deleted branch "${branch.name}"` });
  return res.status(200).json(new ApiResponse(200, null, "Branch deleted"));
});
