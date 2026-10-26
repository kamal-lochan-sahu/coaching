import Student from "../models/Student.js";
import Batch from "../models/Batch.js";
import Branch from "../models/Branch.js";
import User from "../models/User.js";
import { Attendance, Fee, Result } from "../models/Academic.js";
import { ApiError, ApiResponse, asyncHandler } from "../utils/ApiHelpers.js";
import { invalidateDashboardCache } from "../config/redis.js";
import { sendCSV } from "../utils/csv.utils.js";
import { logAudit } from "../utils/auditLog.utils.js";
import { generateStudentIDCardPDF } from "../services/report.service.js";
import { withAdmissionNumber } from "../utils/admissionNumber.utils.js";
import { syncBatchEnrolled } from "../utils/enrollment.utils.js";

// The only fields a client may set on a student. Everything else — ownerId, admissionNumber,
// currentBatch / previousBatches (batch changes go through the checks below), photo, documents —
// is decided by the server. (Before, the whole request body was written straight to the database.)
const STUDENT_FIELDS = [
  "name", "phone", "email", "dateOfBirth", "gender", "address",
  "guardianName", "guardianPhone", "guardianRelation", "notes",
];
const STATUSES = ["active", "inactive", "passed", "dropped"];

const pick = (src, keys) =>
  Object.fromEntries(keys.filter((k) => src[k] !== undefined).map((k) => [k, src[k]]));

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const clampInt = (value, fallback, min, max) => {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : fallback;
};

// Query-string values must be plain strings (?a[$ne]=1 would arrive as an object).
const queryString = (value, name) => {
  if (value === undefined || value === "") return undefined;
  if (typeof value !== "string") throw new ApiError(400, `Invalid ${name}`);
  return value;
};

// Shared by the list and the CSV export.
const buildStudentFilter = (req) => {
  const branchId = queryString(req.query.branchId, "branchId");
  const batchId  = queryString(req.query.batchId, "batchId");
  const status   = queryString(req.query.status, "status") ?? "active";

  const filter = { ownerId: req.ownerId };
  if (branchId) filter.branchId = branchId;
  if (batchId)  filter.currentBatch = batchId;
  if (status !== "all") {
    if (!STATUSES.includes(status)) throw new ApiError(400, "Invalid status");
    filter.status = status;
  }
  return filter;
};

// ids that arrive in a request body must belong to THIS institute
const requireOwnedBranch = async (ownerId, branchId) => {
  if (!(await Branch.exists({ _id: branchId, ownerId }))) throw new ApiError(404, "Branch not found");
};
const requireOwnedActiveBatch = async (ownerId, batchId) => {
  const batch = await Batch.findOne({ _id: batchId, ownerId }).select("name isActive");
  if (!batch) throw new ApiError(404, "Batch not found");
  if (!batch.isActive) throw new ApiError(400, "This batch is not active");
  return batch;
};

const requireOwnedStudent = async (req, select) => {
  const student = await Student.findOne({ _id: req.params.id, ownerId: req.ownerId }).select(select || "");
  if (!student) throw new ApiError(404, "Student not found");
  return student;
};

export const getStudents = asyncHandler(async (req, res) => {
  const filter = buildStudentFilter(req);
  const page  = clampInt(req.query.page, 1, 1, 100000);
  const limit = clampInt(req.query.limit, 20, 1, 100);

  const [students, total] = await Promise.all([
    Student.find(filter).populate("currentBatch","name").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Student.countDocuments(filter),
  ]);
  return res.json(new ApiResponse(200, { students, total, page, pages: Math.ceil(total / limit) }));
});

// GET /api/students/export/csv — full list (no pagination), respects the same filters
export const exportStudentsCSV = asyncHandler(async (req, res) => {
  const students = await Student.find(buildStudentFilter(req)).populate("currentBatch", "name").sort({ createdAt: -1 });

  return sendCSV(res, `students-${new Date().toISOString().slice(0,10)}.csv`, students, [
    { label: "Admission No.", key: "admissionNumber" },
    { label: "Name", key: "name" },
    { label: "Phone", key: "phone" },
    { label: "Email", key: "email" },
    { label: "Gender", key: "gender" },
    { label: "Batch", get: (s) => s.currentBatch?.name || "" },
    { label: "Guardian Name", key: "guardianName" },
    { label: "Guardian Phone", key: "guardianPhone" },
    { label: "Status", key: "status" },
    { label: "Admitted On", get: (s) => s.createdAt ? new Date(s.createdAt).toLocaleDateString("en-IN") : "" },
  ]);
});

