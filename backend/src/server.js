import "dotenv/config";
import mongoose from "mongoose";
import app from "./app.js";
import connectDB from "./config/db.js";
import { connectRedis, disconnectRedis } from "./config/redis.js";
import { connectEmail } from "./config/email.js";
import { connectTwilio } from "./config/twilio.js";
import { startFeeReminderJob } from "./jobs/feeReminder.job.js";
import { startAttendanceAlertJob } from "./jobs/attendanceAlert.job.js";
import { startFollowUpReminderJob } from "./jobs/followUpReminder.job.js";

const PORT = process.env.PORT || 5000;
const SHUTDOWN_TIMEOUT_MS = 10_000;

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
      console.log(`🏥 Health: http://localhost:${PORT}/api/health`);
      console.log(`🌍 Env:    ${process.env.NODE_ENV || "development"}`);
      console.log("==========================================\n");
    });

    let shuttingDown = false;
    const shutdown = (signal) => {
      if (shuttingDown) return; // ignore a second Ctrl+C / repeated signal
      shuttingDown = true;
      console.log(`\n⚡ ${signal} — shutting down`);

      // Safety net: a stuck keep-alive connection must not block the exit forever.
      const force = setTimeout(() => {
        console.error("⏱️  Shutdown timed out — forcing exit");
        process.exit(1);
      }, SHUTDOWN_TIMEOUT_MS);
      force.unref();

      server.close(async () => {
        try {
          await mongoose.connection.close();
          await disconnectRedis();
          console.log("✅ Shutdown complete\n");
          process.exit(0);
        } catch (err) {
          console.error("❌ Error during shutdown:", err.message);
          process.exit(1);
        }
      });
      server.closeIdleConnections?.(); // drop idle keep-alive sockets so close() can finish
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
