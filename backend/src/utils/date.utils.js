// Dates in this app are CALENDAR dates ("2026-10-21", "2026-10"). They are stored as midnight UTC, so
// the unique index on attendance (student + batch + date) and month filters line up exactly, whatever
// timezone the server (Render = UTC) or the browser is in.

export const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

const timeZone = () => process.env.BUSINESS_TIMEZONE || "Asia/Kolkata";

// "2026-10-21" — today's date at the institute (not on the server's UTC clock, which is a day behind
// for the first 5.5 hours of every Indian day).
export const businessToday = (now = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: timeZone(), year: "numeric", month: "2-digit", day: "2-digit" }).format(now);

// "2026-10"
export const businessMonth = (now = new Date()) => businessToday(now).slice(0, 7);

// The calendar date the user meant, as midnight UTC. "2026-10-21" and "2026-10-21T10:30:00" both give the
// SAME value, so marking attendance twice on one day updates the record instead of adding a second one.
// Returns null when the value is not a date.
export const toDateOnly = (value) => {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    const [y, m, d] = value.slice(0, 10).split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    return date.getUTCMonth() === m - 1 ? date : null;   // rejects 2026-02-31
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
};

// First moment and last moment (inclusive) of a "YYYY-MM" month.
export const monthRange = (month) => {
  const [y, m] = month.split("-").map(Number);
  return { start: new Date(Date.UTC(y, m - 1, 1)), end: new Date(Date.UTC(y, m, 0, 23, 59, 59, 999)) };
};
