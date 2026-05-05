import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";

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

export const uploadToCloudinary = (buffer, folder, publicId = null) => {
  return new Promise((resolve, reject) => {
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

export const deleteFromCloudinary = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error(`Failed to delete from Cloudinary: ${error.message}`);
  }
};

export default cloudinary;
