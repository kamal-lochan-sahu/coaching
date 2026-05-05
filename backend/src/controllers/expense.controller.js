import { Expense } from "../models/Management.js";
import { ApiResponse, asyncHandler } from "../utils/ApiHelpers.js";

export const getExpenses = asyncHandler(async (req, res) => {
  const { branchId, month, category } = req.query;
  const filter = { ownerId: req.ownerId };
  if (branchId) filter.branchId = branchId;
  if (category) filter.category = category;
  if (month) {
    const [year, m] = month.split("-");
    filter.date = { $gte: new Date(year, m - 1, 1), $lte: new Date(year, m, 0) };
  }
  const expenses = await Expense.find(filter).populate("addedBy","name").sort({ date: -1 });
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  return res.json(new ApiResponse(200, { expenses, total }));
});

export const addExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.create({
    ownerId: req.ownerId,
    addedBy: req.user._id,
    ...req.body,
  });
  return res.status(201).json(new ApiResponse(201, expense, "Expense recorded"));
});

export const getExpenseReport = asyncHandler(async (req, res) => {
  const { month } = req.query;
  const [year, m] = (month || new Date().toISOString().slice(0,7)).split("-");
  const start = new Date(year, m - 1, 1);
  const end   = new Date(year, m, 0);

  const byCategory = await Expense.aggregate([
    { $match: { ownerId: req.ownerId, date: { $gte: start, $lte: end } } },
    { $group: { _id: "$category", total: { $sum: "$amount" }, count: { $sum: 1 } } },
    { $sort: { total: -1 } },
  ]);

  const grandTotal = byCategory.reduce((s, c) => s + c.total, 0);
  return res.json(new ApiResponse(200, { byCategory, grandTotal }));
});
