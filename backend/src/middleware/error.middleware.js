import { ApiError } from "../utils/ApiHelpers.js";
import rateLimit from "express-rate-limit";

export const errorHandler = (err, req, res, next) => {
  let error = { ...err, message: err.message };

  if (err.name === "CastError")
    error = new ApiError(400, `Invalid ID: ${err.value}`);
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    error = new ApiError(409, `${field} already exists`);
  }
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    error = new ApiError(400, messages.join(", "));
  }
  if (err.name === "JsonWebTokenError") error = new ApiError(401, "Invalid token");
  if (err.name === "TokenExpiredError")  error = new ApiError(401, "Token expired");

  const statusCode = error.statusCode || 500;
  if (statusCode === 500) console.error("💥 Server Error:", err);

  res.status(statusCode).json({
    success: false,
    message: error.message || "Internal Server Error",
    errors: error.errors || [],
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

export const notFound = (req, res, next) => {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};

export const rateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests. Wait a minute." },
  skip: (req) => req.path === "/health",
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many login attempts. Try again in 15 minutes." },
});

export const requestLogger = (req, res, next) => {
  if (process.env.NODE_ENV === "development") {
    const start = Date.now();
    res.on("finish", () => {
      const ms    = Date.now() - start;
      const color = res.statusCode >= 500 ? "\x1b[31m"
                  : res.statusCode >= 400 ? "\x1b[33m"
                  : "\x1b[32m";
      console.log(`${color}${req.method}\x1b[0m ${req.originalUrl} ${res.statusCode} — ${ms}ms`);
    });
  }
  next();
};
