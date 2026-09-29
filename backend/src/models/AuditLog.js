import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema({
  ownerId:     { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  userName:    { type: String, required: true },
  userRole:    { type: String },
  action:      { type: String, required: true },     // "create" | "update" | "delete" | "collect_fee" | "waive_fee" | "pay_salary" | ...
  entityType:  { type: String, required: true },      // "Student" | "Fee" | "Staff" | "Batch" | "Branch"
  entityId:    { type: mongoose.Schema.Types.ObjectId },
  description: { type: String, required: true },      // human-readable, e.g. "Collected ₹5,000 fee for Priya Sharma"
  meta:        { type: mongoose.Schema.Types.Mixed },  // optional extra structured data
}, { timestamps: true });

auditLogSchema.index({ ownerId: 1, createdAt: -1 });
auditLogSchema.index({ ownerId: 1, entityType: 1, createdAt: -1 });

export default mongoose.model("AuditLog", auditLogSchema);
