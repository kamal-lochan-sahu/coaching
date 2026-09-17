import Student from "../models/Student.js";
import Batch from "../models/Batch.js";
import { Attendance, Fee, Result } from "../models/Academic.js";
import { ApiError, ApiResponse, asyncHandler } from "../utils/ApiHelpers.js";
import { invalidateDashboardCache } from "../config/redis.js";

export const getStudents = asyncHandler(async (req, res) => {
  const { branchId, batchId, status = "active", page = 1, limit = 20 } = req.query;
  const filter = { ownerId: req.ownerId };
  if (branchId) filter.branchId = branchId;
  if (batchId)  filter.currentBatch = batchId;
  if (status)   filter.status = status;

  const skip = (Number(page) - 1) * Number(limit);
  const [students, total] = await Promise.all([
    Student.find(filter).populate("currentBatch","name").sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Student.countDocuments(filter),
  ]);
  return res.json(new ApiResponse(200, { students, total, page: Number(page), pages: Math.ceil(total / limit) }));
});

export const searchStudents = asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q) throw new ApiError(400, "Search query required");
  const students = await Student.find({
    ownerId: req.ownerId,
    $or: [
      { name: { $regex: q, $options: "i" } },
      { phone: { $regex: q, $options: "i" } },
      { admissionNumber: { $regex: q, $options: "i" } },
    ],
  }).populate("currentBatch","name").limit(10);
  return res.json(new ApiResponse(200, students));
});

export const createStudent = asyncHandler(async (req, res) => {
  const { branchId, batchId, ...rest } = req.body;
  const count = await Student.countDocuments({ ownerId: req.ownerId });
  const admissionNumber = `ADM-${Date.now().toString().slice(-6)}-${count + 1}`;

  const student = await Student.create({
    ownerId: req.ownerId, branchId, admissionNumber,
    currentBatch: batchId || null,
    ...rest,
  });

  if (batchId) {
    await Batch.findByIdAndUpdate(batchId, { $inc: { enrolled: 1 } });
  }
  await invalidateDashboardCache(req.ownerId);
  return res.status(201).json(new ApiResponse(201, student, "Student added successfully"));
});

export const getStudent = asyncHandler(async (req, res) => {
  const student = await Student.findOne({ _id: req.params.id, ownerId: req.ownerId })
    .populate("currentBatch").populate("previousBatches","name");
  if (!student) throw new ApiError(404, "Student not found");
  return res.json(new ApiResponse(200, student));
});

export const updateStudent = asyncHandler(async (req, res) => {
  const student = await Student.findOneAndUpdate(
    { _id: req.params.id, ownerId: req.ownerId },
    req.body,
    { new: true, runValidators: true }
  );
  if (!student) throw new ApiError(404, "Student not found");
  await invalidateDashboardCache(req.ownerId);
  return res.json(new ApiResponse(200, student, "Student updated"));
});

export const deleteStudent = asyncHandler(async (req, res) => {
  const student = await Student.findOneAndUpdate(
    { _id: req.params.id, ownerId: req.ownerId },
    { status: "inactive" }, { new: true }
  );
  if (!student) throw new ApiError(404, "Student not found");
  await invalidateDashboardCache(req.ownerId);
  return res.json(new ApiResponse(200, null, "Student deactivated"));
});

export const getStudentAttendance = asyncHandler(async (req, res) => {
  const { month } = req.query;
  const filter = { studentId: req.params.id };
  if (month) {
    const [year, m] = month.split("-");
    filter.date = {
      $gte: new Date(year, m - 1, 1),
      $lte: new Date(year, m, 0),
    };
  }
  const records = await Attendance.find(filter).sort({ date: -1 });
  const total   = records.length;
  const present = records.filter(r => r.status === "present" || r.status === "late").length;
  const percentage = total ? Math.round((present / total) * 100) : 0;
  return res.json(new ApiResponse(200, { records, total, present, percentage }));
});

export const getStudentFees = asyncHandler(async (req, res) => {
  const fees = await Fee.find({ studentId: req.params.id }).sort({ createdAt: -1 });
  const pending = fees.filter(f => f.status === "pending").reduce((s, f) => s + f.finalAmount, 0);
  return res.json(new ApiResponse(200, { fees, totalPending: pending }));
});

export const getStudentResults = asyncHandler(async (req, res) => {
  const results = await Result.find({ studentId: req.params.id })
    .populate("testId", "name subject date totalMarks").sort({ createdAt: -1 });
  return res.json(new ApiResponse(200, results));
});

export const getStudentHistory = asyncHandler(async (req, res) => {
  const [student, attendance, fees, results] = await Promise.all([
    Student.findOne({ _id: req.params.id, ownerId: req.ownerId }).populate("currentBatch previousBatches"),
    Attendance.find({ studentId: req.params.id }).sort({ date: -1 }).limit(30),
    Fee.find({ studentId: req.params.id }).sort({ createdAt: -1 }),
    Result.find({ studentId: req.params.id }).populate("testId","name subject").sort({ createdAt: -1 }).limit(10),
  ]);
  if (!student) throw new ApiError(404, "Student not found");
  return res.json(new ApiResponse(200, { student, attendance, fees, results }));
});

export const transferStudent = asyncHandler(async (req, res) => {
  const { newBatchId } = req.body;
  const student = await Student.findOne({ _id: req.params.id, ownerId: req.ownerId });
  if (!student) throw new ApiError(404, "Student not found");

  const oldBatchId = student.currentBatch;
  if (oldBatchId) {
    await Batch.findByIdAndUpdate(oldBatchId, { $inc: { enrolled: -1 } });
    student.previousBatches.push(oldBatchId);
  }
  student.currentBatch = newBatchId;
  await student.save();
  await Batch.findByIdAndUpdate(newBatchId, { $inc: { enrolled: 1 } });

  return res.json(new ApiResponse(200, student, "Student transferred successfully"));
});
