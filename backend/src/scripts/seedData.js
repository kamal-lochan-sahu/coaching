import "dotenv/config";
import mongoose from "mongoose";
import User from "../models/User.js";
import Branch from "../models/Branch.js";
import Student from "../models/Student.js";
import Batch from "../models/Batch.js";
import { Attendance, Fee, Test, Result } from "../models/Academic.js";
import { Enquiry, Expense } from "../models/Management.js";

const OWNER_EMAIL = "kamal@test.com";

const STUDENT_NAMES = [
  ["Arjun Sharma","9811111111","Rajesh Sharma","9811111110"],
  ["Priya Patel","9822222222","Suresh Patel","9822222220"],
  ["Rahul Verma","9833333333","Mahesh Verma","9833333330"],
  ["Anjali Singh","9844444444","Ramesh Singh","9844444440"],
  ["Vikram Gupta","9855555555","Dinesh Gupta","9855555550"],
  ["Neha Joshi","9866666666","Kamlesh Joshi","9866666660"],
  ["Amit Yadav","9877777777","Suresh Yadav","9877777770"],
  ["Pooja Mishra","9888888888","Rakesh Mishra","9888888880"],
  ["Rohan Tiwari","9899999999","Vijay Tiwari","9899999990"],
  ["Sneha Pandey","9900000000","Anil Pandey","9900000001"],
  ["Karan Malhotra","9911111111","Deepak Malhotra","9911111110"],
  ["Riya Kapoor","9922222222","Vijay Kapoor","9922222220"],
  ["Sohail Khan","9933333333","Imran Khan","9933333330"],
  ["Deepika Nair","9944444444","Suresh Nair","9944444440"],
  ["Aditya Kumar","9955555555","Ramesh Kumar","9955555550"],
  ["Divya Shukla","9966666666","Prakash Shukla","9966666660"],
  ["Nikhil Reddy","9977777777","Venkat Reddy","9977777770"],
  ["Kavya Iyer","9988888888","Ravi Iyer","9988888880"],
  ["Harsh Agarwal","9999999999","Mohan Agarwal","9999999990"],
  ["Swati Dubey","9900011111","Ashok Dubey","9900011110"],
  ["Manish Srivastava","9900022222","Sunil Srivastava","9900022220"],
  ["Payal Chauhan","9900033333","Vikas Chauhan","9900033330"],
  ["Tushar Bhatt","9900044444","Girish Bhatt","9900044440"],
  ["Nisha Choudhary","9900055555","Rajendra Choudhary","9900055550"],
  ["Gaurav Saxena","9900066666","Arvind Saxena","9900066660"],
  ["Preeti Bansal","9900077777","Mahendra Bansal","9900077770"],
  ["Rohit Mathur","9900088888","Satish Mathur","9900088880"],
  ["Sunita Bose","9900099999","Tapan Bose","9900099990"],
  ["Varun Pillai","9900100000","Krishna Pillai","9900100001"],
  ["Ananya Desai","9900200000","Hemant Desai","9900200001"],
  ["Raj Mehta","9900300000","Sanjay Mehta","9900300001"],
  ["Isha Trivedi","9900400000","Vinod Trivedi","9900400001"],
  ["Dev Thakur","9900500000","Bhupesh Thakur","9900500001"],
  ["Manya Bajaj","9900600000","Rakesh Bajaj","9900600001"],
  ["Aryan Chopra","9900700000","Pankaj Chopra","9900700001"],
  ["Palak Sethi","9900800000","Naresh Sethi","9900800001"],
  ["Shubham Garg","9900900000","Ramesh Garg","9900900001"],
  ["Tanya Mittal","9901000000","Suresh Mittal","9901000001"],
  ["Siddharth Jain","9901100000","Mahesh Jain","9901100001"],
  ["Kritika Awasthi","9901200000","Dinesh Awasthi","9901200001"],
  ["Ayush Tripathi","9901300000","Vishnu Tripathi","9901300001"],
  ["Ritu Bhardwaj","9901400000","Santosh Bhardwaj","9901400001"],
  ["Dhruv Sinha","9901500000","Arun Sinha","9901500001"],
  ["Shruti Rao","9901600000","Venkatesh Rao","9901600001"],
  ["Pranav Biswas","9901700000","Tapas Biswas","9901700001"],
  ["Aditi Ghosh","9901800000","Subhas Ghosh","9901800001"],
  ["Yash Patil","9901900000","Dilip Patil","9901900001"],
  ["Simran Ahuja","9902000000","Harish Ahuja","9902000001"],
  ["Kartik Negi","9902100000","Mohan Negi","9902100001"],
  ["Meera Goswami","9902200000","Tarun Goswami","9902200001"],
];

