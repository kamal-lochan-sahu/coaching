import Student from "../models/Student.js";
import Batch from "../models/Batch.js";
import { Attendance, Fee } from "../models/Academic.js";
import { Enquiry, Expense } from "../models/Management.js";
import { ApiResponse, asyncHandler } from "../utils/ApiHelpers.js";

export const getDashboard = asyncHandler(async (req, res) => {
  const ownerId = req.ownerId;
  const today   = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthStr   = today.toISOString().slice(0, 7);
  const weekAgo    = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalStudents, activeStudents, newThisMonth,
    totalBatches,
    todayAttendance,
    feeToday, feeThisMonth, pendingFees,
    enquiriesThisWeek,
    totalExpenseThisMonth,
  ] = await Promise.all([
    Student.countDocuments({ ownerId }),
    Student.countDocuments({ ownerId, status: "active" }),
    Student.countDocuments({ ownerId, admissionDate: { $gte: monthStart } }),
    Batch.countDocuments({ ownerId, isActive: true }),

    // Today attendance
    Attendance.aggregate([
      { $match: { ownerId, date: { $gte: new Date(today.setHours(0,0,0,0)), $lte: new Date(today.setHours(23,59,59,999)) } } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),

    // Fee today
    Fee.aggregate([
      { $match: { ownerId, status: "paid", paidDate: { $gte: new Date(new Date().setHours(0,0,0,0)) } } },
      { $group: { _id: null, total: { $sum: "$finalAmount" } } },
    ]),

    // Fee this month
    Fee.aggregate([
      { $match: { ownerId, status: "paid", month: monthStr } },
      { $group: { _id: null, total: { $sum: "$finalAmount" } } },
    ]),

    // Pending
    Fee.aggregate([
      { $match: { ownerId, status: "pending" } },
      { $group: { _id: null, total: { $sum: "$finalAmount" } } },
    ]),

    Enquiry.countDocuments({ ownerId, createdAt: { $gte: weekAgo } }),

    Expense.aggregate([
      { $match: { ownerId, date: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
  ]);

  const presentToday = todayAttendance.find(a => a._id === "present")?.count || 0;
  const totalToday   = todayAttendance.reduce((s, a) => s + a.count, 0);

  return res.json(new ApiResponse(200, {
    students: { total: totalStudents, active: activeStudents, newThisMonth },
    batches:  { total: totalBatches },
    attendance: {
      today: { present: presentToday, total: totalToday, percentage: totalToday ? Math.round((presentToday/totalToday)*100) : 0 },
    },
    fees: {
      collectedToday:    feeToday[0]?.total || 0,
      collectedThisMonth: feeThisMonth[0]?.total || 0,
      totalPending:      pendingFees[0]?.total || 0,
    },
    enquiries: { thisWeek: enquiriesThisWeek },
    expenses:  { thisMonth: totalExpenseThisMonth[0]?.total || 0 },
  }));
});

export const getRevenueChart = asyncHandler(async (req, res) => {
  const months = [];
  const today = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    months.push(d.toISOString().slice(0, 7));
  }

  const [feeData, expenseData] = await Promise.all([
    Fee.aggregate([
      { $match: { ownerId: req.ownerId, status: "paid", month: { $in: months } } },
      { $group: { _id: "$month", revenue: { $sum: "$finalAmount" } } },
    ]),
    Expense.aggregate([
      { $match: { ownerId: req.ownerId, date: { $gte: new Date(today.getFullYear(), today.getMonth() - 5, 1) } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$date" } }, expense: { $sum: "$amount" } } },
    ]),
  ]);

  const feeMap     = Object.fromEntries(feeData.map(f => [f._id, f.revenue]));
  const expenseMap = Object.fromEntries(expenseData.map(e => [e._id, e.expense]));

  const chart = months.map(m => ({
    month: m,
    revenue: feeMap[m] || 0,
    expense: expenseMap[m] || 0,
    profit: (feeMap[m] || 0) - (expenseMap[m] || 0),
  }));

  return res.json(new ApiResponse(200, chart));
});

export const getAttendanceSummary = asyncHandler(async (req, res) => {
  const { month } = req.query;
  const [year, m] = (month || new Date().toISOString().slice(0,7)).split("-");
  const start = new Date(year, m - 1, 1);
  const end   = new Date(year, m, 0);

  const summary = await Attendance.aggregate([
    { $match: { ownerId: req.ownerId, date: { $gte: start, $lte: end } } },
    { $group: { _id: "$batchId", present: { $sum: { $cond: [{ $eq: ["$status","present"] }, 1, 0] } }, total: { $sum: 1 } } },
  ]);

  return res.json(new ApiResponse(200, summary));
});

export const getEnquiryConversion = asyncHandler(async (req, res) => {
  const stats = await Enquiry.aggregate([
    { $match: { ownerId: req.ownerId } },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);
  const total = stats.reduce((s, x) => s + x.count, 0);
  const converted = stats.find(s => s._id === "converted")?.count || 0;
  return res.json(new ApiResponse(200, {
    stats, total,
    conversionRate: total ? Math.round((converted / total) * 100) : 0,
  }));
});
