import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";
import { ApiError } from "../utils/ApiHelpers.js";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const UPLOAD_FOLDERS = {
  STUDENT_PHOTOS:   "edumanage/students/photos",
  STUDENT_DOCS:     "edumanage/students/documents",
  STAFF_PHOTOS:     "edumanage/staff/photos",
  FEE_RECEIPTS:     "edumanage/receipts",
  EXPENSE_RECEIPTS: "edumanage/expenses",
  LOGOS:            "edumanage/branding",
};

const isConfigured = () =>
  Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

export const uploadToCloudinary = (buffer, folder, publicId = null) => {
  return new Promise((resolve, reject) => {
    // Fail with a clear message instead of a cryptic Cloudinary SDK error.
    if (!isConfigured()) {
      return reject(new ApiError(503, "File upload is not configured on the server"));
    }
    const options = {
      folder,
      resource_type: "auto",
      ...(publicId && { public_id: publicId }),
    };
    const uploadStream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) reject(error);
      else resolve(result);
    });
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};

// resourceType must match how the file was uploaded: "image" (photos), "raw" (e.g. documents), "video".
export const deleteFromCloudinary = async (publicId, resourceType = "image") => {
  if (!publicId || !isConfigured()) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (error) {
    console.error(`Failed to delete from Cloudinary: ${error.message}`);
  }
};

export default cloudinary;
