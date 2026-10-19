// Receipt numbers look like  EDU-20261007-0001  (EDU-<date>-<sequence for that day>).
// The sequence restarts every day and is counted PER INSTITUTE (ownerId). Uniqueness is
// enforced by the database: a unique index on (ownerId, receiptNumber) on the Fee model.

const pad = (n) => String(n).padStart(4, "0");

// "20261007" for the institute's local date (not the server's UTC date — Render runs in UTC,
// which would stamp receipts issued between 12:00am and 5:30am IST with yesterday's date).
export const receiptDateString = (now = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {            // en-CA formats as YYYY-MM-DD
    timeZone: process.env.BUSINESS_TIMEZONE || "Asia/Kolkata",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now).replace(/-/g, "");

// Next free number = (highest number already issued today by this institute) + 1.
// This is correct no matter how the earlier receipts were created — including pending
// fees (created on an earlier day) that were marked paid today.
export const generateReceiptNumber = async (FeeModel, ownerId, now = new Date()) => {
  const prefix = `EDU-${receiptDateString(now)}-`;
  const last = await FeeModel.findOne({ ownerId, receiptNumber: { $regex: `^${prefix}` } })
    .sort({ receiptNumber: -1 })
    .select("receiptNumber")
    .lean();
  const lastSeq = last ? parseInt(last.receiptNumber.slice(prefix.length), 10) || 0 : 0;
  return `${prefix}${pad(lastSeq + 1)}`;
};

// True when a save failed because another request grabbed the same receipt number.
// A Fee has exactly one unique index besides _id (ownerId + receiptNumber), so any
// duplicate-key error counts — unless the error itself says a DIFFERENT field clashed.
// (MongoDB reports keyPattern/keyValue; some Mongo-compatible servers report less.)
const isReceiptNumberClash = (err) => {
  const msg = String(err?.message || "");
  const isDuplicate = err?.code === 11000 || /E11000|UNIQUE constraint failed/i.test(msg);
  if (!isDuplicate) return false;
  const fields = Object.keys(err?.keyPattern || err?.keyValue || {});
  return fields.length === 0 || fields.includes("receiptNumber");
};

// Generates a receipt number, then runs saveFn(receiptNumber). If two requests race for the
// same number, the unique index rejects the loser — we just pick the next number and retry.
// saveFn must re-read anything it modifies (it can run more than once).
export const withReceiptNumber = async (FeeModel, ownerId, saveFn, maxAttempts = 10) => {
  for (let attempt = 1; ; attempt++) {
    const receiptNumber = await generateReceiptNumber(FeeModel, ownerId);
    try {
      return await saveFn(receiptNumber);
    } catch (err) {
      if (!isReceiptNumberClash(err) || attempt >= maxAttempts) throw err;
      await new Promise((r) => setTimeout(r, 10 + Math.random() * 40)); // small jitter so racers spread out
    }
  }
};
