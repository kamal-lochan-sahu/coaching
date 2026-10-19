import { Fee } from "../models/Academic.js";

// One-time data/index migrations. Every step is idempotent (safe to run on every startup),
// and a failure only logs a warning — it never stops the server from starting.

const isMissingIndexError = (e) =>
  e?.code === 27 || e?.code === 26 ||
  e?.codeName === "IndexNotFound" || e?.codeName === "NamespaceNotFound" ||
  /index not found|ns not found|no such index|does not exist/i.test(e?.message || "");

export const runMigrations = async () => {
  // v2 — receipt numbers are unique PER INSTITUTE (ownerId + receiptNumber).
  // The old index made them unique across ALL institutes, so two institutes issuing
  // their first receipt of the day collided (EDU-<date>-0001) and one of them failed.
  //
  // Order matters: build the NEW index first and only drop the OLD one if that worked.
  // If the new index could not be built, the old one stays — never leave the collection
  // with no uniqueness protection at all.
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
