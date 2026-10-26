import Student from "../models/Student.js";
import Batch from "../models/Batch.js";

// Batch.enrolled = how many ACTIVE students are in the batch right now.
//
// It used to be kept with +1 / -1 on a few actions only (create, transfer), so it drifted as soon
// as a student was deleted, marked passed/dropped, or edited. Recounting is always correct, cannot
// go negative, and heals old drift the first time a batch is touched.
export const syncBatchEnrolled = async (ownerId, ...batchIds) => {
  const ids = [...new Set(batchIds.filter(Boolean).map(String))];
  for (const id of ids) {
    const enrolled = await Student.countDocuments({ ownerId, currentBatch: id, status: "active" });
    await Batch.updateOne({ _id: id, ownerId }, { enrolled });
  }
};
