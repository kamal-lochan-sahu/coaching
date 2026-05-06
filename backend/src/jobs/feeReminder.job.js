import cron from "node-cron";
import { Fee } from "../models/Academic.js";
import Student from "../models/Student.js";
import User from "../models/User.js";
import { sendWhatsApp, whatsappTemplates } from "../config/twilio.js";

// Runs daily at 9 AM
export const startFeeReminderJob = () => {
  cron.schedule("0 9 * * *", async () => {
    console.log("⏰ Fee reminder job running...");
    try {
      const threeDaysLater = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
      const pending = await Fee.find({
        status: "pending",
        dueDate: { $lte: threeDaysLater, $gte: new Date() },
      }).populate("studentId", "name guardianPhone phone").populate("ownerId");

      for (const fee of pending) {
        const student = fee.studentId;
        const owner   = await User.findById(fee.ownerId);
        const phone   = student.guardianPhone || student.phone;
        if (!phone) continue;

        const msg = whatsappTemplates.feeDueReminder(
          student.name, fee.finalAmount,
          new Date(fee.dueDate).toLocaleDateString("en-IN"),
          owner?.branding?.instituteName || "EduManage"
        );
        await sendWhatsApp(phone, msg);
      }
      console.log(`✅ Fee reminders sent: ${pending.length}`);
    } catch (e) {
      console.error("Fee reminder job failed:", e.message);
    }
  });
  console.log("✅ Fee reminder cron started (daily 9 AM)");
};
