import Batch from "../models/Batch.js";
import Branch from "../models/Branch.js";
import Student from "../models/Student.js";
import User from "../models/User.js";
import { ApiError, ApiResponse, asyncHandler } from "../utils/ApiHelpers.js";
import { invalidateDashboardCache } from "../config/redis.js";
import { logAudit } from "../utils/auditLog.utils.js";

// The only fields a client may set on a batch. The rest — ownerId, enrolled (counted by the server
// from the real students), isActive (changed only by the rules below) — is not up to the request.
const BATCH_FIELDS = ["name", "description", "subjects", "timing", "capacity", "feeStructure"];

const pick = (src, keys) =>
  Object.fromEntries(keys.filter((k) => src[k] !== undefined).map((k) => [k, src[k]]));

// The branch and the teacher come from the client, so they must belong to THIS institute.
// (A teacher is either one of the institute's staff accounts or the owner.)
const requireOwnedBranch = async (ownerId, branchId) => {
  if (!(await Branch.exists({ _id: branchId, ownerId, isActive: true }))) throw new ApiError(404, "Branch not found");
};
const requireOwnedTeacher = async (ownerId, teacherId) => {
  if (!teacherId) return;
  const ok = await User.exists({ _id: teacherId, isActive: true, $or: [{ _id: ownerId }, { ownerId }] });
  if (!ok) throw new ApiError(404, "Teacher not found");
};

const assertNoActiveStudents = async (ownerId, batchId) => {
  const activeStudents = await Student.countDocuments({ ownerId, currentBatch: batchId, status: "active" });
  if (activeStudents > 0) throw new ApiError(400, `Cannot deactivate — ${activeStudents} active students in this batch`);
};

// Only shows a teacher who really belongs to this institute (also hides bad links saved earlier).
const teacherPopulate = (ownerId, select) => ({
  path: "teacherId", select, match: { $or: [{ _id: ownerId }, { ownerId }] },
});

export const getBatches = asyncHandler(async (req, res) => {
  const { branchId, isActive } = req.query;
  if (branchId !== undefined && typeof branchId !== "string") throw new ApiError(400, "Invalid branchId");
  const filter = { ownerId: req.ownerId };
  if (branchId) filter.branchId = branchId;
  // No ?isActive -> active batches only ("false" = inactive only, "all" = both). It used to default to
  // the boolean true, which never equals the string "true", so every dropdown that calls GET /batches
  // without a query string (Add/Edit student, Fees, Tests, Notifications, Timetable) got an EMPTY list.
  if (isActive !== "all") filter.isActive = isActive !== "false";

  const batches = await Batch.find(filter).populate(teacherPopulate(req.ownerId, "name email")).sort({ createdAt: -1 });
  return res.json(new ApiResponse(200, batches));
});

export const createBatch = asyncHandler(async (req, res) => {
  const { branchId, teacherId } = req.body;
  await requireOwnedBranch(req.ownerId, branchId);
  await requireOwnedTeacher(req.ownerId, teacherId);

  const batch = await Batch.create({
    ...pick(req.body, BATCH_FIELDS),
    ownerId: req.ownerId, branchId, teacherId: teacherId || null,
  });
  await invalidateDashboardCache(req.ownerId);
  logAudit({ req, action:"create", entityType:"Batch", entityId:batch._id, description:`Created batch "${batch.name}"` });
  return res.status(201).json(new ApiResponse(201, batch, "Batch created"));
});

export const getBatch = asyncHandler(async (req, res) => {
  const batch = await Batch.findOne({ _id: req.params.id, ownerId: req.ownerId })
    .populate(teacherPopulate(req.ownerId, "name email phone"));
  if (!batch) throw new ApiError(404, "Batch not found");
  return res.json(new ApiResponse(200, batch));
});

export const updateBatch = asyncHandler(async (req, res) => {
  const batch = await Batch.findOne({ _id: req.params.id, ownerId: req.ownerId });
  if (!batch) throw new ApiError(404, "Batch not found");

  const updates = pick(req.body, BATCH_FIELDS);

  // The edit form always sends branchId — only act when it actually changed.
  if (req.body.branchId !== undefined && String(req.body.branchId) !== String(batch.branchId)) {
    await requireOwnedBranch(req.ownerId, req.body.branchId);
    // Students (and their fees/attendance) carry the branch of their batch; moving a batch that has
    // students would leave them pointing at the old branch.
    const students = await Student.countDocuments({ ownerId: req.ownerId, currentBatch: batch._id });
    if (students > 0) throw new ApiError(400, "This batch has students — transfer them out before moving it to another branch");
    updates.branchId = req.body.branchId;
  }

  if (req.body.teacherId !== undefined) {
    await requireOwnedTeacher(req.ownerId, req.body.teacherId);
    updates.teacherId = req.body.teacherId || null;
  }

  // Deactivating through PUT must follow the same rule as DELETE (it used to bypass it).
  if (req.body.isActive !== undefined && req.body.isActive !== batch.isActive) {
    if (!req.body.isActive) await assertNoActiveStudents(req.ownerId, batch._id);
    updates.isActive = req.body.isActive;
  }

  batch.set(updates);
  await batch.save();   // validators run (capacity >= 1, fee >= 0, day names...)
  await invalidateDashboardCache(req.ownerId);
  logAudit({ req, action:"update", entityType:"Batch", entityId:batch._id, description:`Updated batch "${batch.name}"` });
  return res.json(new ApiResponse(200, batch, "Batch updated"));
});

export const deleteBatch = asyncHandler(async (req, res) => {
  const batch = await Batch.findOne({ _id: req.params.id, ownerId: req.ownerId });
  if (!batch) throw new ApiError(404, "Batch not found");   // used to say "deactivated" for ANY id
  if (!batch.isActive) return res.json(new ApiResponse(200, null, "Batch already deactivated"));

  await assertNoActiveStudents(req.ownerId, batch._id);
  batch.isActive = false;
  await batch.save();
  await invalidateDashboardCache(req.ownerId);
  logAudit({ req, action:"delete", entityType:"Batch", entityId:batch._id, description:`Deleted batch "${batch.name}"` });
  return res.json(new ApiResponse(200, null, "Batch deactivated"));
});

export const getBatchStudents = asyncHandler(async (req, res) => {
  // ownerId matters: without it any logged-in user could list another institute's students by batch id
  const students = await Student.find({ ownerId: req.ownerId, currentBatch: req.params.id, status: "active" }).sort({ name: 1 });
  return res.json(new ApiResponse(200, students));
});
