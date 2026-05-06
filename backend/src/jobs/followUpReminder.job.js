import cron from "node-cron";
import { Enquiry } from "../models/Management.js";
import User from "../models/User.js";
import { sendWhatsApp } from "../config/twilio.js";

// Runs daily at 8 AM
export const startFollowUpReminderJob = () => {
  cron.schedule("0 8 * * *", async () => {
    console.log("⏰ Follow-up reminder job running...");
    try {
      const today = new Date();
      const start = new Date(today.setHours(0,0,0,0));
      const end   = new Date(today.setHours(23,59,59,999));

      const enquiries = await Enquiry.find({
        status: { $in: ["new","contacted"] },
        followUpDate: { $gte: start, $lte: end },
      });

      for (const enq of enquiries) {
        const owner = await User.findById(enq.ownerId);
        if (!owner?.phone) continue;
        const msg = `🔔 Follow-up Reminder

Enquiry: ${enq.name} (${enq.phone})
Interested in: ${enq.interestedIn || "—"}

Please follow up today.`;
        await sendWhatsApp(owner.phone, msg);
      }
      console.log(`✅ Follow-up reminders sent: ${enquiries.length}`);
    } catch (e) {
      console.error("Follow-up reminder job failed:", e.message);
    }
  });
  console.log("✅ Follow-up reminder cron started (daily 8 AM)");
};
