import { Fee } from "../models/Academic.js";
import Student from "../models/Student.js";
import { ApiError, ApiResponse, asyncHandler } from "../utils/ApiHelpers.js";
import { generateReceiptNumber } from "../utils/receiptNumber.utils.js";

export const getFees = asyncHandler(async (req, res) => {
  const { branchId, month, status, page = 1, limit = 20 } = req.query;
  const filter = { ownerId: req.ownerId };
  if (branchId) filter.branchId = branchId;
  if (month)  filter.month = month;
  if (status) filter.status = status;

  const skip = (Number(page) - 1) * Number(limit);
  const [fees, total] = await Promise.all([
    Fee.find(filter).populate("studentId","name phone").populate("batchId","name")
      .sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Fee.countDocuments(filter),
  ]);
  return res.json(new ApiResponse(200, { fees, total }));
});

export const collectFee = asyncHandler(async (req, res) => {
  const { studentId, batchId, branchId, amount, discount = 0, paymentMode, month, note } = req.body;

  const lateFineEnabled = false; // from settings later
  const finalAmount = amount - discount;
  const receiptNumber = await generateReceiptNumber(Fee, req.ownerId);

  const fee = await Fee.create({
    ownerId: req.ownerId, branchId, studentId, batchId,
    amount, discount, finalAmount,
    month, paymentMode,
    paidDate: new Date(),
    receiptNumber,
    status: "paid",
    collectedBy: req.user._id,
    note,
  });

  const populated = await fee.populate("studentId","name phone guardianPhone");
  return res.status(201).json(new ApiResponse(201, populated, "Fee collected successfully"));
});

export const getPendingFees = asyncHandler(async (req, res) => {
  const { branchId } = req.query;
  const filter = { ownerId: req.ownerId, status: "pending" };
  if (branchId) filter.branchId = branchId;

  const fees = await Fee.find(filter)
    .populate("studentId","name phone guardianPhone guardianName")
    .populate("batchId","name")
    .sort({ dueDate: 1 });

  const totalPending = fees.reduce((s, f) => s + f.finalAmount, 0);
  return res.json(new ApiResponse(200, { fees, totalPending }));
});

export const getStudentFees = asyncHandler(async (req, res) => {
  const fees = await Fee.find({ studentId: req.params.studentId })
    .populate("batchId","name").sort({ createdAt: -1 });
  return res.json(new ApiResponse(200, fees));
});

export const waiveFee = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const fee = await Fee.findOneAndUpdate(
    { _id: req.params.id, ownerId: req.ownerId },
    { status: "waived", note: reason },
    { new: true }
  );
  if (!fee) throw new ApiError(404, "Fee record not found");
  return res.json(new ApiResponse(200, fee, "Fee waived"));
});

export const getFeeReport = asyncHandler(async (req, res) => {
  const { month } = req.query;
  const filter = { ownerId: req.ownerId, status: "paid" };
  if (month) filter.month = month;

  const fees = await Fee.find(filter).populate("studentId","name").populate("batchId","name");
  const total = fees.reduce((s, f) => s + f.finalAmount, 0);

  const byMode = fees.reduce((acc, f) => {
    acc[f.paymentMode] = (acc[f.paymentMode] || 0) + f.finalAmount;
    return acc;
  }, {});

  return res.json(new ApiResponse(200, { fees, totalCollected: total, byPaymentMode: byMode }));
});

export const generateFeeForBatch = asyncHandler(async (req, res) => {
  const { batchId, branchId, month, dueDate } = req.body;
  const students = await Student.find({ currentBatch: batchId, status: "active" });
  const Batch = (await import("../models/Batch.js")).default;
  const batch = await Batch.findById(batchId);
  if (!batch) throw new ApiError(404, "Batch not found");

  const existing = await Fee.find({ batchId, month });
  const existingIds = new Set(existing.map(f => f.studentId.toString()));

  const newFees = students
    .filter(s => !existingIds.has(s._id.toString()))
    .map(s => ({
      ownerId: req.ownerId, branchId, studentId: s._id, batchId,
      amount: batch.feeStructure.amount,
      discount: 0, finalAmount: batch.feeStructure.amount,
      month, dueDate: new Date(dueDate),
      status: "pending",
    }));

  if (newFees.length) await Fee.insertMany(newFees);
  return res.json(new ApiResponse(200, null, `Fee generated for ${newFees.length} students`));
});
