import mongoose from "mongoose";

const batchSchema = new mongoose.Schema({
  ownerId:     { type: mongoose.Schema.Types.ObjectId, ref: "User",   required: true },
  branchId:    { type: mongoose.Schema.Types.ObjectId, ref: "Branch", required: true },
  name:        { type: String, required: [true, "Batch name required"], trim: true },
  description: { type: String, trim: true },
  subjects:    [{ type: String, trim: true }],
  teacherId:   { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  timing: {
    days:      { type: [String], enum: ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"] },
    startTime: String,
    endTime:   String,
  },
  capacity: { type: Number, default: 30 },
  enrolled: { type: Number, default: 0 },
  feeStructure: {
    amount:    { type: Number, required: true },
    frequency: { type: String, enum: ["monthly","quarterly","yearly","one-time"], default: "monthly" },
    dueDate:   { type: Number, default: 10, min: 1, max: 28 },
  },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

batchSchema.virtual("availableSeats").get(function () {
  return this.capacity - this.enrolled;
});

batchSchema.index({ ownerId: 1, branchId: 1, isActive: 1 });
export default mongoose.model("Batch", batchSchema);
