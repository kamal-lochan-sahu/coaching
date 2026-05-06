import cron from "node-cron";
import { Attendance } from "../models/Academic.js";
import Student from "../models/Student.js";
import User from "../models/User.js";
import { sendWhatsApp, whatsappTemplates } from "../config/twilio.js";

// Runs on 1st of every month at 10 AM
export const startAttendanceAlertJob = () => {
  cron.schedule("0 10 1 * *", async () => {
    console.log("⏰ Attendance alert job running...");
    try {
      const now   = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth()).padStart(2,"0")}`;
      const [year, m] = month.split("-");
      const start = new Date(year, m - 1, 1);
      const end   = new Date(year, m, 0);

      const records = await Attendance.find({ date: { $gte: start, $lte: end } });
      const map = {};
      for (const r of records) {
        const sid = r.studentId.toString();
        if (!map[sid]) map[sid] = { ownerId: r.ownerId, present: 0, total: 0 };
        map[sid].total++;
        if (r.status === "present" || r.status === "late") map[sid].present++;
      }

      for (const [sid, data] of Object.entries(map)) {
        const pct = Math.round((data.present / data.total) * 100);
        if (pct < 80) {
          const student = await Student.findById(sid);
          const owner   = await User.findById(data.ownerId);
          const phone   = student?.guardianPhone || student?.phone;
          if (!phone) continue;
          const msg = whatsappTemplates.attendanceAlert(
            student.name, pct, month, owner?.branding?.instituteName || "EduManage"
          );
          await sendWhatsApp(phone, msg);
        }
      }
      console.log("✅ Attendance alerts sent");
    } catch (e) {
      console.error("Attendance alert job failed:", e.message);
    }
  });
  console.log("✅ Attendance alert cron started (1st of month 10 AM)");
};
