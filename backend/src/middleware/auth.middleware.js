import { verifyAccessToken } from "../utils/jwt.utils.js";
import { ApiError } from "../utils/ApiHelpers.js";
import User from "../models/User.js";

export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new ApiError(401, "No token provided");
    }
    const token   = authHeader.split(" ")[1];
    const decoded = verifyAccessToken(token);
    const user    = await User.findById(decoded.userId).select("-password -refreshToken");
    if (!user || !user.isActive) throw new ApiError(401, "Invalid or expired token");
    req.user    = user;
    req.ownerId = user.role === "owner" ? user._id : user.ownerId;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") return next(new ApiError(401, "Invalid token"));
    if (error.name === "TokenExpiredError")  return next(new ApiError(401, "Token expired — please refresh"));
    next(error);
  }
};

export const authorize = (...roles) => (req, res, next) => {
  if (!req.user) return next(new ApiError(401, "Not authenticated"));
  if (!roles.includes(req.user.role))
    return next(new ApiError(403, `Access denied. Required: ${roles.join(" or ")}. Your role: ${req.user.role}`));
  next();
};

export const ownerOnly        = authorize("owner");
export const adminAndAbove    = authorize("owner", "admin");
export const teacherAndAbove  = authorize("owner", "admin", "teacher");
export const allRoles         = authorize("owner", "admin", "teacher", "receptionist");
