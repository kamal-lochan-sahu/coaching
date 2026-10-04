import twilio from "twilio";

let twilioClient = null;

export const connectTwilio = () => {
  try {
    if (!process.env.TWILIO_ACCOUNT_SID || process.env.TWILIO_ACCOUNT_SID.includes("xx") || !process.env.TWILIO_AUTH_TOKEN) {
      console.warn("⚠️  Twilio not configured — WhatsApp/SMS disabled");
      return;
    }
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    console.log("✅ Twilio Ready (WhatsApp + SMS)");
    if (!process.env.TWILIO_WHATSAPP_FROM) {
      console.warn("⚠️  TWILIO_WHATSAPP_FROM not set — using the Twilio SANDBOX sender (only works for numbers that joined the sandbox)");
    }
  } catch (error) {
    console.error(`❌ Twilio setup failed: ${error.message}`);
  }
};

// Turns whatever is stored in the DB ("98765 43210", "09876543210", "+91-98765-43210",
// "919876543210", "whatsapp:+91...") into E.164 ("+919876543210"), or null if it
// isn't a usable number. A 10-digit number is assumed to belong to DEFAULT_COUNTRY_CODE (India, 91).
export const normalizePhone = (raw, defaultCountryCode = process.env.DEFAULT_COUNTRY_CODE || "91") => {
  if (raw === null || raw === undefined) return null;
  const input = String(raw).trim().replace(/^whatsapp:/i, "");
  const hasPlus = input.startsWith("+");
  let digits = input.replace(/\D/g, "");
  if (!digits) return null;

  const validIntl = (d) => d.length >= 8 && d.length <= 15;

  if (hasPlus) return validIntl(digits) ? `+${digits}` : null;

  if (digits.startsWith("00")) {            // 0091... international prefix
    digits = digits.slice(2);
    return validIntl(digits) ? `+${digits}` : null;
  }

  digits = digits.replace(/^0+/, "");       // national trunk prefix: 09876543210
  if (digits.length === 10) return `+${defaultCountryCode}${digits}`;
  if (digits.startsWith(defaultCountryCode) && digits.length === defaultCountryCode.length + 10) return `+${digits}`;
  return null;
};

export const sendWhatsApp = async (to, message) => {
  if (!twilioClient) return { success: false, reason: "not_configured" };
  const phone = normalizePhone(to);
  if (!phone) return { success: false, reason: "invalid_phone" };
  try {
    const msg = await twilioClient.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM || "whatsapp:+14155238886",
      to: `whatsapp:${phone}`,
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
  if (!process.env.TWILIO_PHONE) return { success: false, reason: "sms_sender_not_configured" };
  const phone = normalizePhone(to);
  if (!phone) return { success: false, reason: "invalid_phone" };
  try {
    const msg = await twilioClient.messages.create({
      from: process.env.TWILIO_PHONE,
      to: phone,
      body: message,
    });
    return { success: true, sid: msg.sid };
  } catch (error) {
    return { success: false, reason: error.message };
  }
};

// Sends one by one (1s apart, Twilio WhatsApp rate limits). Duplicates are sent once —
// e.g. two siblings sharing the same guardian phone shouldn't get the same notice twice.
export const sendWhatsAppBulk = async (phoneNumbers, message) => {
  const results = { sent: 0, failed: 0, errors: [] };
  const seen = new Set();
  const queue = [];

  for (const phone of phoneNumbers || []) {
    const normalized = normalizePhone(phone);
    if (!normalized) {
      results.failed++;
      results.errors.push({ phone, reason: "invalid_phone" });
      continue;
    }
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    queue.push({ phone, normalized });
  }

  for (let i = 0; i < queue.length; i++) {
    const result = await sendWhatsApp(queue[i].normalized, message);
    if (result.success) results.sent++;
    else { results.failed++; results.errors.push({ phone: queue[i].phone, reason: result.reason }); }
    if (i < queue.length - 1) await new Promise((r) => setTimeout(r, 1000));
  }
  return results;
};

export const whatsappTemplates = {
  feeReceipt: (studentName, amount, receiptNo, month, instituteName) =>
    `✅ *Fee Receipt — ${instituteName}*\n\nDear Parent,\n\nFee received for *${studentName}*\n📅 Month: ${month}\n💰 Amount: ₹${amount}\n🧾 Receipt No: ${receiptNo}\n\nThank you!`,

  feeDueReminder: (studentName, amount, dueDate, instituteName) =>
    `⏰ *Fee Reminder — ${instituteName}*\n\nDear Parent,\n\nFee of *₹${amount}* for *${studentName}* is due on *${dueDate}*. Please clear dues to avoid late fine.`,

  // threshold = the owner's configured Settings → attendance minPercentage (defaults to 80)
  attendanceAlert: (studentName, percentage, month, instituteName, threshold = 80) =>
    `⚠️ *Attendance Alert — ${instituteName}*\n\nDear Parent,\n\n*${studentName}*'s attendance for *${month}* is *${percentage}%* — below minimum ${threshold}%.`,

  resultPublished: (studentName, testName, marks, total, percentage, rank, instituteName) =>
    `📊 *Result — ${instituteName}*\n\nDear Parent,\n\n*${studentName}* in *${testName}*:\n✏️ Marks: ${marks}/${total}\n📈 ${percentage}%\n🏆 Rank: ${rank}`,

  customNotice: (title, message, instituteName) =>
    `📢 *${title} — ${instituteName}*\n\n${message}`,
};
