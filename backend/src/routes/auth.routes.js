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
  email:          Joi.string().email().required(),
  phone:          Joi.string().min(10).max(15).required(),
  password:       Joi.string().min(8).required(),
  instituteName:  Joi.string().max(100).optional(),
});

const loginSchema = Joi.object({
  email:    Joi.string().email().required(),
  password: Joi.string().required(),
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword:     Joi.string().min(8).required(),
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
});

const resetPasswordSchema = Joi.object({
  email:       Joi.string().email().required(),
  otp:         Joi.string().length(6).pattern(/^\d+$/).required(),
  newPassword: Joi.string().min(8).required(),
});

router.post("/register", authRateLimiter, validate(registerSchema), register);
router.post("/login",    authRateLimiter, validate(loginSchema),    login);
router.post("/logout",   protect, logout);
router.post("/refresh-token", refreshToken);
router.get ("/me",       protect, getMe);
router.put ("/update-profile",    protect, updateProfile);
router.put ("/change-password",   protect, validate(changePasswordSchema), changePassword);
router.post("/forgot-password",   authRateLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post("/reset-password",    authRateLimiter, validate(resetPasswordSchema),  resetPassword);

export default router;
