import Batch from "../models/Batch.js";
import Student from "../models/Student.js";
import { ApiError, ApiResponse, asyncHandler } from "../utils/ApiHelpers.js";
import { invalidateDashboardCache } from "../config/redis.js";
import { logAudit } from "../utils/auditLog.utils.js";

export const getBatches = asyncHandler(async (req, res) => {
  const { branchId, isActive = true } = req.query;
  const filter = { ownerId: req.ownerId };
  if (branchId) filter.branchId = branchId;
  if (isActive !== "all") filter.isActive = isActive === "true";

  const batches = await Batch.find(filter).populate("teacherId","name email").sort({ createdAt: -1 });
  return res.json(new ApiResponse(200, batches));
});

export const createBatch = asyncHandler(async (req, res) => {
  const batch = await Batch.create({ ownerId: req.ownerId, ...req.body });
  await invalidateDashboardCache(req.ownerId);
  logAudit({ req, action:"create", entityType:"Batch", entityId:batch._id, description:`Created batch "${batch.name}"` });
  return res.status(201).json(new ApiResponse(201, batch, "Batch created"));
});

export const getBatch = asyncHandler(async (req, res) => {
  const batch = await Batch.findOne({ _id: req.params.id, ownerId: req.ownerId })
    .populate("teacherId","name email phone");
  if (!batch) throw new ApiError(404, "Batch not found");
  return res.json(new ApiResponse(200, batch));
});

export const updateBatch = asyncHandler(async (req, res) => {
  const batch = await Batch.findOneAndUpdate(
    { _id: req.params.id, ownerId: req.ownerId },
    req.body, { new: true, runValidators: true }
  );
  if (!batch) throw new ApiError(404, "Batch not found");
  await invalidateDashboardCache(req.ownerId);
  logAudit({ req, action:"update", entityType:"Batch", entityId:batch._id, description:`Updated batch "${batch.name}"` });
  return res.json(new ApiResponse(200, batch, "Batch updated"));
});

export const deleteBatch = asyncHandler(async (req, res) => {
  const activeStudents = await Student.countDocuments({ currentBatch: req.params.id, status: "active" });
  if (activeStudents > 0) throw new ApiError(400, `Cannot delete — ${activeStudents} active students in this batch`);
  const batch = await Batch.findOneAndUpdate({ _id: req.params.id, ownerId: req.ownerId }, { isActive: false }, { new: true });
  await invalidateDashboardCache(req.ownerId);
  logAudit({ req, action:"delete", entityType:"Batch", entityId:req.params.id, description:`Deleted batch "${batch?.name||""}"` });
  return res.json(new ApiResponse(200, null, "Batch deactivated"));
});

export const getBatchStudents = asyncHandler(async (req, res) => {
  const students = await Student.find({ currentBatch: req.params.id, status: "active" }).sort({ name: 1 });
  return res.json(new ApiResponse(200, students));
});
