import { Attendance } from "../models/Academic.js";
import Student from "../models/Student.js";
import { ApiError, ApiResponse, asyncHandler } from "../utils/ApiHelpers.js";
import { invalidateDashboardCache } from "../config/redis.js";

export const markAttendance = asyncHandler(async (req, res) => {
  const { batchId, branchId, date, records } = req.body;
  // records = [{ studentId, status, note }]
  if (!records?.length) throw new ApiError(400, "No attendance records provided");

  const attendanceDate = new Date(date);
  const ops = records.map(r => ({
    updateOne: {
      filter: { studentId: r.studentId, batchId, date: attendanceDate },
      update: {
        $set: {
          ownerId: req.ownerId, branchId, batchId,
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
  const { date } = req.query;
  const filter = { batchId };
  if (date) filter.date = new Date(date);

  const records = await Attendance.find(filter).populate("studentId","name photo");
  return res.json(new ApiResponse(200, records));
});

export const getAttendanceReport = asyncHandler(async (req, res) => {
  const { batchId, month } = req.query;
  if (!batchId || !month) throw new ApiError(400, "batchId and month required");

  const [year, m] = month.split("-");
  const start = new Date(year, m - 1, 1);
  const end   = new Date(year, m, 0);

  const records = await Attendance.find({ batchId, date: { $gte: start, $lte: end } })
    .populate("studentId","name");

  // Group by student
  const map = {};
  for (const r of records) {
    const sid = r.studentId._id.toString();
    if (!map[sid]) map[sid] = { student: r.studentId, present: 0, absent: 0, late: 0, total: 0 };
    map[sid].total++;
    if (r.status === "present") map[sid].present++;
    else if (r.status === "absent") map[sid].absent++;
    else if (r.status === "late") map[sid].late++;
  }

  const report = Object.values(map).map(s => ({
    ...s,
    percentage: Math.round(((s.present + s.late) / s.total) * 100),
  }));

  return res.json(new ApiResponse(200, report));
});

export const getLowAttendance = asyncHandler(async (req, res) => {
  const { month, threshold = 80 } = req.query;
  const [year, m] = (month || new Date().toISOString().slice(0,7)).split("-");
  const start = new Date(year, m - 1, 1);
  const end   = new Date(year, m, 0);

  const records = await Attendance.find({ ownerId: req.ownerId, date: { $gte: start, $lte: end } });

  const map = {};
  for (const r of records) {
    const sid = r.studentId.toString();
    if (!map[sid]) map[sid] = { present: 0, total: 0 };
    map[sid].total++;
    if (r.status === "present" || r.status === "late") map[sid].present++;
  }

  const lowIds = Object.entries(map)
    .filter(([, v]) => (v.present / v.total) * 100 < Number(threshold))
    .map(([id]) => id);

  const students = await Student.find({ _id: { $in: lowIds } }).select("name phone guardianPhone guardianName currentBatch");
  return res.json(new ApiResponse(200, students));
});
