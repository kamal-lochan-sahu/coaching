import mongoose from "mongoose";

const branchSchema = new mongoose.Schema({
  ownerId:   { type: mongoose.Schema.Types.ObjectId, ref: "User",   required: true, index: true },
  name:      { type: String, required: [true, "Branch name required"], trim: true },
  address:   { type: String, trim: true },
  phone:     { type: String, trim: true },
  email:     { type: String, lowercase: true, trim: true },
  managerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  isActive:  { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model("Branch", branchSchema);
