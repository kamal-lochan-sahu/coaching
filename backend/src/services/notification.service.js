import { sendWhatsApp, whatsappTemplates } from "../config/twilio.js";
import { sendEmail, emailTemplates } from "../config/email.js";
import { Notification } from "../models/Management.js";

export const notifyFeeCollected = async (student, fee, instituteName) => {
  const msg = whatsappTemplates.feeReceipt(
    student.name, fee.finalAmount, fee.receiptNumber, fee.month, instituteName
  );
  const phone = student.guardianPhone || student.phone;
  if (phone) await sendWhatsApp(phone, msg);

  await Notification.create({
    ownerId: fee.ownerId,
    type: "fee_reminder", title: "Fee Receipt",
    message: msg, channel: "whatsapp",
    recipientId: student._id,
    status: "sent", sentAt: new Date(),
  });
};

export const notifyLowAttendance = async (student, percentage, month, instituteName) => {
  const msg = whatsappTemplates.attendanceAlert(student.name, percentage, month, instituteName);
  const phone = student.guardianPhone || student.phone;
  if (phone) await sendWhatsApp(phone, msg);
};

export const notifyResultPublished = async (student, result, test, instituteName) => {
  const msg = whatsappTemplates.resultPublished(
    student.name, test.name, result.marksObtained,
    test.totalMarks, result.percentage, result.rank, instituteName
  );
  const phone = student.guardianPhone || student.phone;
  if (phone) await sendWhatsApp(phone, msg);
};
