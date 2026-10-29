import { Attendance } from "../models/Academic.js";
import { Settings } from "../models/Management.js";
import Student from "../models/Student.js";
import Batch from "../models/Batch.js";
import { ApiError, ApiResponse, asyncHandler } from "../utils/ApiHelpers.js";
import { invalidateDashboardCache } from "../config/redis.js";
import { sendCSV } from "../utils/csv.utils.js";
import { MONTH_PATTERN, businessToday, businessMonth, toDateOnly, monthRange } from "../utils/date.utils.js";

const queryString = (value, name) => {
  if (value === undefined || value === "") return undefined;
  if (typeof value !== "string") throw new ApiError(400, `Invalid ${name}`);
  return value;
};

const requireMonth = (value) => {
  if (!value || typeof value !== "string" || !MONTH_PATTERN.test(value)) throw new ApiError(400, "month must look like 2026-10");
  return value;
};

// A batch id that arrives in a request must belong to THIS institute.
const requireOwnedBatch = async (ownerId, batchId) => {
  const batch = await Batch.findOne({ _id: batchId, ownerId }).select("branchId name");
  if (!batch) throw new ApiError(404, "Batch not found");
  return batch;
};

export const markAttendance = asyncHandler(async (req, res) => {
  const { batchId, date, records } = req.body;
  // records = [{ studentId, status, note }]
  if (!records?.length) throw new ApiError(400, "No attendance records provided");

  const attendanceDate = toDateOnly(date);
  if (!attendanceDate) throw new ApiError(400, "Invalid date");
  if (attendanceDate > toDateOnly(businessToday())) throw new ApiError(400, "Cannot mark attendance for a future date");

  const batch = await requireOwnedBatch(req.ownerId, batchId);

  // Every student must be one of THIS institute's students, currently in THIS batch. (The write below
  // used to match on student + batch + date only, so another institute's ids would overwrite ITS
  // attendance records and take them over.)
  const studentIds = [...new Set(records.map((r) => String(r.studentId)))];
  const inBatch = await Student.countDocuments({ _id: { $in: studentIds }, ownerId: req.ownerId, currentBatch: batch._id });
  if (inBatch !== studentIds.length) throw new ApiError(400, "Some students do not belong to this batch");

  const ops = records.map((r) => ({
    updateOne: {
      filter: { ownerId: req.ownerId, studentId: r.studentId, batchId: batch._id, date: attendanceDate },
      update: {
        $set: {
          ownerId: req.ownerId, branchId: batch.branchId, batchId: batch._id,   // branch comes from the batch, not the client
          studentId: r.studentId,
          date: attendanceDate,
          status: r.status,
          note: r.note || "",
          markedBy: req.user._id,
        },
      },
      upsert: true,
    },
  }));

  await Attendance.bulkWrite(ops);
  await invalidateDashboardCache(req.ownerId);
  return res.json(new ApiResponse(200, null, `Attendance marked for ${records.length} students`));
});

export const getBatchAttendance = asyncHandler(async (req, res) => {
  const { batchId } = req.params;
  const date = queryString(req.query.date, "date");

  await requireOwnedBatch(req.ownerId, batchId);
  const filter = { ownerId: req.ownerId, batchId };
  if (date) {
    const day = toDateOnly(date);
    if (!day) throw new ApiError(400, "Invalid date");
    filter.date = day;
  }

  const records = await Attendance.find(filter).populate("studentId","name photo");
  return res.json(new ApiResponse(200, records));
});

// One row per student for a batch and month — shared by the report and the CSV export.
const buildMonthlyReport = async (req, studentFields) => {
  const batchId = queryString(req.query.batchId, "batchId");
  if (!batchId) throw new ApiError(400, "batchId and month required");
  const month = requireMonth(req.query.month);

  await requireOwnedBatch(req.ownerId, batchId);
  const { start, end } = monthRange(month);
  const records = await Attendance.find({ ownerId: req.ownerId, batchId, date: { $gte: start, $lte: end } })
    .populate("studentId", studentFields);

  const map = {};
  for (const r of records) {
    if (!r.studentId) continue;                         // student record no longer exists
    if (r.status === "holiday") continue;               // a holiday is not a missed class
    const sid = r.studentId._id.toString();
    if (!map[sid]) map[sid] = { student: r.studentId, present: 0, absent: 0, late: 0, total: 0 };
    map[sid].total++;
    if (r.status === "present") map[sid].present++;
    else if (r.status === "absent") map[sid].absent++;
    else if (r.status === "late") map[sid].late++;
  }

  const report = Object.values(map)
    .map((s) => ({ ...s, percentage: Math.round(((s.present + s.late) / s.total) * 100) }))
    .sort((a, b) => String(a.student.name).localeCompare(String(b.student.name)));
  return { month, report };
};

export const getAttendanceReport = asyncHandler(async (req, res) => {
  const { report } = await buildMonthlyReport(req, "name");
  return res.json(new ApiResponse(200, report));
});

// GET /api/attendance/export/csv?batchId=&month=YYYY-MM — same report data as above, as CSV
export const exportAttendanceCSV = asyncHandler(async (req, res) => {
  const { month, report } = await buildMonthlyReport(req, "name phone");

  return sendCSV(res, `attendance-${month}.csv`, report, [
    { label: "Student", get: (r) => r.student?.name || "" },
    { label: "Phone", get: (r) => r.student?.phone || "" },
    { label: "Present", key: "present" },
    { label: "Absent", key: "absent" },
    { label: "Late", key: "late" },
    { label: "Total Days", key: "total" },
    { label: "Percentage", get: (r) => `${r.percentage}%` },
  ]);
});

export const getLowAttendance = asyncHandler(async (req, res) => {
  const month = requireMonth(queryString(req.query.month, "month") || businessMonth());

  // Default threshold = the institute's own setting (Settings → Attendance), not a hard-coded 80.
  let threshold;
  const asked = queryString(req.query.threshold, "threshold");
  if (asked !== undefined) {
    threshold = Number(asked);
    if (!Number.isFinite(threshold) || threshold < 0 || threshold > 100) throw new ApiError(400, "threshold must be between 0 and 100");
  } else {
    const settings = await Settings.findOne({ ownerId: req.ownerId }).select("attendance");
    threshold = settings?.attendance?.minPercentage ?? 80;
  }

  const { start, end } = monthRange(month);
  const records = await Attendance.find({ ownerId: req.ownerId, date: { $gte: start, $lte: end } }).select("studentId status");

  const map = {};
  for (const r of records) {
    if (r.status === "holiday") continue;
    const sid = r.studentId.toString();
    if (!map[sid]) map[sid] = { present: 0, total: 0 };
    map[sid].total++;
    if (r.status === "present" || r.status === "late") map[sid].present++;
  }

  const lowIds = Object.entries(map)
    .filter(([, v]) => (v.present / v.total) * 100 < threshold)
    .map(([id]) => id);

  // students who have left (inactive / passed / dropped) are not chased for attendance
  const students = await Student.find({ _id: { $in: lowIds }, ownerId: req.ownerId, status: "active" })
    .select("name phone guardianPhone guardianName currentBatch");
  return res.json(new ApiResponse(200, students));
});
