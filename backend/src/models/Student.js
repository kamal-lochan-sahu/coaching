import mongoose from "mongoose";

const studentSchema = new mongoose.Schema({
  ownerId:  { type: mongoose.Schema.Types.ObjectId, ref: "User",   required: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", required: true },

  // Basic Info
  name:        { type: String, required: [true, "Student name required"], trim: true },
  phone:       { type: String, trim: true },
  email:       { type: String, lowercase: true, trim: true },
  photo:       { type: String, default: null },
  dateOfBirth: { type: Date },
  gender:      { type: String, enum: ["male", "female", "other"] },
  address:     { type: String, trim: true },

  // Guardian
  guardianName:     { type: String, trim: true },
  guardianPhone:    { type: String, trim: true },
  guardianRelation: { type: String, enum: ["father", "mother", "guardian", "other"], default: "father" },

  // Academic
  currentBatch:     { type: mongoose.Schema.Types.ObjectId, ref: "Batch", default: null },
  previousBatches:  [{ type: mongoose.Schema.Types.ObjectId, ref: "Batch" }],
  admissionDate:    { type: Date, default: Date.now },
  admissionNumber:  { type: String, unique: true, sparse: true },
  status:           { type: String, enum: ["active", "inactive", "passed", "dropped"], default: "active" },

  // Documents
  documents: [{
    type:       { type: String, enum: ["photo", "id_proof", "address_proof", "admission_form", "other"] },
    name:       String,
    url:        String,
    publicId:   String,
    uploadedAt: { type: Date, default: Date.now },
  }],

  notes: String,
}, { timestamps: true });

studentSchema.index({ ownerId: 1, branchId: 1, status: 1 });
studentSchema.index({ ownerId: 1, name: "text", phone: "text" });
studentSchema.index({ currentBatch: 1 });
export default mongoose.model("Student", studentSchema);
