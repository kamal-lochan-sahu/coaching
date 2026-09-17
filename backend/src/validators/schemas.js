import Joi from "joi";

// Reusable Mongo ObjectId string validator
const objectId = () => Joi.string().hex().length(24);

/* ── Batch ─────────────────────────────────────────── */
export const createBatchSchema = Joi.object({
  branchId: objectId().required(),
  name: Joi.string().min(2).max(100).required(),
  description: Joi.string().allow("").max(500),
  subjects: Joi.array().items(Joi.string()),
  teacherId: objectId().allow(null, ""),
  timing: Joi.object({
    days: Joi.array().items(Joi.string().valid("Mon","Tue","Wed","Thu","Fri","Sat","Sun")),
    startTime: Joi.string().allow(""),
    endTime: Joi.string().allow(""),
  }),
  capacity: Joi.number().integer().min(1),
  feeStructure: Joi.object({
    amount: Joi.number().min(0).required(),
    frequency: Joi.string().valid("monthly","quarterly","yearly","one-time"),
    dueDate: Joi.number().integer().min(1).max(28),
  }).required(),
  isActive: Joi.boolean(),
}).unknown(true);

export const updateBatchSchema = Joi.object({
  branchId: objectId(),
  name: Joi.string().min(2).max(100),
  description: Joi.string().allow("").max(500),
  subjects: Joi.array().items(Joi.string()),
  teacherId: objectId().allow(null, ""),
  timing: Joi.object({
    days: Joi.array().items(Joi.string().valid("Mon","Tue","Wed","Thu","Fri","Sat","Sun")),
    startTime: Joi.string().allow(""),
    endTime: Joi.string().allow(""),
  }),
  capacity: Joi.number().integer().min(1),
  feeStructure: Joi.object({
    amount: Joi.number().min(0),
    frequency: Joi.string().valid("monthly","quarterly","yearly","one-time"),
    dueDate: Joi.number().integer().min(1).max(28),
  }),
  isActive: Joi.boolean(),
}).min(1).unknown(true);

/* ── Branch ────────────────────────────────────────── */
export const createBranchSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  address: Joi.string().allow("").max(300),
  phone: Joi.string().allow("").max(20),
  email: Joi.string().allow("").email(),
}).unknown(true);

export const updateBranchSchema = Joi.object({
  name: Joi.string().min(2).max(100),
  address: Joi.string().allow("").max(300),
  phone: Joi.string().allow("").max(20),
  email: Joi.string().allow("").email(),
  managerId: objectId().allow(null, ""),
  isActive: Joi.boolean(),
}).min(1).unknown(true);

/* ── Student ───────────────────────────────────────── */
export const createStudentSchema = Joi.object({
  branchId: objectId().required(),
  batchId: objectId().allow(null, ""),
  name: Joi.string().min(2).max(100).required(),
  phone: Joi.string().allow("").max(20),
  email: Joi.string().allow("").email(),
  dateOfBirth: Joi.date().allow(null, ""),
  gender: Joi.string().valid("male","female","other"),
  address: Joi.string().allow("").max(300),
  guardianName: Joi.string().allow("").max(100),
  guardianPhone: Joi.string().allow("").max(20),
  guardianRelation: Joi.string().valid("father","mother","guardian","other"),
  notes: Joi.string().allow("").max(1000),
}).unknown(true);

export const updateStudentSchema = Joi.object({
  branchId: objectId(),
  name: Joi.string().min(2).max(100),
  phone: Joi.string().allow("").max(20),
  email: Joi.string().allow("").email(),
  dateOfBirth: Joi.date().allow(null, ""),
  gender: Joi.string().valid("male","female","other"),
  address: Joi.string().allow("").max(300),
  guardianName: Joi.string().allow("").max(100),
  guardianPhone: Joi.string().allow("").max(20),
  guardianRelation: Joi.string().valid("father","mother","guardian","other"),
  status: Joi.string().valid("active","inactive","passed","dropped"),
  notes: Joi.string().allow("").max(1000),
}).min(1).unknown(true);

export const transferStudentSchema = Joi.object({
  newBatchId: objectId().required(),
}).unknown(true);

