import { Fee } from "../models/Academic.js";
import Student from "../models/Student.js";
import Batch from "../models/Batch.js";
import Branch from "../models/Branch.js";
import User from "../models/User.js";
import { ApiError, ApiResponse, asyncHandler } from "../utils/ApiHelpers.js";
import { withReceiptNumber } from "../utils/receiptNumber.utils.js";
import { withLock } from "../utils/lock.utils.js";
import { MONTH_PATTERN, toDateOnly } from "../utils/date.utils.js";
import { invalidateDashboardCache, invalidateRevenueCache } from "../config/redis.js";
import { generateFeeReceiptPDF } from "../services/report.service.js";
import { sendCSV } from "../utils/csv.utils.js";
import { sendEmail, emailTemplates } from "../config/email.js";
import { logAudit } from "../utils/auditLog.utils.js";

const FEE_STATUSES = ["pending", "paid", "partial", "waived"];

const clampInt = (value, fallback, min, max) => {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : fallback;
};

// Query-string values must be plain strings (?status[$ne]=x would arrive as an object).
const queryString = (value, name) => {
  if (value === undefined || value === "") return undefined;
  if (typeof value !== "string") throw new ApiError(400, `Invalid ${name}`);
  return value;
};
const queryMonth = (value) => {
  const month = queryString(value, "month");
  if (month !== undefined && !MONTH_PATTERN.test(month)) throw new ApiError(400, "month must look like 2026-10");
  return month;
};
const queryStatus = (value) => {
  const status = queryString(value, "status");
  if (status !== undefined && !FEE_STATUSES.includes(status)) throw new ApiError(400, "Invalid status");
  return status;
};

export const getFees = asyncHandler(async (req, res) => {
  const branchId = queryString(req.query.branchId, "branchId");
  const month    = queryMonth(req.query.month);
  const status   = queryStatus(req.query.status);
  const page  = clampInt(req.query.page, 1, 1, 100000);
  const limit = clampInt(req.query.limit, 20, 1, 100);

  const filter = { ownerId: req.ownerId };
  if (branchId) filter.branchId = branchId;
  if (month)    filter.month    = month;
  if (status)   filter.status   = status;

  const [fees, total] = await Promise.all([
    Fee.find(filter)
      .populate("studentId","name phone guardianPhone")
      .populate("batchId","name")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit).limit(limit),
    Fee.countDocuments(filter),
  ]);
  return res.json(new ApiResponse(200, { fees, total, page, pages: Math.ceil(total / limit) }));
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

  // One collection per student + month at a time: a double click, or two staff members at the same
  // moment, used to pass the "already paid?" check together and record the payment twice.
  // withReceiptNumber() picks the next receipt number for this institute and retries if two
  // different students are collected at the exact same moment (the unique index rejects the duplicate).
  const fee = await withLock(`collect:${req.ownerId}:${studentId}:${month}`, () =>
    withReceiptNumber(Fee, req.ownerId, async (receiptNumber) => {
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
    })
  );
  const receiptNumber = fee.receiptNumber;

  const populated = await fee.populate("studentId","name phone guardianPhone guardianName email");
  await invalidateDashboardCache(req.ownerId);
  await invalidateRevenueCache(req.ownerId);

  logAudit({ req, action:"collect_fee", entityType:"Fee", entityId:fee._id,
    description:`Collected ₹${finalAmount.toLocaleString("en-IN")} fee from "${populated.studentId.name}" (${month})` });

  res.status(201).json(new ApiResponse(201, populated, "Fee collected successfully"));

  // Best-effort: email a copy of the receipt if the student has an email on file. This runs AFTER the
  // response has gone out, so a slow or broken mail server can never hold up (or fail) a collection.
  if (populated.studentId?.email) {
    try {
      const owner = await User.findById(req.ownerId).select("branding");
      const instituteName = owner?.branding?.instituteName || "EduManage";
      const brandColor    = owner?.branding?.primaryColor  || "#3b82f6";
      await sendEmail({
        to: populated.studentId.email,
        subject: `Fee Receipt — ${receiptNumber}`,
        html: emailTemplates.feeReceipt(instituteName, brandColor, populated.studentId.name, finalAmount, receiptNumber, month),
        fromName: instituteName,
      });
    } catch (e) {
      console.error(`Fee receipt email failed: ${e.message}`);
    }
  }
});

