import { Staff, Salary } from "../models/Management.js";
import User from "../models/User.js";
import { ApiError, ApiResponse, asyncHandler } from "../utils/ApiHelpers.js";

export const getStaff = asyncHandler(async (req, res) => {
  const { branchId } = req.query;
  const filter = { ownerId: req.ownerId, isActive: true };
  if (branchId) filter.branchId = branchId;

  const staff = await Staff.find(filter).populate("userId","name email phone avatar role");
  return res.json(new ApiResponse(200, staff));
});

export const addStaff = asyncHandler(async (req, res) => {
  const { name, email, phone, password, role = "teacher", designation, subjects, salary, branchId } = req.body;

  const existing = await User.findOne({ email });
  if (existing) throw new ApiError(409, "Email already registered");

  const user = await User.create({
    name, email, phone, password,
    role,
    ownerId: req.ownerId,
  });

  const staff = await Staff.create({
    ownerId: req.ownerId, branchId,
    userId: user._id,
    designation, subjects,
    salary: salary || {},
  });

  return res.status(201).json(new ApiResponse(201, staff, "Staff member added"));
});

export const getStaffMember = asyncHandler(async (req, res) => {
  const staff = await Staff.findOne({ _id: req.params.id, ownerId: req.ownerId })
    .populate("userId","name email phone avatar");
  if (!staff) throw new ApiError(404, "Staff not found");
  return res.json(new ApiResponse(200, staff));
});

export const updateStaff = asyncHandler(async (req, res) => {
  const staff = await Staff.findOneAndUpdate(
    { _id: req.params.id, ownerId: req.ownerId },
    req.body, { new: true }
  );
  if (!staff) throw new ApiError(404, "Staff not found");
  return res.json(new ApiResponse(200, staff, "Staff updated"));
});

export const paySalary = asyncHandler(async (req, res) => {
  const { month, year, basicSalary, advance = 0, deductions = 0, bonus = 0, paymentMode, note } = req.body;
  const netSalary = basicSalary + bonus - advance - deductions;

  const salary = await Salary.findOneAndUpdate(
    { staffId: req.params.id, month, year },
    {
      ownerId: req.ownerId,
      staffId: req.params.id,
      month, year, basicSalary, advance, deductions, bonus, netSalary,
      paidDate: new Date(), paymentMode, note,
    },
    { upsert: true, new: true }
  );
  return res.status(201).json(new ApiResponse(201, salary, "Salary paid"));
});

export const getSalaryHistory = asyncHandler(async (req, res) => {
  const history = await Salary.find({ staffId: req.params.id }).sort({ year: -1, month: -1 });
  return res.json(new ApiResponse(200, history));
});
