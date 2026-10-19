import { ApiError } from "../utils/ApiHelpers.js";
import rateLimit from "express-rate-limit";

// Turn ANY thrown error into an ApiError with a safe, correct status code.
const toApiError = (err) => {
  if (err instanceof ApiError) return err;

  if (err.name === "CastError") {
    const what = err.path && err.path !== "_id" ? `value for "${err.path}"` : "ID";
    return new ApiError(400, `Invalid ${what}`);
  }
  if (err.code === 11000) {
    // Compound indexes list ownerId first ("ownerId already exists" would be meaningless).
    const keys = Object.keys(err.keyValue || err.keyPattern || {}).filter((k) => k !== "ownerId");
    return new ApiError(409, `${keys[0] || "field"} already exists`);
  }
  if (err.name === "ValidationError" && err.errors) {
    return new ApiError(400, Object.values(err.errors).map((e) => e.message).join(", "));
  }
  if (err.name === "JsonWebTokenError") return new ApiError(401, "Invalid token");
  if (err.name === "TokenExpiredError")  return new ApiError(401, "Token expired");

  // body-parser: oversize / malformed JSON
  if (err.type === "entity.too.large")    return new ApiError(413, "Request body too large");
  if (err.type === "entity.parse.failed") return new ApiError(400, "Invalid JSON in request body");

  // multer: file upload problems are the client's fault, not a server crash
  if (err.name === "MulterError") {
    return err.code === "LIMIT_FILE_SIZE"
      ? new ApiError(413, "File too large")
      : new ApiError(400, err.message);
  }

  // Any other library error that carries an HTTP 4xx status. NOTE: libraries such as
  // http-errors keep `status`/`statusCode` on the prototype, so they must be read
  // straight from the error object (copying it with {...err} silently loses them).
  const status = err.statusCode || err.status;
  if (Number.isInteger(status) && status >= 400 && status < 500) return new ApiError(status, err.message);

  return null; // unexpected -> handled as a 500 below
};

export const errorHandler = (err, req, res, next) => {
  const apiError = toApiError(err);
  const statusCode = apiError?.statusCode || 500;

  if (statusCode >= 500) console.error("💥 Server Error:", err);

  // Never send internals (Mongo errors, "Cannot read properties of undefined"...) to the
  // client in production. Messages of deliberate ApiErrors (e.g. 503 "upload not configured") are kept.
  const message = apiError
    ? apiError.message
    : (process.env.NODE_ENV === "production" ? "Internal Server Error" : err.message || "Internal Server Error");

  res.status(statusCode).json({
    success: false,
    message,
    errors: apiError?.errors || [],
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
  const isDev = process.env.NODE_ENV === "development";
  const start = Date.now();
  res.on("finish", () => {
    if (req.originalUrl === "/api/health") return; // uptime pings every 5 min would flood the log
    const ms = Date.now() - start;
    if (isDev) {
      const color = res.statusCode >= 500 ? "\x1b[31m"
                  : res.statusCode >= 400 ? "\x1b[33m"
                  : "\x1b[32m";
      console.log(`${color}${req.method}\x1b[0m ${req.originalUrl} ${res.statusCode} — ${ms}ms`);
    } else if (res.statusCode >= 500 || ms > 2000) {
      // Production: only failures and slow requests, and without the query string
      // (it can contain search terms such as phone numbers).
      console.log(`${req.method} ${req.originalUrl.split("?")[0]} ${res.statusCode} — ${ms}ms`);
    }
  });
  next();
};