export const searchStudents = asyncHandler(async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (!q) throw new ApiError(400, "Search query required");
  if (q.length > 100) throw new ApiError(400, "Search query is too long");

  // The text is searched literally: "Priya (S" or "+91 98" must not be read as a regular expression
  // (it crashed the search, and ".*" matched every student).
  const rx = { $regex: escapeRegex(q), $options: "i" };
  const students = await Student.find({
    ownerId: req.ownerId,
    $or: [{ name: rx }, { phone: rx }, { admissionNumber: rx }],
  }).populate("currentBatch","name").limit(10);
  return res.json(new ApiResponse(200, students));
});

export const createStudent = asyncHandler(async (req, res) => {
  const { branchId, batchId } = req.body;

  // branch / batch ids come from the client: they must be this institute's own
  await requireOwnedBranch(req.ownerId, branchId);
  if (batchId) await requireOwnedActiveBatch(req.ownerId, batchId);

  const student = await withAdmissionNumber(Student, req.ownerId, (admissionNumber) =>
    Student.create({
      ...pick(req.body, STUDENT_FIELDS),
      ownerId: req.ownerId, branchId, admissionNumber,
      currentBatch: batchId || null,
    })
  );

  if (batchId) await syncBatchEnrolled(req.ownerId, batchId);
  await invalidateDashboardCache(req.ownerId);
  logAudit({ req, action:"create", entityType:"Student", entityId:student._id, description:`Added student "${student.name}"` });
  return res.status(201).json(new ApiResponse(201, student, "Student added successfully"));
});

export const getStudent = asyncHandler(async (req, res) => {
  const student = await Student.findOne({ _id: req.params.id, ownerId: req.ownerId })
    .populate("currentBatch").populate("previousBatches","name");
  if (!student) throw new ApiError(404, "Student not found");
  return res.json(new ApiResponse(200, student));
});

export const updateStudent = asyncHandler(async (req, res) => {
  const student = await Student.findOne({ _id: req.params.id, ownerId: req.ownerId });
  if (!student) throw new ApiError(404, "Student not found");

  const updates = pick(req.body, [...STUDENT_FIELDS, "status"]);
  const oldBatchId = student.currentBatch;

  if (req.body.branchId !== undefined && String(req.body.branchId) !== String(student.branchId)) {
    await requireOwnedBranch(req.ownerId, req.body.branchId);
    updates.branchId = req.body.branchId;
  }

  // The edit form has a Batch dropdown. Before, changing it was silently ignored (batchId is not a
  // student field) while the page said "Student updated". Now it moves the student, same as a transfer.
  if (req.body.batchId !== undefined) {
    const newBatchId = req.body.batchId || null;
    if (String(newBatchId || "") !== String(oldBatchId || "")) {
      if (newBatchId) await requireOwnedActiveBatch(req.ownerId, newBatchId);
      if (oldBatchId && !student.previousBatches.some((b) => String(b) === String(oldBatchId))) {
        student.previousBatches.push(oldBatchId);
      }
      updates.currentBatch = newBatchId;
    }
  }

  student.set(updates);
  await student.save();   // runs the schema validators (enums, trimming, lowercase email...)

  // status changes (active <-> passed/dropped...) and batch moves both change a batch's head-count
  await syncBatchEnrolled(req.ownerId, oldBatchId, student.currentBatch);
  await invalidateDashboardCache(req.ownerId);
  logAudit({ req, action:"update", entityType:"Student", entityId:student._id, description:`Updated student "${student.name}"` });
  return res.json(new ApiResponse(200, student, "Student updated"));
});

export const deleteStudent = asyncHandler(async (req, res) => {
  const student = await Student.findOneAndUpdate(
    { _id: req.params.id, ownerId: req.ownerId },
    { status: "inactive" }, { new: true }
  );
  if (!student) throw new ApiError(404, "Student not found");
  await syncBatchEnrolled(req.ownerId, student.currentBatch);
  await invalidateDashboardCache(req.ownerId);
  logAudit({ req, action:"delete", entityType:"Student", entityId:student._id, description:`Deactivated student "${student.name}"` });
  return res.json(new ApiResponse(200, null, "Student deactivated"));
});

