// Admission numbers look like  ADM-00001, ADM-00002 ...  and are counted PER INSTITUTE.
// (They used to be ADM-<last 6 digits of the clock>-<count>: meaningless, and globally unique across
// ALL institutes.) Older numbers in that format keep working; they are simply ignored when counting.
// Uniqueness is enforced by the database: unique index on (ownerId, admissionNumber).

const PREFIX = "ADM-";
const pad = (n) => String(n).padStart(5, "0");

export const generateAdmissionNumber = async (StudentModel, ownerId) => {
  const last = await StudentModel.findOne({ ownerId, admissionNumber: { $regex: "^ADM-\\d{5}$" } })
    .sort({ admissionNumber: -1 })
    .select("admissionNumber")
    .lean();
  const lastSeq = last ? parseInt(last.admissionNumber.slice(PREFIX.length), 10) || 0 : 0;
  return `${PREFIX}${pad(lastSeq + 1)}`;
};

// True when a save failed because another request took the same admission number.
// (A student has exactly one unique index besides _id, so any duplicate-key error counts unless the
// error itself says a different field clashed.)
const isAdmissionNumberClash = (err) => {
  const msg = String(err?.message || "");
  const isDuplicate = err?.code === 11000 || /E11000|UNIQUE constraint failed/i.test(msg);
  if (!isDuplicate) return false;
  const fields = Object.keys(err?.keyPattern || err?.keyValue || {});
  return fields.length === 0 || fields.includes("admissionNumber");
};

// Picks the next number and runs saveFn(admissionNumber); if two requests race for the same number
// the unique index rejects the loser and we simply take the next one.
export const withAdmissionNumber = async (StudentModel, ownerId, saveFn, maxAttempts = 10) => {
  for (let attempt = 1; ; attempt++) {
    const admissionNumber = await generateAdmissionNumber(StudentModel, ownerId);
    try {
      return await saveFn(admissionNumber);
    } catch (err) {
      if (!isAdmissionNumberClash(err) || attempt >= maxAttempts) throw err;
      await new Promise((r) => setTimeout(r, 10 + Math.random() * 40));
    }
  }
};
