import "dotenv/config";
import app from "./app.js";
import connectDB from "./config/db.js";
import { connectRedis } from "./config/redis.js";
import { connectEmail } from "./config/email.js";
import { connectTwilio } from "./config/twilio.js";
import { startFeeReminderJob } from "./jobs/feeReminder.job.js";
import { startAttendanceAlertJob } from "./jobs/attendanceAlert.job.js";
import { startFollowUpReminderJob } from "./jobs/followUpReminder.job.js";

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  console.log("\n🚀 EduManage — Coaching Management System");
  console.log("==========================================");
  try {
    await connectDB();
    await connectRedis();
    await connectEmail();
    connectTwilio();

    // Start cron jobs
    startFeeReminderJob();
    startAttendanceAlertJob();
    startFollowUpReminderJob();

    const server = app.listen(PORT, () => {
      console.log("==========================================");
      console.log(`✅ Server: http://localhost:${PORT}`);
      console.log(`📚 API:    http://localhost:${PORT}/api`);
      console.log(`🏥 Health: http://localhost:${PORT}/health`);
      console.log(`🌍 Env:    ${process.env.NODE_ENV}`);
      console.log("==========================================\n");
    });

    const shutdown = async (signal) => {
      console.log(`\n⚡ ${signal} — shutting down`);
      server.close(async () => {
        const mongoose = await import("mongoose");
        await mongoose.default.connection.close();
        console.log("✅ Shutdown complete\n");
        process.exit(0);
      });
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT",  () => shutdown("SIGINT"));
    process.on("unhandledRejection", (r) => console.error("💥 Unhandled:", r));
    process.on("uncaughtException",  (e) => { console.error("💥 Uncaught:", e); process.exit(1); });

  } catch (error) {
    console.error("❌ Startup failed:", error.message);
    process.exit(1);
  }
};

startServer();