/* ── Attendance ────────────────────────────────────── */
export const markAttendanceSchema = Joi.object({
  batchId: objectId().required(),
  branchId: objectId().required(),
  date: Joi.date().required(),
  records: Joi.array().items(
    Joi.object({
      studentId: objectId().required(),
      status: Joi.string().valid("present","absent","late","holiday").required(),
      note: Joi.string().allow("").max(200),
    })
  ).min(1).required(),
}).unknown(true);

/* ── Fee ───────────────────────────────────────────── */
export const collectFeeSchema = Joi.object({
  studentId: objectId().required(),
  batchId: objectId().required(),
  branchId: objectId().required(),
  amount: Joi.number().min(0).required(),
  discount: Joi.number().min(0).default(0),
  paymentMode: Joi.string().valid("cash","upi","cheque","online",""),
  month: Joi.string().pattern(/^\d{4}-\d{2}$/).required(),
  note: Joi.string().allow("").max(500),
}).unknown(true);

export const waiveFeeSchema = Joi.object({
  reason: Joi.string().min(2).max(500).required(),
}).unknown(true);

export const generateFeeForBatchSchema = Joi.object({
  batchId: objectId().required(),
  branchId: objectId(),
  month: Joi.string().pattern(/^\d{4}-\d{2}$/).required(),
  dueDate: Joi.date().allow(null, ""),
}).unknown(true);

/* ── Test & Results ────────────────────────────────── */
export const createTestSchema = Joi.object({
  branchId: objectId().required(),
  batchId: objectId().required(),
  name: Joi.string().min(2).max(100).required(),
  subject: Joi.string().allow("").max(100),
  date: Joi.date().required(),
  totalMarks: Joi.number().min(1).required(),
  passingMarks: Joi.number().min(0).required(),
}).unknown(true);

export const updateTestSchema = Joi.object({
  branchId: objectId(),
  batchId: objectId(),
  name: Joi.string().min(2).max(100),
  subject: Joi.string().allow("").max(100),
  date: Joi.date(),
  totalMarks: Joi.number().min(1),
  passingMarks: Joi.number().min(0),
}).min(1).unknown(true);

export const enterResultsSchema = Joi.object({
  results: Joi.array().items(
    Joi.object({
      studentId: objectId().required(),
      marksObtained: Joi.number().min(0).required(),
      remarks: Joi.string().allow("").max(300),
    })
  ).min(1).required(),
}).unknown(true);

/* ── Staff & Salary ────────────────────────────────── */
export const addStaffSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().min(10).max(15).required(),
  password: Joi.string().min(8).required(),
  role: Joi.string().valid("admin","teacher","receptionist"),
  designation: Joi.string().allow("").max(100),
  subjects: Joi.array().items(Joi.string()),
  branchId: objectId().required(),
  salary: Joi.object({
    amount: Joi.number().min(0),
    paymentDay: Joi.number().integer().min(1).max(28),
  }),
}).unknown(true);

export const updateStaffSchema = Joi.object({
  designation: Joi.string().allow("").max(100),
  subjects: Joi.array().items(Joi.string()),
  branchId: objectId(),
  salary: Joi.object({
    amount: Joi.number().min(0),
    paymentDay: Joi.number().integer().min(1).max(28),
  }),
  isActive: Joi.boolean(),
  notes: Joi.string().allow("").max(1000),
}).min(1).unknown(true);

export const paySalarySchema = Joi.object({
  month: Joi.number().integer().min(1).max(12).required(),
  year: Joi.number().integer().min(2000).max(2100).required(),
  basicSalary: Joi.number().min(0).required(),
  advance: Joi.number().min(0).default(0),
  deductions: Joi.number().min(0).default(0),
  bonus: Joi.number().min(0).default(0),
  paymentMode: Joi.string().valid("cash","bank_transfer","upi","cheque"),
  note: Joi.string().allow("").max(500),
}).unknown(true);

/* ── Enquiry ───────────────────────────────────────── */
export const createEnquirySchema = Joi.object({
  branchId: objectId().required(),
  name: Joi.string().min(2).max(100).required(),
  phone: Joi.string().min(10).max(15).required(),
  email: Joi.string().allow("").email(),
  interestedIn: Joi.string().allow("").max(200),
  source: Joi.string().valid("referral","social_media","walk_in","online","other"),
  status: Joi.string().valid("new","contacted","converted","lost"),
  followUpDate: Joi.date().allow(null, ""),
}).unknown(true);

