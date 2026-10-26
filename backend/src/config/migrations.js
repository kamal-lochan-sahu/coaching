import { Fee } from "../models/Academic.js";
import Student from "../models/Student.js";
import User from "../models/User.js";
import Batch from "../models/Batch.js";

// One-time data/index migrations. Every step is idempotent (safe to run on every startup),
// and a failure only logs a warning — it never stops the server from starting.

const isMissingIndexError = (e) =>
  e?.code === 27 || e?.code === 26 ||
  e?.codeName === "IndexNotFound" || e?.codeName === "NamespaceNotFound" ||
  /index not found|ns not found|no such index|does not exist/i.test(e?.message || "");

// v2 — receipt numbers are unique PER INSTITUTE (ownerId + receiptNumber).
// The old index made them unique across ALL institutes, so two institutes issuing
// their first receipt of the day collided (EDU-<date>-0001) and one of them failed.
//
// Order matters: build the NEW index first and only drop the OLD one if that worked.
// If the new index could not be built, the old one stays — never leave the collection
// with no uniqueness protection at all.
const migrateReceiptIndex = async () => {
  try {
    await Fee.createIndexes();
  } catch (e) {
    console.warn(`⚠️  Migration: could not build the (ownerId, receiptNumber) index — keeping the legacy one. ${e.message}`);
    return;
  }
  try {
    await Fee.collection.dropIndex("receiptNumber_1");
    console.log("🧹 Migration: dropped legacy global receiptNumber index");
  } catch (e) {
    if (!isMissingIndexError(e)) console.warn(`⚠️  Migration (drop legacy receipt index): ${e.message}`);
  }
};

// v3 — the Student text index (name + phone) was never queried (student search uses $regex),
// it only cost storage and slowed every student write. Found by its text-index marker rather
// than by guessing the generated index name. Pure + exported so it can be unit-tested.
export const findLegacyStudentTextIndex = (indexes = []) =>
  indexes.find((i) => i?.key?._fts === "text" && i?.weights && "name" in i.weights && "phone" in i.weights)?.name;

const dropUnusedStudentTextIndex = async () => {
  try {
    const name = findLegacyStudentTextIndex(await Student.collection.indexes());
    if (!name) return;
    await Student.collection.dropIndex(name);
    console.log(`🧹 Migration: dropped unused student text index (${name})`);
  } catch (e) {
    if (!isMissingIndexError(e)) console.warn(`⚠️  Migration (drop unused student text index): ${e.message}`);
  }
};

// v4 — refresh tokens used to be stored in PLAIN TEXT on the user document (field `refreshToken`).
// Sessions now live in their own collection as hashes; wipe the old plaintext values.
const removeLegacyRefreshTokens = async () => {
  try {
    const r = await User.collection.updateMany({ refreshToken: { $exists: true } }, { $unset: { refreshToken: "" } });
    if (r.modifiedCount) console.log(`🧹 Migration: removed ${r.modifiedCount} plaintext refresh token(s) from users`);
  } catch (e) {
    console.warn(`⚠️  Migration (remove legacy refresh tokens): ${e.message}`);
  }
};

// v5 — admission numbers are unique PER INSTITUTE (ownerId + admissionNumber) instead of across all
// institutes. Same safe order as the receipt index: build the new one first, drop the old one after.
const migrateAdmissionIndex = async () => {
  try {
    await Student.createIndexes();
  } catch (e) {
    console.warn(`⚠️  Migration: could not build the (ownerId, admissionNumber) index — keeping the legacy one. ${e.message}`);
    return;
  }
  try {
    await Student.collection.dropIndex("admissionNumber_1");
    console.log("🧹 Migration: dropped legacy global admissionNumber index");
  } catch (e) {
    if (!isMissingIndexError(e)) console.warn(`⚠️  Migration (drop legacy admission index): ${e.message}`);
  }
};

// v6 — Batch.enrolled used to drift (never decreased when a student was deleted / passed / dropped).
// Recount it from the real students once at startup; afterwards every student change recounts it.
const recountBatchEnrollment = async () => {
  try {
    const batches = await Batch.collection.find({}, { projection: { _id: 1, ownerId: 1, enrolled: 1 } }).toArray();
    let fixed = 0;
    for (const b of batches) {
      const real = await Student.countDocuments({ ownerId: b.ownerId, currentBatch: b._id, status: "active" });
      if (real !== b.enrolled) {
        await Batch.collection.updateOne({ _id: b._id }, { $set: { enrolled: real } });
        fixed++;
      }
    }
    if (fixed) console.log(`🧹 Migration: corrected the student count on ${fixed} batch(es)`);
  } catch (e) {
    console.warn(`⚠️  Migration (recount batch enrollment): ${e.message}`);
  }
};

export const runMigrations = async () => {
  await migrateReceiptIndex();
  await dropUnusedStudentTextIndex();
  await removeLegacyRefreshTokens();
  await migrateAdmissionIndex();
  await recountBatchEnrollment();
};
