import { uploadToCloudinary, UPLOAD_FOLDERS } from "../config/cloudinary.js";
import Student from "../models/Student.js";
import { ApiError, ApiResponse, asyncHandler } from "../utils/ApiHelpers.js";
import multer from "multer";

// Memory storage — buffer goes to Cloudinary directly
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg","image/png","image/webp","application/pdf"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new ApiError(400, "Only JPG, PNG, WEBP, PDF allowed"), false);
  },
});

export const uploadStudentPhoto = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, "No file uploaded");
  const result = await uploadToCloudinary(req.file.buffer, UPLOAD_FOLDERS.STUDENT_PHOTOS);
  await Student.findByIdAndUpdate(req.params.studentId, { photo: result.secure_url });
  return res.json(new ApiResponse(200, { url: result.secure_url }, "Photo uploaded"));
});

export const uploadStudentDocument = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, "No file uploaded");
  const { docType } = req.body;
  const result = await uploadToCloudinary(req.file.buffer, UPLOAD_FOLDERS.STUDENT_DOCS);
  await Student.findByIdAndUpdate(req.params.studentId, {
    $push: {
      documents: {
        type: docType || "other",
        name: req.file.originalname,
        url: result.secure_url,
        publicId: result.public_id,
        uploadedAt: new Date(),
      },
    },
  });
  return res.json(new ApiResponse(200, { url: result.secure_url }, "Document uploaded"));
});
