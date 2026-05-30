import express from "express";
import cors from "cors";
import helmet from "helmet";
import "dotenv/config";

import { rateLimiter, requestLogger, notFound, errorHandler } from "./middleware/error.middleware.js";

// Route imports
import authRoutes         from "./routes/auth.routes.js";
import branchRoutes       from "./routes/branch.routes.js";
import studentRoutes      from "./routes/student.routes.js";
import batchRoutes        from "./routes/batch.routes.js";
import attendanceRoutes   from "./routes/attendance.routes.js";
import feeRoutes          from "./routes/fee.routes.js";
import testRoutes         from "./routes/test.routes.js";
import resultRoutes       from "./routes/result.routes.js";
import timetableRoutes    from "./routes/timetable.routes.js";
import staffRoutes        from "./routes/staff.routes.js";
import enquiryRoutes      from "./routes/enquiry.routes.js";
import expenseRoutes      from "./routes/expense.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import analyticsRoutes    from "./routes/analytics.routes.js";
import settingsRoutes     from "./routes/settings.routes.js";
import uploadRoutes       from "./routes/upload.routes.js";

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true,
  methods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization"],
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(requestLogger);
app.use("/api", rateLimiter);

// Root route for base health check
app.get("/", (req, res) => res.json({
  service: "EduManage API",
  status: "active",
  message: "Service is running smoothly",
  environment: process.env.NODE_ENV || "development"
}));

// API Health route
app.get("/api/health", (req, res) => res.json({
  status: "healthy",
  uptime: process.uptime(),
  timestamp: new Date().toISOString(),
  node_version: process.version
}));

// Graceful favicon handling
app.get("/favicon.ico", (req, res) => res.status(204).end());

const API = "/api";
app.use(`${API}/auth`,          authRoutes);
app.use(`${API}/branches`,      branchRoutes);
app.use(`${API}/students`,      studentRoutes);
app.use(`${API}/batches`,       batchRoutes);
app.use(`${API}/attendance`,    attendanceRoutes);
app.use(`${API}/fees`,          feeRoutes);
app.use(`${API}/tests`,         testRoutes);
app.use(`${API}/results`,       resultRoutes);
app.use(`${API}/timetable`,     timetableRoutes);
app.use(`${API}/staff`,         staffRoutes);
app.use(`${API}/enquiries`,     enquiryRoutes);
app.use(`${API}/expenses`,      expenseRoutes);
app.use(`${API}/notifications`, notificationRoutes);
app.use(`${API}/analytics`,     analyticsRoutes);
app.use(`${API}/settings`,      settingsRoutes);
app.use(`${API}/upload`,        uploadRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
