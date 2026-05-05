import mongoose from "mongoose";

// ── Staff ─────────────────────────────────────────────
const staffSchema = new mongoose.Schema({
  ownerId:       { type: mongoose.Schema.Types.ObjectId, ref: "User",   required: true },
  branchId:      { type: mongoose.Schema.Types.ObjectId, ref: "Branch", required: true },
  userId:        { type: mongoose.Schema.Types.ObjectId, ref: "User",   required: true },
  designation:   { type: String, trim: true },
  subjects:      [String],
  qualification: String,
  salary: {
    amount:     { type: Number, default: 0 },
    paymentDay: { type: Number, default: 1, min: 1, max: 28 },
  },
  joiningDate: { type: Date, default: Date.now },
  isActive:    { type: Boolean, default: true },
  notes:       String,
}, { timestamps: true });
staffSchema.index({ ownerId: 1, branchId: 1 });
export const Staff = mongoose.model("Staff", staffSchema);

// ── Salary ────────────────────────────────────────────
const salarySchema = new mongoose.Schema({
  ownerId:     { type: mongoose.Schema.Types.ObjectId, ref: "User",  required: true },
  staffId:     { type: mongoose.Schema.Types.ObjectId, ref: "Staff", required: true },
  month:       { type: Number, required: true, min: 1, max: 12 },
  year:        { type: Number, required: true },
  basicSalary: { type: Number, required: true },
  advance:     { type: Number, default: 0 },
  deductions:  { type: Number, default: 0 },
  bonus:       { type: Number, default: 0 },
  netSalary:   { type: Number, required: true },
  paidDate:    Date,
  paymentMode: { type: String, enum: ["cash","bank_transfer","upi","cheque"], default: "bank_transfer" },
  note:        String,
}, { timestamps: true });
salarySchema.index({ staffId: 1, year: 1, month: 1 }, { unique: true });
export const Salary = mongoose.model("Salary", salarySchema);

// ── Enquiry ───────────────────────────────────────────
const enquirySchema = new mongoose.Schema({
  ownerId:      { type: mongoose.Schema.Types.ObjectId, ref: "User",    required: true },
  branchId:     { type: mongoose.Schema.Types.ObjectId, ref: "Branch",  required: true },
  name:         { type: String, required: true, trim: true },
  phone:        { type: String, required: true, trim: true },
  email:        { type: String, lowercase: true, trim: true },
  interestedIn: String,
  source:       { type: String, enum: ["referral","social_media","walk_in","online","other"], default: "walk_in" },
  status:       { type: String, enum: ["new","contacted","converted","lost"], default: "new" },
  followUpDate: Date,
  notes: [{
    text:    String,
    addedAt: { type: Date, default: Date.now },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  }],
  convertedToStudentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", default: null },
}, { timestamps: true });
enquirySchema.index({ ownerId: 1, status: 1 });
enquirySchema.index({ ownerId: 1, followUpDate: 1 });
export const Enquiry = mongoose.model("Enquiry", enquirySchema);

// ── Expense ───────────────────────────────────────────
const expenseSchema = new mongoose.Schema({
  ownerId:     { type: mongoose.Schema.Types.ObjectId, ref: "User",   required: true },
  branchId:    { type: mongoose.Schema.Types.ObjectId, ref: "Branch", required: true },
  category:    { type: String, enum: ["rent","salary","electricity","stationery","maintenance","marketing","equipment","other"], required: true },
  amount:      { type: Number, required: true },
  description: { type: String, trim: true },
  date:        { type: Date, default: Date.now, required: true },
  receiptUrl:  String,
  addedBy:     { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });
expenseSchema.index({ ownerId: 1, date: -1 });
export const Expense = mongoose.model("Expense", expenseSchema);

// ── Notification ──────────────────────────────────────
const notificationSchema = new mongoose.Schema({
  ownerId:        { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  recipientType:  { type: String, enum: ["student","parent","staff","all","batch"] },
  recipientId:    mongoose.Schema.Types.ObjectId,
  type:           { type: String, enum: ["fee_reminder","attendance_alert","result","notice","custom","timetable_change"] },
  title:          { type: String, required: true },
  message:        { type: String, required: true },
  channel:        { type: String, enum: ["whatsapp","sms","email","inapp"] },
  status:         { type: String, enum: ["pending","sent","failed"], default: "pending" },
  scheduledAt:    Date,
  sentAt:         Date,
  errorMessage:   String,
}, { timestamps: true });
notificationSchema.index({ ownerId: 1, createdAt: -1 });
export const Notification = mongoose.model("Notification", notificationSchema);

// ── Settings ──────────────────────────────────────────
const settingsSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  institute: {
    name:    { type: String, default: "EduManage" },
    logo:    { type: String, default: null },
    address: { type: String, default: "" },
    phone:   { type: String, default: "" },
    email:   { type: String, default: "" },
    website: { type: String, default: "" },
  },
  branding: {
    primaryColor: { type: String, default: "#3b82f6" },
    domain:       { type: String, default: null },
  },
  notifications: {
    feeReminder:        { type: Boolean, default: true },
    attendanceAlert:    { type: Boolean, default: true },
    resultNotify:       { type: Boolean, default: true },
    reminderDaysBefore: { type: Number,  default: 3 },
  },
  attendance: {
    minPercentage: { type: Number,   default: 80 },
    workingDays:   { type: [String], default: ["Mon","Tue","Wed","Thu","Fri","Sat"] },
  },
  fees: {
    lateFineEnabled: { type: Boolean, default: false },
    lateFineAmount:  { type: Number,  default: 0 },
    currency:        { type: String,  default: "INR" },
  },
  grading: {
    grades: {
      type: [{ label: String, minPercent: Number, maxPercent: Number }],
      default: [
        { label: "A+", minPercent: 90, maxPercent: 100 },
        { label: "A",  minPercent: 80, maxPercent: 89  },
        { label: "B+", minPercent: 70, maxPercent: 79  },
        { label: "B",  minPercent: 60, maxPercent: 69  },
        { label: "C",  minPercent: 50, maxPercent: 59  },
        { label: "D",  minPercent: 40, maxPercent: 49  },
        { label: "F",  minPercent: 0,  maxPercent: 39  },
      ],
    },
  },
}, { timestamps: true });
export const Settings = mongoose.model("Settings", settingsSchema);
