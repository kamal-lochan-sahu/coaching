import { Router } from "express";
import { getSettings, updateSettings, updateBranding } from "../controllers/settings.controller.js";
import { protect, ownerOnly } from "../middleware/auth.middleware.js";
const router = Router();
router.use(protect);
router.get("/",          ownerOnly, getSettings);
router.put("/",          ownerOnly, updateSettings);
router.put("/branding",  ownerOnly, updateBranding);
export default router;
