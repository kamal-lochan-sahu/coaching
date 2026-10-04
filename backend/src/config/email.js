import nodemailer from "nodemailer";

let transporter = null;

// Pure function (easy to unit-test): builds the nodemailer options from env vars.
export const buildTransportOptions = (env = process.env) => {
  const port = Number(env.SMTP_PORT) || 587;
  return {
    host: env.SMTP_HOST,
    port,
    secure: port === 465, // 465 = implicit TLS; 587/25 = STARTTLS (nodemailer upgrades automatically)
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    // Certificate verification stays ON. Opt out only for a self-signed dev SMTP server.
    ...(env.SMTP_ALLOW_SELF_SIGNED === "true" && { tls: { rejectUnauthorized: false } }),
  };
};

export const connectEmail = async () => {
  try {
    if (!process.env.SMTP_USER || process.env.SMTP_USER.includes("your_gmail") || !process.env.SMTP_HOST) {
      console.warn("⚠️  SMTP not configured — email notifications disabled");
      return;
    }
    transporter = nodemailer.createTransport(buildTransportOptions());
    await transporter.verify();
    console.log("✅ Email (SMTP) Ready");
  } catch (error) {
    console.error(`❌ Email setup failed: ${error.message}`);
    transporter = null;
  }
};

// Strip characters that could break the From header (quotes, angle brackets, newlines).
const cleanHeaderName = (name) => String(name ?? "").replace(/["<>\r\n]/g, "").trim();

// fromName = the sending OWNER's institute name (multi-tenant). Falls back to the
// INSTITUTE_NAME env var, then "EduManage".
export const sendEmail = async ({ to, subject, html, text, attachments, fromName }) => {
  if (!transporter) return { success: false, reason: "not_configured" };
  try {
    const displayName = cleanHeaderName(fromName) || cleanHeaderName(process.env.INSTITUTE_NAME) || "EduManage";
    const info = await transporter.sendMail({
      from: `"${displayName}" <${process.env.SMTP_USER}>`,
      to, subject, html, text, attachments,
    });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`Email send failed: ${error.message}`);
    return { success: false, reason: error.message };
  }
};

// Everything interpolated into the HTML below is user-entered data (student names,
// institute names, colors) — escape it so it can't inject markup into emails.
export const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));

const DEFAULT_BRAND_COLOR = "#3b82f6";
export const safeColor = (color) => {
  const c = String(color ?? "").trim();
  return /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(c) ? c : DEFAULT_BRAND_COLOR;
};

// Shared branded layout — every email gets the same header/card/footer,
// using the SENDING OWNER's own institute name + color (never a global env var,
// since this is a multi-tenant app and every owner has their own branding).
const wrapEmail = (instituteName, brandColor, bodyHtml) => `
  <div style="font-family:-apple-system,BlinkMacSystemFont,Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:24px 16px;">
    <div style="background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e5e7eb;">
      <div style="background:${safeColor(brandColor)};padding:26px 28px;">
        <p style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">${escapeHtml(instituteName)}</p>
      </div>
      <div style="padding:28px;">
        ${bodyHtml}
      </div>
      <div style="padding:16px 28px;background:#f8fafc;border-top:1px solid #f1f5f9;">
        <p style="margin:0;color:#94a3b8;font-size:11px;line-height:1.5;">
          This is an automated email from ${escapeHtml(instituteName)}, sent via EduManage. Please do not reply directly to this email.
        </p>
      </div>
    </div>
  </div>`;

export const emailTemplates = {
  feeReceipt: (instituteName, brandColor, studentName, amount, receiptNo, month) => wrapEmail(instituteName, brandColor, `
    <h2 style="margin:0 0 14px;color:#0f172a;font-size:18px;">Fee Payment Received ✅</h2>
    <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 18px;">
      Dear Parent,<br/>We've received the fee payment for <strong>${escapeHtml(studentName)}</strong>. Details are below — the full PDF receipt is available for download anytime from your EduManage account.
    </p>
    <table style="width:100%;border-collapse:collapse;">
      <tr>
        <td style="padding:10px 0;color:#64748b;font-size:13px;border-bottom:1px solid #f1f5f9;">Receipt No.</td>
        <td style="padding:10px 0;text-align:right;font-weight:700;color:#0f172a;font-size:13px;border-bottom:1px solid #f1f5f9;">${escapeHtml(receiptNo)}</td>
      </tr>
      <tr>
        <td style="padding:10px 0;color:#64748b;font-size:13px;border-bottom:1px solid #f1f5f9;">Month</td>
        <td style="padding:10px 0;text-align:right;font-weight:700;color:#0f172a;font-size:13px;border-bottom:1px solid #f1f5f9;">${escapeHtml(month)}</td>
      </tr>
      <tr>
        <td style="padding:12px 0 0;color:#64748b;font-size:13px;">Amount Paid</td>
        <td style="padding:12px 0 0;text-align:right;font-weight:800;color:#16a34a;font-size:18px;">₹${escapeHtml(amount)}</td>
      </tr>
    </table>`),

  // threshold = the owner's configured Settings → attendance minPercentage (defaults to 80)
  attendanceAlert: (instituteName, brandColor, studentName, percentage, month, threshold = 80) => wrapEmail(instituteName, brandColor, `
    <h2 style="margin:0 0 14px;color:#dc2626;font-size:18px;">⚠️ Low Attendance Alert</h2>
    <p style="color:#475569;font-size:14px;line-height:1.6;margin:0;">
      Dear Parent,<br/><strong>${escapeHtml(studentName)}</strong>'s attendance for <strong>${escapeHtml(month)}</strong> is
      <strong style="color:#dc2626;">${escapeHtml(percentage)}%</strong> — below the required ${escapeHtml(threshold)}% threshold.
      Please ensure regular attendance going forward.
    </p>`),

  passwordResetOtp: (instituteName, brandColor, name, otp) => wrapEmail(instituteName, brandColor, `
    <h2 style="margin:0 0 12px;color:#0f172a;font-size:18px;">Password Reset Code</h2>
    <p style="color:#475569;font-size:14px;margin:0 0 4px;">Hi ${escapeHtml(name || "")},</p>
    <p style="color:#475569;font-size:14px;margin:0 0 18px;">Use the code below to reset your EduManage password. This code expires in 10 minutes.</p>
    <div style="font-size:28px;font-weight:800;letter-spacing:8px;text-align:center;padding:18px;background:#f8fafc;border-radius:10px;margin:0 0 18px;color:${safeColor(brandColor)};">
      ${escapeHtml(otp)}
    </div>
    <p style="color:#94a3b8;font-size:12px;margin:0;">If you didn't request this, you can safely ignore this email.</p>`),
};