export const getPendingFees = asyncHandler(async (req, res) => {
  const branchId = queryString(req.query.branchId, "branchId");
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
  // ownerId on BOTH queries: without it any logged-in user could read another institute's fees by student id
  if (!(await Student.exists({ _id: req.params.studentId, ownerId: req.ownerId }))) throw new ApiError(404, "Student not found");
  const fees = await Fee.find({ ownerId: req.ownerId, studentId: req.params.studentId })
    .populate("batchId","name")
    .sort({ createdAt: -1 });
  return res.json(new ApiResponse(200, fees));
});

export const waiveFee = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  if (!reason) throw new ApiError(400, "Reason is required to waive a fee");

  // Only a PENDING fee can be waived. A paid fee has a receipt and counts as revenue — waiving it
  // used to silently remove that money from the reports. (The status is part of the filter, so two
  // people clicking at once cannot both succeed.)
  const fee = await Fee.findOneAndUpdate(
    { _id: req.params.id, ownerId: req.ownerId, status: "pending" },
    { status: "waived", note: reason },
    { new: true }
  ).populate("studentId", "name");

  if (!fee) {
    const existing = await Fee.findOne({ _id: req.params.id, ownerId: req.ownerId }).select("status");
    if (!existing) throw new ApiError(404, "Fee record not found");
    throw new ApiError(400, `Only pending fees can be waived (this fee is ${existing.status})`);
  }

  await invalidateDashboardCache(req.ownerId);
  logAudit({ req, action:"waive_fee", entityType:"Fee", entityId:fee._id,
    description:`Waived ₹${fee.finalAmount.toLocaleString("en-IN")} fee for "${fee.studentId?.name||"student"}" — reason: ${reason}` });
  return res.json(new ApiResponse(200, fee, "Fee waived"));
});

export const getFeeReport = asyncHandler(async (req, res) => {
  const month = queryMonth(req.query.month);
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
  const month  = queryMonth(req.query.month);
  const status = queryStatus(req.query.status);
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
  const { batchId, month, dueDate } = req.body;
  if (!batchId || !month) throw new ApiError(400, "batchId and month required");

  // The batch must be this institute's own (it used to be looked up by id alone, so another
  // institute's batch id produced fee records here for THAT institute's students — whose names and
  // phone numbers then showed up in this institute's fee list).
  const batch = await Batch.findOne({ _id: batchId, ownerId: req.ownerId });
  if (!batch) throw new ApiError(404, "Batch not found");
  if (!batch.isActive) throw new ApiError(400, "This batch is not active");

  // Due date: the one picked on the form, otherwise the batch's own due day of that month. It was left
  // empty before, and the daily fee-reminder job only looks at fees that HAVE a due date — so those
  // fees never got a reminder.
  let due = dueDate ? toDateOnly(dueDate) : null;
  if (dueDate && !due) throw new ApiError(400, "Invalid due date");
  if (!due) {
    const [year, m] = month.split("-").map(Number);
    due = new Date(Date.UTC(year, m - 1, batch.feeStructure?.dueDate || 10));   // 10 = the batch model's own default
  }

  // Two clicks / two staff members generating the same batch + month at once would both see "no fees
  // yet" and create everything twice.
  const { created, alreadyThere } = await withLock(`generate:${req.ownerId}:${batch._id}:${month}`, async () => {
    const students = await Student.find({ ownerId: req.ownerId, currentBatch: batch._id, status: "active" });
    const existing = await Fee.find({ batchId: batch._id, month, ownerId: req.ownerId });
    const existingIds = new Set(existing.map((f) => f.studentId.toString()));

    const newFees = students
      .filter((s) => !existingIds.has(s._id.toString()))
      .map((s) => ({
        ownerId: req.ownerId, branchId: batch.branchId,   // branch comes from the batch, not the client
        studentId:   s._id,
        batchId:     batch._id,
        amount:      batch.feeStructure.amount,
        discount:    0,
        finalAmount: batch.feeStructure.amount,
        month,
        dueDate:     due,
        status:      "pending",
      }));

    if (newFees.length) await Fee.insertMany(newFees);
    return { created: newFees.length, alreadyThere: existingIds.size };
  });

  await invalidateDashboardCache(req.ownerId);
  logAudit({ req, action:"generate_fees", entityType:"Batch", entityId:batch._id,
    description:`Generated ${created} fee record(s) of ₹${batch.feeStructure.amount} for batch "${batch.name}" (${month})` });
  return res.json(new ApiResponse(200, null, `Fee generated for ${created} students (${alreadyThere} already existed)`));
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
