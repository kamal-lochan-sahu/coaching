import { Fee } from "../models/Academic.js";
import Student from "../models/Student.js";
import Batch from "../models/Batch.js";
import Branch from "../models/Branch.js";
import User from "../models/User.js";
import { ApiError, ApiResponse, asyncHandler } from "../utils/ApiHelpers.js";
import { withReceiptNumber } from "../utils/receiptNumber.utils.js";
import { invalidateDashboardCache, invalidateRevenueCache } from "../config/redis.js";
import { generateFeeReceiptPDF } from "../services/report.service.js";
import { sendCSV } from "../utils/csv.utils.js";
import { sendEmail, emailTemplates } from "../config/email.js";
import { logAudit } from "../utils/auditLog.utils.js";

export const getFees = asyncHandler(async (req, res) => {
  const { branchId, month, status, page = 1, limit = 20 } = req.query;
  const filter = { ownerId: req.ownerId };
  if (branchId) filter.branchId = branchId;
  if (month)    filter.month    = month;
  if (status)   filter.status   = status;

  const skip = (Number(page) - 1) * Number(limit);
  const [fees, total] = await Promise.all([
    Fee.find(filter)
      .populate("studentId","name phone guardianPhone")
      .populate("batchId","name")
      .sort({ createdAt: -1 })
      .skip(skip).limit(Number(limit)),
    Fee.countDocuments(filter),
  ]);
  return res.json(new ApiResponse(200, { fees, total, page: Number(page), pages: Math.ceil(total / Number(limit)) }));
});

export const collectFee = asyncHandler(async (req, res) => {
  const { studentId, batchId, branchId, amount, discount = 0, paymentMode, month, note } = req.body;

  if (!studentId || !amount || !month) {
    throw new ApiError(400, "studentId, amount and month are required");
  }

  const finalAmount = Number(amount) - Number(discount);

  // The ids come from the client — make sure they all belong to THIS institute.
  // (Otherwise the populate below would leak another institute's student details.)
  const [studentOk, batchOk, branchOk] = await Promise.all([
    Student.exists({ _id: studentId, ownerId: req.ownerId }),
    Batch.exists({ _id: batchId, ownerId: req.ownerId }),
    Branch.exists({ _id: branchId, ownerId: req.ownerId }),
  ]);
  if (!studentOk || !batchOk || !branchOk) throw new ApiError(404, "Student, batch or branch not found");

  // Update the existing pending fee OR create a new paid record. withReceiptNumber()
  // picks the next receipt number for this institute and retries if two staff members
  // collect at the exact same moment (the unique index rejects the duplicate).
  const fee = await withReceiptNumber(Fee, req.ownerId, async (receiptNumber) => {
    const existingPending = await Fee.findOne({
      studentId, batchId, month, status: "pending", ownerId: req.ownerId,
    });

    if (existingPending) {
      existingPending.amount        = Number(amount);
      existingPending.discount      = Number(discount);
      existingPending.finalAmount   = finalAmount;
      existingPending.paidDate      = new Date();
      existingPending.paymentMode   = paymentMode;
      existingPending.receiptNumber = receiptNumber;
      existingPending.status        = "paid";
      existingPending.collectedBy   = req.user._id;
      existingPending.note          = note || "";
      await existingPending.save();
      return existingPending;
    }

    // Check not already paid this month
    const alreadyPaid = await Fee.findOne({
      studentId, month, status: "paid", ownerId: req.ownerId,
    });
    if (alreadyPaid) {
      throw new ApiError(409, `Fee already collected for ${month}. Receipt: ${alreadyPaid.receiptNumber}`);
    }
    return Fee.create({
      ownerId: req.ownerId, branchId, studentId, batchId,
      amount: Number(amount), discount: Number(discount), finalAmount,
      month, paymentMode,
      paidDate: new Date(),
      receiptNumber,
      status: "paid",
      collectedBy: req.user._id,
      note: note || "",
    });
  });
  const receiptNumber = fee.receiptNumber;

  const populated = await fee.populate("studentId","name phone guardianPhone guardianName email");
  await invalidateDashboardCache(req.ownerId);
  await invalidateRevenueCache(req.ownerId);

  // Best-effort: email a copy of the receipt if the student has an email on file.
  // Never blocks or fails the fee-collection response.
  if (populated.studentId?.email) {
    try {
      const owner = await User.findById(req.ownerId).select("branding");
      const instituteName = owner?.branding?.instituteName || "EduManage";
      const brandColor    = owner?.branding?.primaryColor  || "#3b82f6";
      await sendEmail({
        to: populated.studentId.email,
        subject: `Fee Receipt — ${receiptNumber}`,
        html: emailTemplates.feeReceipt(instituteName, brandColor, populated.studentId.name, finalAmount, receiptNumber, month),
      });
    } catch (e) {
      console.error(`Fee receipt email failed: ${e.message}`);
    }
  }

  logAudit({ req, action:"collect_fee", entityType:"Fee", entityId:fee._id,
    description:`Collected ₹${finalAmount.toLocaleString("en-IN")} fee from "${populated.studentId.name}" (${month})` });

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
    .populate("batchId","name")
    .sort({ createdAt: -1 });
  return res.json(new ApiResponse(200, fees));
});