export const getStudentAttendance = asyncHandler(async (req, res) => {
  await requireOwnedStudent(req, "_id");

  const month = queryString(req.query.month, "month");
  const filter = { ownerId: req.ownerId, studentId: req.params.id };
  if (month) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new ApiError(400, "month must look like 2026-10");
    const [year, m] = month.split("-").map(Number);
    filter.date = {
      $gte: new Date(Date.UTC(year, m - 1, 1)),
      $lte: new Date(Date.UTC(year, m, 0, 23, 59, 59, 999)),   // the whole last day of the month
    };
  }
  const records = await Attendance.find(filter).sort({ date: -1 });
  const counted = records.filter((r) => r.status !== "holiday");   // a holiday is not a missed class
  const total   = counted.length;
  const present = counted.filter((r) => r.status === "present" || r.status === "late").length;
  const percentage = total ? Math.round((present / total) * 100) : 0;
  return res.json(new ApiResponse(200, { records, total, present, percentage }));
});

export const getStudentFees = asyncHandler(async (req, res) => {
  await requireOwnedStudent(req, "_id");
  const fees = await Fee.find({ ownerId: req.ownerId, studentId: req.params.id }).sort({ createdAt: -1 });
  const pending = fees.filter(f => f.status === "pending").reduce((s, f) => s + f.finalAmount, 0);
  return res.json(new ApiResponse(200, { fees, totalPending: pending }));
});

export const getStudentResults = asyncHandler(async (req, res) => {
  await requireOwnedStudent(req, "_id");
  const results = await Result.find({ ownerId: req.ownerId, studentId: req.params.id })
    .populate("testId", "name subject date totalMarks").sort({ createdAt: -1 });
  return res.json(new ApiResponse(200, results));
});

export const getStudentHistory = asyncHandler(async (req, res) => {
  const student = await Student.findOne({ _id: req.params.id, ownerId: req.ownerId }).populate("currentBatch previousBatches");
  if (!student) throw new ApiError(404, "Student not found");
  const own = { ownerId: req.ownerId, studentId: req.params.id };
  const [attendance, fees, results] = await Promise.all([
    Attendance.find(own).sort({ date: -1 }).limit(30),
    Fee.find(own).sort({ createdAt: -1 }),
    Result.find(own).populate("testId","name subject").sort({ createdAt: -1 }).limit(10),
  ]);
  return res.json(new ApiResponse(200, { student, attendance, fees, results }));
});

export const transferStudent = asyncHandler(async (req, res) => {
  const { newBatchId } = req.body;
  const student = await Student.findOne({ _id: req.params.id, ownerId: req.ownerId });
  if (!student) throw new ApiError(404, "Student not found");

  const newBatch = await requireOwnedActiveBatch(req.ownerId, newBatchId);
  const oldBatchId = student.currentBatch;
  if (String(oldBatchId || "") === String(newBatchId)) throw new ApiError(400, "Student is already in this batch");

  const oldBatch = oldBatchId ? await Batch.findOne({ _id: oldBatchId, ownerId: req.ownerId }).select("name") : null;
  if (oldBatchId && !student.previousBatches.some((b) => String(b) === String(oldBatchId))) {
    student.previousBatches.push(oldBatchId);
  }
  student.currentBatch = newBatchId;
  await student.save();

  await syncBatchEnrolled(req.ownerId, oldBatchId, newBatchId);
  await invalidateDashboardCache(req.ownerId);
  logAudit({ req, action:"update", entityType:"Student", entityId:student._id,
    description:`Transferred student "${student.name}" from "${oldBatch?.name || "no batch"}" to "${newBatch.name}"` });
  return res.json(new ApiResponse(200, student, "Student transferred successfully"));
});

// GET /api/students/:id/id-card — downloadable PDF ID card
export const downloadIDCardPDF = asyncHandler(async (req, res) => {
  const student = await Student.findOne({ _id: req.params.id, ownerId: req.ownerId })
    .populate("currentBatch", "name");
  if (!student) throw new ApiError(404, "Student not found");

  const owner = await User.findById(req.ownerId).select("branding");
  const instituteName = owner?.branding?.instituteName || "EduManage";
  const brandColor    = owner?.branding?.primaryColor  || "#3b82f6";

  const pdfBuffer = await generateStudentIDCardPDF(student, student.currentBatch, instituteName, brandColor);

  res.set({
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="ID-Card-${student.admissionNumber || student._id}.pdf"`,
    "Content-Length": pdfBuffer.length,
  });
  return res.send(pdfBuffer);
});
