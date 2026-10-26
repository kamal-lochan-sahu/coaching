import crypto from "crypto";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Branch from "../models/Branch.js";
import Session from "../models/Session.js";
import { Settings } from "../models/Management.js";
import {
  generateTokenPair, generateAccessToken, generateRefreshToken, verifyRefreshToken,
  hashToken, getTokenExpiry,
} from "../utils/jwt.utils.js";
import { ApiError, ApiResponse, asyncHandler } from "../utils/ApiHelpers.js";
import { sendEmail, emailTemplates } from "../config/email.js";

const MAX_SESSIONS_PER_USER  = 5;                 // devices logged in at the same time (the oldest is dropped)
const ROTATE_AFTER_SECONDS   = 24 * 60 * 60;      // hand out a fresh refresh token once the current one is a day old
const MAX_OTP_ATTEMPTS       = 5;                 // wrong guesses allowed per reset code
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;         // one reset email per minute per account

// Hash of a random string, same cost as real passwords. Used when the email is unknown so a
// login attempt takes the same time whether or not the account exists.
const DUMMY_PASSWORD_HASH = "$2a$12$.uML604qyLyYDxBboiTxmudF.1pk/YiKqT18uCoQesQvXYXZttGWa";

const ownerIdOf = (user) => (user.role === "owner" ? user._id : user.ownerId);
const normalizeEmail = (email) => String(email).trim().toLowerCase();

// Remember a refresh token (hashed) as one logged-in device, keeping only the newest few.
const startSession = async (userId, refreshToken, req) => {
  await Session.create({
    userId,
    tokenHash: hashToken(refreshToken),
    expiresAt: getTokenExpiry(refreshToken),
    userAgent: String(req?.get?.("user-agent") || "").slice(0, 200),
  });
  const surplus = await Session.find({ userId }).sort({ createdAt: -1 }).skip(MAX_SESSIONS_PER_USER).select("_id").lean();
  if (surplus.length) await Session.deleteMany({ _id: { $in: surplus.map((s) => s._id) } });
};

const issueTokens = async (user, req) => {
  const { accessToken, refreshToken } = generateTokenPair(user._id, user.role, ownerIdOf(user));
  await startSession(user._id, refreshToken, req);
  return { accessToken, refreshToken };
};

// POST /api/auth/register
export const register = asyncHandler(async (req, res) => {
  const { name, phone, password } = req.body;
  const email = normalizeEmail(req.body.email);

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

  // Auto-create default settings + a first branch (students, batches and fees all need a branch,
  // so a brand-new institute could not add anything without one).
  await Settings.create({ ownerId: user._id });
  await Branch.create({ ownerId: user._id, name: "Main Branch" });

  const tokens = await issueTokens(user, req);
  await User.updateOne({ _id: user._id }, { lastLogin: new Date() });

  return res.status(201).json(
    new ApiResponse(201, { user, ...tokens }, "Registration successful")
  );
});

// POST /api/auth/login
export const login = asyncHandler(async (req, res) => {
  const { password } = req.body;
  const email = normalizeEmail(req.body.email);

  const user = await User.findOne({ email }).select("+password");

  // Always run one bcrypt comparison (the dummy hash if there is no such user): same response time
  // for "unknown email" and "wrong password", so timing cannot be used to find out which emails
  // are registered.
  const passwordOk = await bcrypt.compare(password, user?.password || DUMMY_PASSWORD_HASH);
  if (!user || !passwordOk) throw new ApiError(401, "Invalid email or password");

  // Only AFTER the password is proven right do we reveal anything about the account's state.
  if (!user.isActive) throw new ApiError(403, "Account deactivated. Contact admin.");
  if (user.role !== "owner" && !user.ownerId) throw new ApiError(403, "Account is not linked to an institute. Contact admin.");

  const tokens = await issueTokens(user, req);
  await User.updateOne({ _id: user._id }, { lastLogin: new Date() });

  return res.status(200).json(
    new ApiResponse(200, { user, ...tokens }, "Login successful")
  );
});

// POST /api/auth/logout  — body: { refreshToken }. Works even when the access token has already
// expired (that is exactly when people log out), and never fails: it just forgets that device.
export const logout = asyncHandler(async (req, res) => {
  const token = req.body?.refreshToken;
  if (typeof token === "string" && token) await Session.deleteOne({ tokenHash: hashToken(token) });
  return res.status(200).json(new ApiResponse(200, null, "Logged out successfully"));
});

// POST /api/auth/refresh-token  — body: { refreshToken }
export const refreshToken = asyncHandler(async (req, res) => {
  const token = req.body?.refreshToken;
  if (typeof token !== "string" || !token) throw new ApiError(401, "Refresh token missing");

  let decoded;
  try {
    decoded = verifyRefreshToken(token);
  } catch {
    throw new ApiError(401, "Invalid or expired refresh token");
  }

  const session = await Session.findOne({ tokenHash: hashToken(token), userId: decoded.userId });
  if (!session) throw new ApiError(401, "Session ended — please log in again");

  const user = await User.findById(decoded.userId);
  if (!user || !user.isActive || (user.role !== "owner" && !user.ownerId)) {
    await Session.deleteMany({ userId: decoded.userId });
    throw new ApiError(401, "Session ended — please log in again");
  }

  const payload = { userId: user._id, role: user.role, ownerId: ownerIdOf(user) };
  const data = { accessToken: generateAccessToken(payload) };

  // Sliding session: an active user is never logged out after 7 days. The old refresh token stays
  // valid until it expires, so two tabs refreshing at the same moment cannot lock each other out.
  if (Date.now() / 1000 - decoded.iat > ROTATE_AFTER_SECONDS) {
    data.refreshToken = generateRefreshToken(payload);
    await startSession(user._id, data.refreshToken, req);
  }

  return res.status(200).json(new ApiResponse(200, data, "Token refreshed"));
});

