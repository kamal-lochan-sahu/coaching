import { Router } from "express";
import { upload, uploadStudentPhoto, uploadStudentDocument } from "../controllers/upload.controller.js";
import { protect, allRoles } from "../middleware/auth.middleware.js";
const router = Router();
router.use(protect);
router.post("/student/:studentId/photo",    upload.single("photo"),    uploadStudentPhoto);
router.post("/student/:studentId/document", upload.single("document"), uploadStudentDocument);
export default router;