export const updateEnquirySchema = Joi.object({
  branchId: objectId(),
  name: Joi.string().min(2).max(100),
  phone: Joi.string().min(10).max(15),
  email: Joi.string().allow("").email(),
  interestedIn: Joi.string().allow("").max(200),
  source: Joi.string().valid("referral","social_media","walk_in","online","other"),
  status: Joi.string().valid("new","contacted","converted","lost"),
  followUpDate: Joi.date().allow(null, ""),
}).min(1).unknown(true);

export const addFollowUpSchema = Joi.object({
  text: Joi.string().min(1).max(500).required(),
  followUpDate: Joi.date().allow(null, ""),
}).unknown(true);

export const convertEnquirySchema = Joi.object({
  branchId: objectId().required(),
  batchId: objectId().allow(null, ""),
}).unknown(true);

/* ── Expense ───────────────────────────────────────── */
export const addExpenseSchema = Joi.object({
  branchId: objectId().required(),
  category: Joi.string().valid(
    "rent","salary","electricity","stationery","maintenance","marketing","equipment","other"
  ).required(),
  amount: Joi.number().min(0).required(),
  description: Joi.string().allow("").max(500),
  date: Joi.date().allow(null, ""),
}).unknown(true);

/* ── Notification ──────────────────────────────────── */
export const sendNotificationSchema = Joi.object({
  type: Joi.string().valid("fee_reminder","attendance_alert","result","notice","custom","timetable_change").required(),
  title: Joi.string().min(1).max(200).required(),
  message: Joi.string().min(1).max(2000).required(),
  channel: Joi.string().valid("whatsapp","sms","email","inapp").required(),
  recipientType: Joi.string().valid("student","parent","staff","all","batch").required(),
  batchId: objectId().allow(null, ""),
}).unknown(true);

/* ── Settings ──────────────────────────────────────── */
export const updateSettingsSchema = Joi.object({
  institute: Joi.object({
    name: Joi.string().max(100),
    logo: Joi.string().allow("", null),
    address: Joi.string().allow(""),
    phone: Joi.string().allow(""),
    email: Joi.string().allow("").email(),
    website: Joi.string().allow(""),
  }),
  notifications: Joi.object({
    feeReminder: Joi.boolean(),
    attendanceAlert: Joi.boolean(),
    resultNotify: Joi.boolean(),
    reminderDaysBefore: Joi.number().integer().min(0).max(30),
  }),
  attendance: Joi.object({
    minPercentage: Joi.number().min(0).max(100),
    workingDays: Joi.array().items(Joi.string().valid("Mon","Tue","Wed","Thu","Fri","Sat","Sun")),
  }),
  fees: Joi.object({
    lateFineEnabled: Joi.boolean(),
    lateFineAmount: Joi.number().min(0),
    currency: Joi.string().max(10),
  }),
  grading: Joi.object({
    grades: Joi.array().items(Joi.object({
      label: Joi.string().required(),
      minPercent: Joi.number().min(0).max(100).required(),
      maxPercent: Joi.number().min(0).max(100).required(),
    })),
  }),
}).min(1).unknown(true);

export const updateBrandingSchema = Joi.object({
  instituteName: Joi.string().max(100),
  primaryColor: Joi.string().max(20),
  logo: Joi.string().allow("", null),
  domain: Joi.string().allow("", null),
}).min(1).unknown(true);

/* ── Timetable ─────────────────────────────────────── */
const slotSchema = Joi.object({
  startTime: Joi.string().allow(""),
  endTime: Joi.string().allow(""),
  subject: Joi.string().allow(""),
  teacherId: objectId().allow(null, ""),
});

export const createTimetableSchema = Joi.object({
  branchId: objectId().required(),
  batchId: objectId().required(),
  schedule: Joi.array().items(
    Joi.object({
      day: Joi.string().valid("Mon","Tue","Wed","Thu","Fri","Sat","Sun").required(),
      slots: Joi.array().items(slotSchema),
    })
  ),
  effectiveFrom: Joi.date().allow(null, ""),
}).unknown(true);

export const updateTimetableSchema = Joi.object({
  schedule: Joi.array().items(
    Joi.object({
      day: Joi.string().valid("Mon","Tue","Wed","Thu","Fri","Sat","Sun").required(),
      slots: Joi.array().items(slotSchema),
    })
  ),
  effectiveFrom: Joi.date().allow(null, ""),
  isActive: Joi.boolean(),
}).min(1).unknown(true);
