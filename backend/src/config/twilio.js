import twilio from "twilio";

let twilioClient = null;

export const connectTwilio = () => {
  try {
    if (!process.env.TWILIO_ACCOUNT_SID || process.env.TWILIO_ACCOUNT_SID.includes("xx")) {
      console.warn("⚠️  Twilio not configured — WhatsApp/SMS disabled");
      return;
    }
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    console.log("✅ Twilio Ready (WhatsApp + SMS)");
  } catch (error) {
    console.error(`❌ Twilio setup failed: ${error.message}`);
  }
};

export const sendWhatsApp = async (to, message) => {
  if (!twilioClient) return { success: false, reason: "not_configured" };
  try {
    const formattedTo = to.startsWith("whatsapp:") ? to
      : `whatsapp:${to.startsWith("+") ? to : "+91" + to}`;
    const msg = await twilioClient.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM || "whatsapp:+14155238886",
      to: formattedTo,
      body: message,
    });
    return { success: true, sid: msg.sid };
  } catch (error) {
    console.error(`WhatsApp failed to ${to}: ${error.message}`);
    return { success: false, reason: error.message };
  }
};

export const sendSMS = async (to, message) => {
  if (!twilioClient) return { success: false, reason: "not_configured" };
  try {
    const msg = await twilioClient.messages.create({
      from: process.env.TWILIO_PHONE,
      to: to.startsWith("+") ? to : "+91" + to,
      body: message,
    });
    return { success: true, sid: msg.sid };
  } catch (error) {
    return { success: false, reason: error.message };
  }
};

export const sendWhatsAppBulk = async (phoneNumbers, message) => {
  const results = { sent: 0, failed: 0, errors: [] };
  for (const phone of phoneNumbers) {
    const result = await sendWhatsApp(phone, message);
    if (result.success) results.sent++;
    else { results.failed++; results.errors.push({ phone, reason: result.reason }); }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return results;
};

export const whatsappTemplates = {
  feeReceipt: (studentName, amount, receiptNo, month, instituteName) =>
    `✅ *Fee Receipt — ${instituteName}*\n\nDear Parent,\n\nFee received for *${studentName}*\n📅 Month: ${month}\n💰 Amount: ₹${amount}\n🧾 Receipt No: ${receiptNo}\n\nThank you!`,

  feeDueReminder: (studentName, amount, dueDate, instituteName) =>
    `⏰ *Fee Reminder — ${instituteName}*\n\nDear Parent,\n\nFee of *₹${amount}* for *${studentName}* is due on *${dueDate}*. Please clear dues to avoid late fine.`,

  attendanceAlert: (studentName, percentage, month, instituteName) =>
    `⚠️ *Attendance Alert — ${instituteName}*\n\nDear Parent,\n\n*${studentName}*'s attendance for *${month}* is *${percentage}%* — below minimum 80%.`,

  resultPublished: (studentName, testName, marks, total, percentage, rank, instituteName) =>
    `📊 *Result — ${instituteName}*\n\nDear Parent,\n\n*${studentName}* in *${testName}*:\n✏️ Marks: ${marks}/${total}\n📈 ${percentage}%\n🏆 Rank: ${rank}`,

  customNotice: (title, message, instituteName) =>
    `📢 *${title} — ${instituteName}*\n\n${message}`,
};
