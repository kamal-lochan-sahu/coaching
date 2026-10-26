import { Router } from "express";
import {
  register, login, logout,
  refreshToken, getMe,
  updateProfile, changePassword,
  forgotPassword, resetPassword,
} from "../controllers/auth.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { authRateLimiter } from "../middleware/error.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import Joi from "joi";

const router = Router();

const registerSchema = Joi.object({
  name:           Joi.string().min(2).max(100).required(),
  email:          Joi.string().trim().email().required(),
  phone:          Joi.string().min(10).max(15).required(),
  password:       Joi.string().min(8).max(72).required(),   // bcrypt only uses the first 72 bytes
  instituteName:  Joi.string().max(100).optional(),
});

const loginSchema = Joi.object({
  email:    Joi.string().trim().email().required(),
  password: Joi.string().max(256).required(),   // upper bound only, so a giant body cannot be used to burn CPU
});

// The refresh token travels in the JSON body (cookies do not work between the Vercel and Render domains).
const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().max(4096).required(),
});

const logoutSchema = Joi.object({
  refreshToken: Joi.string().max(4096),
});

const updateProfileSchema = Joi.object({
  name:  Joi.string().trim().min(2).max(100),
  phone: Joi.string().trim().min(10).max(15),
}).or("name", "phone");

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().max(256).required(),
  newPassword:     Joi.string().min(8).max(72).required(),
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().trim().email().required(),
});

const resetPasswordSchema = Joi.object({
  email:       Joi.string().trim().email().required(),
  otp:         Joi.string().length(6).pattern(/^\d+$/).required(),
  newPassword: Joi.string().min(8).max(72).required(),
});

router.post("/register", authRateLimiter, validate(registerSchema), register);
router.post("/login",    authRateLimiter, validate(loginSchema),    login);
// logout/refresh authenticate with the refresh token itself (not the access token, which may have expired)
router.post("/logout",   validate(logoutSchema), logout);
router.post("/refresh-token", validate(refreshTokenSchema), refreshToken);
router.get ("/me",       protect, getMe);
router.put ("/update-profile",    protect, validate(updateProfileSchema), updateProfile);
router.put ("/change-password",   protect, validate(changePasswordSchema), changePassword);
router.post("/forgot-password",   authRateLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post("/reset-password",    authRateLimiter, validate(resetPasswordSchema),  resetPassword);

export default router;
