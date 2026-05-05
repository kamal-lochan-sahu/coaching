import nodemailer from "nodemailer";

let transporter = null;

export const connectEmail = async () => {
  try {
    if (!process.env.SMTP_USER || process.env.SMTP_USER.includes("your_gmail")) {
      console.warn("⚠️  SMTP not configured — email notifications disabled");
      return;
    }
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      tls: { rejectUnauthorized: false },
    });
    await transporter.verify();
    console.log("✅ Email (SMTP) Ready");
  } catch (error) {
    console.error(`❌ Email setup failed: ${error.message}`);
    transporter = null;
  }
};

export const sendEmail = async ({ to, subject, html, text, attachments }) => {
  if (!transporter) return { success: false, reason: "not_configured" };
  try {
    const info = await transporter.sendMail({
      from: `"${process.env.INSTITUTE_NAME || "EduManage"}" <${process.env.SMTP_USER}>`,
      to, subject, html, text, attachments,
    });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`Email send failed: ${error.message}`);
    return { success: false, reason: error.message };
  }
};

export const emailTemplates = {
  feeReceipt: (studentName, amount, receiptNo, month) => `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #e5e7eb;border-radius:8px;">
      <h2 style="color:${process.env.BRAND_COLOR||"#3b82f6"};">Fee Receipt</h2>
      <p>Dear Parent, fee payment for <strong>${studentName}</strong> received.</p>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:8px;border:1px solid #e5e7eb;">Receipt No</td><td style="padding:8px;border:1px solid #e5e7eb;"><strong>${receiptNo}</strong></td></tr>
        <tr><td style="padding:8px;border:1px solid #e5e7eb;">Month</td><td style="padding:8px;border:1px solid #e5e7eb;">${month}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e5e7eb;">Amount</td><td style="padding:8px;border:1px solid #e5e7eb;"><strong>₹${amount}</strong></td></tr>
      </table>
    </div>`,

  attendanceAlert: (studentName, percentage, month) => `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #fee2e2;border-radius:8px;">
      <h2 style="color:#dc2626;">⚠️ Low Attendance Alert</h2>
      <p>Dear Parent, <strong>${studentName}</strong>'s attendance for ${month} is <strong style="color:#dc2626;">${percentage}%</strong> — below required 80%.</p>
    </div>`,
};
