import User from "../models/User.js";
import { Settings } from "../models/Management.js";
import { generateTokenPair, verifyRefreshToken, REFRESH_COOKIE_OPTIONS } from "../utils/jwt.utils.js";
import { ApiError } from "../utils/ApiHelpers.js";
import { ApiResponse } from "../utils/ApiHelpers.js";
import { asyncHandler } from "../utils/ApiHelpers.js";

// POST /api/auth/register
export const register = asyncHandler(async (req, res) => {
  const { name, email, phone, password } = req.body;

  const existing = await User.findOne({ email });
  if (existing) throw new ApiError(409, "Email already registered");

  const user = await User.create({
    name, email, phone, password,
    role: "owner",
    branding: {
      instituteName: req.body.instituteName || "My Institute",
      primaryColor: "#3b82f6",
    },
  });

  // Auto-create default settings for this owner
  await Settings.create({ ownerId: user._id });

  const { accessToken, refreshToken } = generateTokenPair(user._id, user.role, user._id);

  user.refreshToken = refreshToken;
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  res.cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTIONS);

  return res.status(201).json(
    new ApiResponse(201, { user, accessToken }, "Registration successful")
  );
});

// POST /api/auth/login
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password");
  if (!user) throw new ApiError(401, "Invalid email or password");
  if (!user.isActive) throw new ApiError(403, "Account deactivated. Contact admin.");

  const isMatch = await user.comparePassword(password);
  if (!isMatch) throw new ApiError(401, "Invalid email or password");

  const ownerId = user.role === "owner" ? user._id : user.ownerId;
  const { accessToken, refreshToken } = generateTokenPair(user._id, user.role, ownerId);

  user.refreshToken = refreshToken;
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  res.cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTIONS);

  return res.status(200).json(
    new ApiResponse(200, { user, accessToken }, "Login successful")
  );
});

// POST /api/auth/logout
export const logout = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
  res.clearCookie("refreshToken");
  return res.status(200).json(new ApiResponse(200, null, "Logged out successfully"));
});

// POST /api/auth/refresh-token
export const refreshToken = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken || req.body?.refreshToken;
  if (!token) throw new ApiError(401, "Refresh token missing");

  let decoded;
  try {
    decoded = verifyRefreshToken(token);
  } catch {
    throw new ApiError(401, "Invalid or expired refresh token");
  }

  const user = await User.findById(decoded.userId).select("+refreshToken");
  if (!user || user.refreshToken !== token) {
    throw new ApiError(401, "Refresh token reuse detected — please login again");
  }

  const ownerId = user.role === "owner" ? user._id : user.ownerId;
  const { accessToken, refreshToken: newRefreshToken } = generateTokenPair(user._id, user.role, ownerId);

  user.refreshToken = newRefreshToken;
  await user.save({ validateBeforeSave: false });

  res.cookie("refreshToken", newRefreshToken, REFRESH_COOKIE_OPTIONS);

  return res.status(200).json(
    new ApiResponse(200, { accessToken }, "Token refreshed")
  );
});

// GET /api/auth/me
export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  return res.status(200).json(new ApiResponse(200, user, "User fetched"));
});

// PUT /api/auth/update-profile
export const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone } = req.body;
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { name, phone },
    { new: true, runValidators: true }
  );
  return res.status(200).json(new ApiResponse(200, user, "Profile updated"));
});

// PUT /api/auth/change-password
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select("+password");

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) throw new ApiError(400, "Current password is incorrect");

  user.password = newPassword;
  await user.save();

  return res.status(200).json(new ApiResponse(200, null, "Password changed successfully"));
});
