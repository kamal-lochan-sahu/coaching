import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({
  name:     { type: String, required: [true, "Name is required"],  trim: true, maxlength: 100 },
  email:    { type: String, required: [true, "Email is required"], unique: true, lowercase: true, trim: true },
  phone:    { type: String, required: [true, "Phone is required"], trim: true },
  password: { type: String, required: [true, "Password is required"], minlength: 8, select: false },
  avatar:   { type: String, default: null },
  role: {
    type: String,
    enum: ["owner", "admin", "teacher", "receptionist"],
    default: "owner",
  },
  branding: {
    instituteName: { type: String, default: "EduManage" },
    logo:          { type: String, default: null },
    primaryColor:  { type: String, default: "#3b82f6" },
    domain:        { type: String, default: null },
  },
  ownerId:              { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  isActive:             { type: Boolean, default: true },
  refreshToken:         { type: String, select: false },
  lastLogin:            { type: Date, default: null },
  passwordResetToken:   { type: String, select: false },
  passwordResetExpiry:  { type: Date, select: false },
}, { timestamps: true });

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshToken;
  delete obj.passwordResetToken;
  delete obj.passwordResetExpiry;
  return obj;
};

userSchema.index({ ownerId: 1, role: 1 });
export default mongoose.model("User", userSchema);
