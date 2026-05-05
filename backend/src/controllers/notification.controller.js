import { Notification } from "../models/Management.js";
import Student from "../models/Student.js";
import { sendWhatsApp, sendWhatsAppBulk, whatsappTemplates } from "../config/twilio.js";
import { ApiError, ApiResponse, asyncHandler } from "../utils/ApiHelpers.js";

export const sendNotification = asyncHandler(async (req, res) => {
  const { type, title, message, channel, recipientType, batchId } = req.body;

  let phoneNumbers = [];

  if (recipientType === "all") {
    const students = await Student.find({ ownerId: req.ownerId, status: "active" }).select("guardianPhone phone");
    phoneNumbers = students.map(s => s.guardianPhone || s.phone).filter(Boolean);
  } else if (recipientType === "batch" && batchId) {
    const students = await Student.find({ currentBatch: batchId, status: "active" }).select("guardianPhone phone");
    phoneNumbers = students.map(s => s.guardianPhone || s.phone).filter(Boolean);
  }

  const instituteName = req.user.branding?.instituteName || "EduManage";
  const msgText = whatsappTemplates.customNotice(title, message, instituteName);

  // Fire and forget
  if (channel === "whatsapp" && phoneNumbers.length) {
    sendWhatsAppBulk(phoneNumbers, msgText).catch(console.error);
  }

  await Notification.create({
    ownerId: req.ownerId,
    type, title, message, channel, recipientType,
    status: "sent",
    sentAt: new Date(),
  });

  return res.json(new ApiResponse(200, null, `Notification queued for ${phoneNumbers.length} recipients`));
});

export const getNotificationHistory = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ ownerId: req.ownerId })
    .sort({ createdAt: -1 }).limit(50);
  return res.json(new ApiResponse(200, notifications));
});
