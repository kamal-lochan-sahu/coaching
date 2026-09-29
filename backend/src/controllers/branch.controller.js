import Branch from "../models/Branch.js";
import { ApiError, ApiResponse, asyncHandler } from "../utils/ApiHelpers.js";
import { logAudit } from "../utils/auditLog.utils.js";

// GET /api/branches
export const getBranches = asyncHandler(async (req, res) => {
  const branches = await Branch.find({ ownerId: req.ownerId, isActive: true })
    .sort({ createdAt: -1 });
  return res.status(200).json(new ApiResponse(200, branches, "Branches fetched"));
});

// POST /api/branches
export const createBranch = asyncHandler(async (req, res) => {
  const { name, address, phone, email } = req.body;
  const branch = await Branch.create({
    ownerId: req.ownerId, name, address, phone, email,
  });
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
  const branch = await Branch.findOneAndUpdate(
    { _id: req.params.id, ownerId: req.ownerId },
    req.body,
    { new: true, runValidators: true }
  );
  if (!branch) throw new ApiError(404, "Branch not found");
  logAudit({ req, action:"update", entityType:"Branch", entityId:branch._id, description:`Updated branch "${branch.name}"` });
  return res.status(200).json(new ApiResponse(200, branch, "Branch updated"));
});

// DELETE /api/branches/:id
export const deleteBranch = asyncHandler(async (req, res) => {
  const branch = await Branch.findOneAndUpdate(
    { _id: req.params.id, ownerId: req.ownerId },
    { isActive: false },
    { new: true }
  );
  if (!branch) throw new ApiError(404, "Branch not found");
  logAudit({ req, action:"delete", entityType:"Branch", entityId:branch._id, description:`Deleted branch "${branch.name}"` });
  return res.status(200).json(new ApiResponse(200, null, "Branch deleted"));
});
