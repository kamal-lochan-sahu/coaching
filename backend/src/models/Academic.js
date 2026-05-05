import mongoose from "mongoose";

// ── Attendance ────────────────────────────────────────
const attendanceSchema = new mongoose.Schema({
  ownerId:   { type: mongoose.Schema.Types.ObjectId, ref: "User",    required: true },
  branchId:  { type: mongoose.Schema.Types.ObjectId, ref: "Branch",  required: true },
  batchId:   { type: mongoose.Schema.Types.ObjectId, ref: "Batch",   required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  date:      { type: Date, required: true },
  status:    { type: String, enum: ["present","absent","late","holiday"], required: true },
  markedBy:  { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  note:      String,
}, { timestamps: true });
attendanceSchema.index({ studentId: 1, batchId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ batchId: 1, date: 1 });
export const Attendance = mongoose.model("Attendance", attendanceSchema);

// ── Fee ───────────────────────────────────────────────
const feeSchema = new mongoose.Schema({
  ownerId:       { type: mongoose.Schema.Types.ObjectId, ref: "User",    required: true },
  branchId:      { type: mongoose.Schema.Types.ObjectId, ref: "Branch",  required: true },
  studentId:     { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  batchId:       { type: mongoose.Schema.Types.ObjectId, ref: "Batch",   required: true },
  amount:        { type: Number, required: true },
  discount:      { type: Number, default: 0 },
  lateFine:      { type: Number, default: 0 },
  finalAmount:   { type: Number, required: true },
  month:         { type: String, required: true },
  dueDate:       Date,
  paidDate:      Date,
  paymentMode:   { type: String, enum: ["cash","upi","cheque","online",""], default: "" },
  receiptNumber: { type: String, unique: true, sparse: true },
  receiptUrl:    String,
  status:        { type: String, enum: ["pending","paid","partial","waived"], default: "pending" },
  note:          String,
  collectedBy:   { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });
feeSchema.index({ studentId: 1, status: 1 });
feeSchema.index({ ownerId: 1, month: 1, status: 1 });
export const Fee = mongoose.model("Fee", feeSchema);

// ── Test ──────────────────────────────────────────────
const testSchema = new mongoose.Schema({
  ownerId:      { type: mongoose.Schema.Types.ObjectId, ref: "User",   required: true },
  branchId:     { type: mongoose.Schema.Types.ObjectId, ref: "Branch", required: true },
  batchId:      { type: mongoose.Schema.Types.ObjectId, ref: "Batch",  required: true },
  name:         { type: String, required: true, trim: true },
  subject:      { type: String, trim: true },
  date:         { type: Date, required: true },
  totalMarks:   { type: Number, required: true },
  passingMarks: { type: Number, required: true },
  createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });
testSchema.index({ batchId: 1, date: -1 });
export const Test = mongoose.model("Test", testSchema);

// ── Result ────────────────────────────────────────────
const resultSchema = new mongoose.Schema({
  testId:        { type: mongoose.Schema.Types.ObjectId, ref: "Test",    required: true },
  studentId:     { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  batchId:       { type: mongoose.Schema.Types.ObjectId, ref: "Batch",   required: true },
  ownerId:       { type: mongoose.Schema.Types.ObjectId, ref: "User",    required: true },
  marksObtained: { type: Number, required: true, min: 0 },
  percentage:    Number,
  grade:         String,
  rank:          Number,
  isPassed:      Boolean,
  remarks:       String,
}, { timestamps: true });
resultSchema.index({ testId: 1, studentId: 1 }, { unique: true });
resultSchema.index({ studentId: 1, createdAt: -1 });
export const Result = mongoose.model("Result", resultSchema);

// ── Timetable ─────────────────────────────────────────
const timetableSchema = new mongoose.Schema({
  ownerId:  { type: mongoose.Schema.Types.ObjectId, ref: "User",   required: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", required: true },
  batchId:  { type: mongoose.Schema.Types.ObjectId, ref: "Batch",  required: true },
  schedule: [{
    day:   { type: String, enum: ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"] },
    slots: [{
      startTime: String,
      endTime:   String,
      subject:   String,
      teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    }],
  }],
  effectiveFrom: { type: Date, default: Date.now },
  isActive:      { type: Boolean, default: true },
}, { timestamps: true });
timetableSchema.index({ batchId: 1, isActive: 1 });
export const Timetable = mongoose.model("Timetable", timetableSchema);
