import { Test, Result } from "../models/Academic.js";
import Student from "../models/Student.js";
import { ApiError, ApiResponse, asyncHandler } from "../utils/ApiHelpers.js";

export const getTests = asyncHandler(async (req, res) => {
  const { batchId, branchId } = req.query;
  const filter = { ownerId: req.ownerId };
  if (batchId) filter.batchId = batchId;
  if (branchId) filter.branchId = branchId;

  const tests = await Test.find(filter).populate("batchId","name").sort({ date: -1 });
  return res.json(new ApiResponse(200, tests));
});

export const createTest = asyncHandler(async (req, res) => {
  const test = await Test.create({ ownerId: req.ownerId, createdBy: req.user._id, ...req.body });
  return res.status(201).json(new ApiResponse(201, test, "Test created"));
});

export const getTest = asyncHandler(async (req, res) => {
  const test = await Test.findOne({ _id: req.params.id, ownerId: req.ownerId }).populate("batchId","name");
  if (!test) throw new ApiError(404, "Test not found");
  return res.json(new ApiResponse(200, test));
});

export const updateTest = asyncHandler(async (req, res) => {
  const test = await Test.findOneAndUpdate(
    { _id: req.params.id, ownerId: req.ownerId },
    req.body, { new: true }
  );
  if (!test) throw new ApiError(404, "Test not found");
  return res.json(new ApiResponse(200, test, "Test updated"));
});

export const enterResults = asyncHandler(async (req, res) => {
  const { results } = req.body;
  // results = [{ studentId, marksObtained }]
  const test = await Test.findById(req.params.id);
  if (!test) throw new ApiError(404, "Test not found");

  // Calculate ranks
  const sorted = [...results].sort((a, b) => b.marksObtained - a.marksObtained);

  const getGrade = (pct) => {
    if (pct >= 90) return "A+";
    if (pct >= 80) return "A";
    if (pct >= 70) return "B+";
    if (pct >= 60) return "B";
    if (pct >= 50) return "C";
    if (pct >= 40) return "D";
    return "F";
  };

  const ops = sorted.map((r, idx) => {
    const pct = Math.round((r.marksObtained / test.totalMarks) * 100);
    return {
      updateOne: {
        filter: { testId: test._id, studentId: r.studentId },
        update: {
          $set: {
            testId: test._id, studentId: r.studentId,
            batchId: test.batchId, ownerId: req.ownerId,
            marksObtained: r.marksObtained,
            percentage: pct,
            grade: getGrade(pct),
            rank: idx + 1,
            isPassed: r.marksObtained >= test.passingMarks,
            remarks: r.remarks || "",
          },
        },
        upsert: true,
      },
    };
  });

  await Result.bulkWrite(ops);
  return res.json(new ApiResponse(200, null, `Results saved for ${results.length} students`));
});

export const getTestResults = asyncHandler(async (req, res) => {
  const results = await Result.find({ testId: req.params.id })
    .populate("studentId","name photo").sort({ rank: 1 });
  const test = await Test.findById(req.params.id);
  const avg = results.length ? Math.round(results.reduce((s,r) => s + r.percentage, 0) / results.length) : 0;
  return res.json(new ApiResponse(200, { test, results, classAverage: avg }));
});
