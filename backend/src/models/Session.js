import mongoose from "mongoose";

// One document per logged-in device. Only a SHA-256 hash of the refresh token is stored, so a
// database leak does not hand out working sessions. MongoDB deletes expired rows by itself (TTL).
const sessionSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  tokenHash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
  userAgent: { type: String, maxlength: 200 },
}, { timestamps: { createdAt: true, updatedAt: false } });

sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("Session", sessionSchema);
