import { Enquiry } from "../models/Management.js";
import Student from "../models/Student.js";
import { ApiError, ApiResponse, asyncHandler } from "../utils/ApiHelpers.js";
import { invalidateDashboardCache } from "../config/redis.js";

export const getEnquiries = asyncHandler(async (req, res) => {
  const { status, branchId, page = 1, limit = 20 } = req.query;
  const filter = { ownerId: req.ownerId };
  if (status) filter.status = status;
  if (branchId) filter.branchId = branchId;

  const skip = (Number(page) - 1) * Number(limit);
  const [enquiries, total] = await Promise.all([
    Enquiry.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Enquiry.countDocuments(filter),
  ]);
  return res.json(new ApiResponse(200, { enquiries, total }));
});

export const createEnquiry = asyncHandler(async (req, res) => {
  const enquiry = await Enquiry.create({ ownerId: req.ownerId, ...req.body });
  await invalidateDashboardCache(req.ownerId);
  return res.status(201).json(new ApiResponse(201, enquiry, "Enquiry logged"));
});

export const getEnquiry = asyncHandler(async (req, res) => {
  const enquiry = await Enquiry.findOne({ _id: req.params.id, ownerId: req.ownerId });
  if (!enquiry) throw new ApiError(404, "Enquiry not found");
  return res.json(new ApiResponse(200, enquiry));
});

export const updateEnquiry = asyncHandler(async (req, res) => {
  const enquiry = await Enquiry.findOneAndUpdate(
    { _id: req.params.id, ownerId: req.ownerId },
    req.body, { new: true }
  );
  if (!enquiry) throw new ApiError(404, "Enquiry not found");
  return res.json(new ApiResponse(200, enquiry, "Enquiry updated"));
});

export const addFollowUp = asyncHandler(async (req, res) => {
  const { text, followUpDate } = req.body;
  const enquiry = await Enquiry.findOneAndUpdate(
    { _id: req.params.id, ownerId: req.ownerId },
    {
      $push: { notes: { text, addedBy: req.user._id, addedAt: new Date() } },
      $set: { followUpDate, status: "contacted" },
    },
    { new: true }
  );
  if (!enquiry) throw new ApiError(404, "Enquiry not found");
  return res.json(new ApiResponse(200, enquiry, "Follow-up added"));
});

export const convertToStudent = asyncHandler(async (req, res) => {
  const enquiry = await Enquiry.findOne({ _id: req.params.id, ownerId: req.ownerId });
  if (!enquiry) throw new ApiError(404, "Enquiry not found");

  const { branchId, batchId } = req.body;
  const count = await Student.countDocuments({ ownerId: req.ownerId });
  const student = await Student.create({
    ownerId: req.ownerId,
    branchId,
    currentBatch: batchId || null,
    name: enquiry.name,
    phone: enquiry.phone,
    email: enquiry.email,
    admissionNumber: `ADM-${Date.now().toString().slice(-6)}-${count + 1}`,
    status: "active",
  });

  enquiry.status = "converted";
  enquiry.convertedToStudentId = student._id;
  await enquiry.save();

  await invalidateDashboardCache(req.ownerId);
  return res.json(new ApiResponse(200, { enquiry, student }, "Enquiry converted to student"));
});

export const getEnquiryStats = asyncHandler(async (req, res) => {
  const stats = await Enquiry.aggregate([
    { $match: { ownerId: req.ownerId } },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);
  return res.json(new ApiResponse(200, stats));
});