const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("✅ MongoDB connected");

  // Get owner
  const owner = await User.findOne({ email: OWNER_EMAIL });
  if (!owner) { console.error("❌ Owner not found. Register first at /api/auth/register"); process.exit(1); }
  console.log(`✅ Owner: ${owner.name}`);

  const ownerId = owner._id;

  // Get or create branch
  let branch = await Branch.findOne({ ownerId });
  if (!branch) {
    branch = await Branch.create({ ownerId, name: "Main Branch", address: "MG Road, Cuttack", phone: "0671-1234567" });
  }
  const branchId = branch._id;
  console.log(`✅ Branch: ${branch.name}`);

  // Clear old demo data (keep real data)
  await Student.deleteMany({ ownerId, phone: { $regex: /^990/ } });
  await Fee.deleteMany({ ownerId, note: "demo" });
  await Attendance.deleteMany({ ownerId });
  await Result.deleteMany({ ownerId });
  await Test.deleteMany({ ownerId, name: { $regex: /Demo/ } });
  await Enquiry.deleteMany({ ownerId, notes: { $size: 0 }, phone: { $regex: /^990/ } });
  await Expense.deleteMany({ ownerId, description: { $regex: /demo/ } });
  console.log("🧹 Old demo data cleared");

  // ── Create 3 batches ──────────────────────────────
  const batchData = [
    { name:"Class 10 - Morning", subjects:["Math","Science","English"], startTime:"08:00", endTime:"10:00", days:["Mon","Tue","Wed","Thu","Fri"], amount:2000, capacity:20 },
    { name:"Class 12 - Evening", subjects:["Physics","Chemistry","Math"], startTime:"17:00", endTime:"19:00", days:["Mon","Wed","Fri","Sat"], amount:2500, capacity:20 },
    { name:"Spoken English",     subjects:["English","Communication"],   startTime:"11:00", endTime:"12:00", days:["Tue","Thu","Sat"],         amount:1500, capacity:15 },
  ];

  const batches = [];
  for (const bd of batchData) {
    const existing = await Batch.findOne({ ownerId, name: bd.name });
    if (existing) { batches.push(existing); continue; }
    const b = await Batch.create({ ownerId, branchId, ...bd, timing:{ days:bd.days, startTime:bd.startTime, endTime:bd.endTime }, feeStructure:{ amount:bd.amount, frequency:"monthly", dueDate:5 }, enrolled:0 });
    batches.push(b);
  }
  console.log(`✅ Batches: ${batches.map(b=>b.name).join(", ")}`);

  // ── Create 50 students ────────────────────────────
  const students = [];
  for (let i = 0; i < STUDENT_NAMES.length; i++) {
    const [name, phone, guardianName, guardianPhone] = STUDENT_NAMES[i];
    const batch = batches[i % batches.length];
    const admDate = new Date(2026, getRandomInt(0,4), getRandomInt(1,28));

    const student = await Student.create({
      ownerId, branchId,
      name, phone,
      gender: i % 3 === 0 ? "female" : "male",
      guardianName, guardianPhone,
      guardianRelation: "father",
      currentBatch: batch._id,
      admissionDate: admDate,
      admissionNumber: `ADM-DEMO-${Date.now()}-${String(i+1).padStart(3,"0")}`,
      status: "active",
    });
    students.push({ student, batch });
    await Batch.findByIdAndUpdate(batch._id, { $inc: { enrolled: 1 } });
  }
  console.log(`✅ Students: ${students.length} created`);

  // ── Attendance — last 3 months ────────────────────
  const today = new Date();
  let attCount = 0;
  for (let m = 2; m >= 0; m--) {
    const month = new Date(today.getFullYear(), today.getMonth() - m, 1);
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(month.getFullYear(), month.getMonth(), d);
      if (date > today) break;
      if (date.getDay() === 0) continue; // skip Sunday

      for (const { student, batch } of students) {
        const rand = Math.random();
        const status = rand > 0.85 ? "absent" : rand > 0.80 ? "late" : "present";
        try {
          await Attendance.create({ ownerId, branchId, batchId: batch._id, studentId: student._id, date, status, markedBy: ownerId });
          attCount++;
        } catch {}
      }
    }
  }
  console.log(`✅ Attendance: ${attCount} records`);

  // ── Fees — last 3 months ──────────────────────────
  let feeCount = 0;
  const months = ["2026-02","2026-03","2026-04"];
  const payModes = ["cash","upi","online","cheque"];
  for (const month of months) {
    for (let i = 0; i < students.length; i++) {
      const { student, batch } = students[i];
      const isPaid = Math.random() > 0.15; // 85% paid
      const discount = Math.random() > 0.8 ? 200 : 0;
      const amount = batch.feeStructure.amount;
      const receiptNumber = `EDU-DEMO-${month.replace("-","")}-${String(i+1).padStart(3,"0")}`;

      await Fee.create({
        ownerId, branchId, studentId: student._id, batchId: batch._id,
        amount, discount, finalAmount: amount - discount, month,
        dueDate: new Date(month + "-05"),
        paidDate: isPaid ? new Date(month + `-0${getRandomInt(1,9)}`) : null,
        paymentMode: isPaid ? getRandom(payModes) : "",
        receiptNumber: isPaid ? receiptNumber : undefined,
        status: isPaid ? "paid" : "pending",
        collectedBy: ownerId,
        note: "demo",
      });
      feeCount++;
    }
  }
  console.log(`✅ Fees: ${feeCount} records`);

  // ── Tests + Results ───────────────────────────────
  const testData = [
    { name:"Demo Unit Test 1", subject:"Math",    totalMarks:100, passingMarks:40, batchIdx:0 },
    { name:"Demo Unit Test 2", subject:"Science", totalMarks:100, passingMarks:40, batchIdx:0 },
    { name:"Demo Mid Term",    subject:"Physics", totalMarks:150, passingMarks:60, batchIdx:1 },
  ];

  for (const td of testData) {
    const batch = batches[td.batchIdx];
    const testDate = new Date(2026, 3, getRandomInt(1,20));
    const test = await Test.create({ ownerId, branchId, batchId: batch._id, name: td.name, subject: td.subject, date: testDate, totalMarks: td.totalMarks, passingMarks: td.passingMarks, createdBy: ownerId });

    const batchStudents = students.filter(s => s.batch._id.toString() === batch._id.toString());
    const withMarks = batchStudents.map(s => ({ student: s.student, marks: getRandomInt(35, td.totalMarks) }))
      .sort((a,b) => b.marks - a.marks);

    const getGrade = (pct) => {
      if (pct >= 90) return "A+"; if (pct >= 80) return "A"; if (pct >= 70) return "B+";
      if (pct >= 60) return "B";  if (pct >= 50) return "C"; if (pct >= 40) return "D"; return "F";
    };

    for (let i = 0; i < withMarks.length; i++) {
      const { student, marks } = withMarks[i];
      const pct = Math.round((marks / td.totalMarks) * 100);
      await Result.create({ testId: test._id, studentId: student._id, batchId: batch._id, ownerId, marksObtained: marks, percentage: pct, grade: getGrade(pct), rank: i+1, isPassed: marks >= td.passingMarks });
    }
  }
  console.log(`✅ Tests + Results: ${testData.length} tests`);

  // ── Enquiries ─────────────────────────────────────
  const enqNames = [["Rohit Jha","9902300000"],["Sunita Pal","9902400000"],["Vikash Das","9902500000"],["Priti Sahu","9902600000"],["Deepak Roy","9902700000"],["Anita Nath","9902800000"],["Sachin More","9902900000"],["Rekha Pawar","9903000000"]];
  const sources = ["walk_in","referral","social_media","online"];
  const statuses = ["new","new","contacted","contacted","converted","lost"];

  for (const [name, phone] of enqNames) {
    await Enquiry.create({ ownerId, branchId, name, phone, interestedIn: getRandom(batches).name, source: getRandom(sources), status: getRandom(statuses) });
  }
  console.log(`✅ Enquiries: ${enqNames.length} created`);

  // ── Expenses ──────────────────────────────────────
  const expData = [
    { category:"rent",        amount:8000,  description:"demo - May month rent" },
    { category:"electricity", amount:1200,  description:"demo - Electricity bill" },
    { category:"stationery",  amount:500,   description:"demo - Chalk, markers, registers" },
    { category:"maintenance", amount:800,   description:"demo - AC repair" },
    { category:"marketing",   amount:2000,  description:"demo - Facebook ads" },
    { category:"salary",      amount:15000, description:"demo - Teacher salary advance" },
  ];

  for (const exp of expData) {
    await Expense.create({ ownerId, branchId, ...exp, date: new Date(2026, 4, getRandomInt(1,8)), addedBy: ownerId });
  }
  console.log(`✅ Expenses: ${expData.length} created`);

  console.log("\n🎉 Demo data seed complete!");
  console.log(`   👥 Students: ${students.length}`);
  console.log(`   📚 Batches:  ${batches.length}`);
  console.log(`   💰 Fee records: ${feeCount}`);
  console.log(`   📋 Attendance: ${attCount}`);
  console.log("\n🌐 Frontend refresh karo — dashboard mein sab data dikhega!");

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(e => { console.error("❌ Seed failed:", e.message); process.exit(1); });