// GET /api/auth/me
export const getMe = asyncHandler(async (req, res) => {
  return res.status(200).json(new ApiResponse(200, req.user, "User fetched"));
});

// PUT /api/auth/update-profile
export const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (req.body.name  !== undefined) user.name  = req.body.name;
  if (req.body.phone !== undefined) user.phone = req.body.phone;
  await user.save();
  return res.status(200).json(new ApiResponse(200, user, "Profile updated"));
});

// PUT /api/auth/change-password
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select("+password");

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) throw new ApiError(400, "Current password is incorrect");
  if (await user.comparePassword(newPassword)) throw new ApiError(400, "New password must be different from the current one");

  user.password = newPassword;
  await user.save();

  // A password change signs every device out — except this one, which gets a fresh session.
  await Session.deleteMany({ userId: user._id });
  const tokens = await issueTokens(user, req);

  return res.status(200).json(new ApiResponse(200, tokens, "Password changed successfully"));
});

// Does the real work of forgot-password. Runs AFTER the response has been sent (see below).
const sendResetCode = async (email) => {
  const user = await User.findOne({ email }).select("+passwordResetExpiry");
  if (!user) return;

  // One email per minute per account (stops someone filling a victim's inbox with codes).
  const remaining = user.passwordResetExpiry ? user.passwordResetExpiry.getTime() - Date.now() : 0;
  if (remaining > 10 * 60 * 1000 - OTP_RESEND_COOLDOWN_MS) return;

  const otp = crypto.randomInt(100000, 1000000).toString();
  await User.updateOne({ _id: user._id }, {
    passwordResetToken:    await bcrypt.hash(otp, 10),
    passwordResetExpiry:   new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    passwordResetAttempts: 0,
  });

  // Staff accounts are branded with their INSTITUTE (the owner), not the default "EduManage".
  const brandSource = user.role === "owner" || !user.ownerId
    ? user
    : (await User.findById(user.ownerId).select("branding")) || user;
  const instituteName = brandSource.branding?.instituteName || "EduManage";

  const result = await sendEmail({
    to: user.email,
    subject: "Your EduManage password reset code",
    html: emailTemplates.passwordResetOtp(instituteName, brandSource.branding?.primaryColor || "#3b82f6", user.name, otp),
    fromName: instituteName,
  });
  if (!result.success) {
    console.error(`Password reset email failed for ${user.email}: ${result.reason}`);
  }
};

// POST /api/auth/forgot-password
export const forgotPassword = asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body.email);

  // Answer first, work afterwards: the response is identical AND equally fast whether or not the
  // email is registered (hashing + sending the email would otherwise give it away).
  res.status(200).json(new ApiResponse(200, null, "If an account exists for this email, a reset code has been sent."));

  try {
    await sendResetCode(email);
  } catch (err) {
    console.error(`Forgot-password processing failed: ${err.message}`);
  }
});

// POST /api/auth/reset-password
export const resetPassword = asyncHandler(async (req, res) => {
  const { otp, newPassword } = req.body;
  const email = normalizeEmail(req.body.email);

  const user = await User.findOne({ email }).select("+passwordResetToken +passwordResetExpiry");
  if (!user || !user.passwordResetToken || !user.passwordResetExpiry) {
    throw new ApiError(400, "Invalid or expired reset code");
  }

  if (user.passwordResetExpiry.getTime() < Date.now()) {
    await User.updateOne({ _id: user._id }, { $unset: { passwordResetToken: 1, passwordResetExpiry: 1, passwordResetAttempts: 1 } });
    throw new ApiError(400, "Reset code has expired. Please request a new one.");
  }

  // Every guess uses up one attempt BEFORE it is checked, and the counter is updated atomically —
  // so even 100 guesses sent at the same instant only get MAX_OTP_ATTEMPTS real tries.
  const gate = await User.updateOne(
    { _id: user._id, $or: [{ passwordResetAttempts: { $exists: false } }, { passwordResetAttempts: { $lt: MAX_OTP_ATTEMPTS } }] },
    { $inc: { passwordResetAttempts: 1 } }
  );
  if (gate.modifiedCount === 0) {
    await User.updateOne({ _id: user._id }, { $unset: { passwordResetToken: 1, passwordResetExpiry: 1, passwordResetAttempts: 1 } });
    throw new ApiError(400, "Too many incorrect attempts. Please request a new code.");
  }

  const isValidOtp = await bcrypt.compare(otp, user.passwordResetToken);
  if (!isValidOtp) throw new ApiError(400, "Invalid or expired reset code");

  user.password = newPassword;
  user.passwordResetToken    = undefined;
  user.passwordResetExpiry   = undefined;
  user.passwordResetAttempts = undefined;
  await user.save();
  await Session.deleteMany({ userId: user._id }); // force re-login everywhere

  return res.status(200).json(new ApiResponse(200, null, "Password reset successfully. Please log in."));
});
