import { Result, Test } from "../models/Academic.js";
import { ApiResponse, asyncHandler } from "../utils/ApiHelpers.js";

export const getStudentResults = asyncHandler(async (req, res) => {
  const results = await Result.find({ studentId: req.params.studentId })
    .populate("testId","name subject date totalMarks").sort({ createdAt: -1 });
  return res.json(new ApiResponse(200, results));
});

export const getReportCard = asyncHandler(async (req, res) => {
  const results = await Result.find({ studentId: req.params.studentId })
    .populate("testId","name subject date totalMarks passingMarks").sort({ createdAt: -1 });

  const Student = (await import("../models/Student.js")).default;
  const student = await Student.findById(req.params.studentId).populate("currentBatch","name");

  const avgPercentage = results.length
    ? Math.round(results.reduce((s,r) => s + r.percentage, 0) / results.length)
    : 0;

  return res.json(new ApiResponse(200, { student, results, avgPercentage }));
});
