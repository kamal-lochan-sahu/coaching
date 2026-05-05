import { Timetable } from "../models/Academic.js";
import { ApiError, ApiResponse, asyncHandler } from "../utils/ApiHelpers.js";

export const getBatchTimetable = asyncHandler(async (req, res) => {
  const timetable = await Timetable.findOne({ batchId: req.params.batchId, isActive: true })
    .populate("schedule.slots.teacherId","name");
  return res.json(new ApiResponse(200, timetable));
});

export const createTimetable = asyncHandler(async (req, res) => {
  const { batchId } = req.body;
  // Deactivate old timetable
  await Timetable.updateMany({ batchId, isActive: true }, { isActive: false });
  const timetable = await Timetable.create({ ownerId: req.ownerId, ...req.body });
  return res.status(201).json(new ApiResponse(201, timetable, "Timetable created"));
});

export const updateTimetable = asyncHandler(async (req, res) => {
  const timetable = await Timetable.findOneAndUpdate(
    { _id: req.params.id, ownerId: req.ownerId },
    req.body, { new: true }
  );
  if (!timetable) throw new ApiError(404, "Timetable not found");
  return res.json(new ApiResponse(200, timetable, "Timetable updated"));
});