export const waiveFee = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  if (!reason) throw new ApiError(400, "Reason is required to waive a fee");

  const fee = await Fee.findOneAndUpdate(
    { _id: req.params.id, ownerId: req.ownerId },
    { status: "waived", note: reason },
    { new: true }
  ).populate("studentId", "name");
  if (!fee) throw new ApiError(404, "Fee record not found");
  await invalidateDashboardCache(req.ownerId);
  logAudit({ req, action:"waive_fee", entityType:"Fee", entityId:fee._id,
    description:`Waived ₹${fee.finalAmount.toLocaleString("en-IN")} fee for "${fee.studentId?.name||"student"}" — reason: ${reason}` });
  return res.json(new ApiResponse(200, fee, "Fee waived"));
});

export const getFeeReport = asyncHandler(async (req, res) => {
  const { month } = req.query;
  const filter = { ownerId: req.ownerId, status: "paid" };
  if (month) filter.month = month;

  const fees  = await Fee.find(filter).populate("studentId","name").populate("batchId","name");
  const total = fees.reduce((s, f) => s + f.finalAmount, 0);

  const byMode = fees.reduce((acc, f) => {
    if (f.paymentMode) acc[f.paymentMode] = (acc[f.paymentMode] || 0) + f.finalAmount;
    return acc;
  }, {});

  return res.json(new ApiResponse(200, { fees, totalCollected: total, byPaymentMode: byMode }));
});

// GET /api/fees/export/csv?month=YYYY-MM&status=paid
export const exportFeesCSV = asyncHandler(async (req, res) => {
  const { month, status } = req.query;
  const filter = { ownerId: req.ownerId };
  if (month)  filter.month  = month;
  if (status) filter.status = status;

  const fees = await Fee.find(filter).populate("studentId", "name phone").populate("batchId", "name").sort({ createdAt: -1 });

  return sendCSV(res, `fees-${month || "all"}.csv`, fees, [
    { label: "Receipt No.", key: "receiptNumber" },
    { label: "Student", get: (f) => f.studentId?.name || "" },
    { label: "Phone", get: (f) => f.studentId?.phone || "" },
    { label: "Batch", get: (f) => f.batchId?.name || "" },
    { label: "Month", key: "month" },
    { label: "Amount", key: "amount" },
    { label: "Discount", key: "discount" },
    { label: "Final Amount", key: "finalAmount" },
    { label: "Payment Mode", key: "paymentMode" },
    { label: "Status", key: "status" },
    { label: "Paid Date", get: (f) => f.paidDate ? new Date(f.paidDate).toLocaleDateString("en-IN") : "" },
  ]);
});

export const generateFeeForBatch = asyncHandler(async (req, res) => {
  const { batchId, branchId, month, dueDate } = req.body;
  if (!batchId || !month) throw new ApiError(400, "batchId and month required");

  const Batch    = (await import("../models/Batch.js")).default;
  const students = await Student.find({ currentBatch: batchId, status: "active" });
  const batch    = await Batch.findById(batchId);
  if (!batch) throw new ApiError(404, "Batch not found");

  const existing    = await Fee.find({ batchId, month, ownerId: req.ownerId });
  const existingIds = new Set(existing.map(f => f.studentId.toString()));

  const newFees = students
    .filter(s => !existingIds.has(s._id.toString()))
    .map(s => ({
      ownerId: req.ownerId, branchId,
      studentId:   s._id,
      batchId,
      amount:      batch.feeStructure.amount,
      discount:    0,
      finalAmount: batch.feeStructure.amount,
      month,
      dueDate:     dueDate ? new Date(dueDate) : null,
      status:      "pending",
    }));

  if (newFees.length) await Fee.insertMany(newFees);
  await invalidateDashboardCache(req.ownerId);
  return res.json(new ApiResponse(200, null, `Fee generated for ${newFees.length} students (${existingIds.size} already existed)`));
});

// GET /api/fees/:id/receipt — stream a PDF receipt for a paid fee
export const downloadFeeReceipt = asyncHandler(async (req, res) => {
  const fee = await Fee.findOne({ _id: req.params.id, ownerId: req.ownerId })
    .populate("studentId", "name")
    .populate("batchId", "name");
  if (!fee) throw new ApiError(404, "Fee record not found");
  if (fee.status !== "paid") throw new ApiError(400, "Receipt is only available for paid fees");

  const owner = await User.findById(req.ownerId).select("branding");
  const instituteName = owner?.branding?.instituteName || "EduManage";
  const brandColor    = owner?.branding?.primaryColor  || "#3b82f6";

  const pdfBuffer = await generateFeeReceiptPDF(fee, fee.studentId, fee.batchId, instituteName, brandColor);

  res.set({
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="Receipt-${fee.receiptNumber}.pdf"`,
    "Content-Length": pdfBuffer.length,
  });
  return res.send(pdfBuffer);
});
