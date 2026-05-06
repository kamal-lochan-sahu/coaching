import { Fee } from "../models/Academic.js";
import { Expense } from "../models/Management.js";

export const getMonthlyPL = async (ownerId, month) => {
  const [year, m] = month.split("-");
  const start = new Date(year, m - 1, 1);
  const end   = new Date(year, m, 0);

  const [income, expense] = await Promise.all([
    Fee.aggregate([
      { $match: { ownerId, status: "paid", month } },
      { $group: { _id: null, total: { $sum: "$finalAmount" } } },
    ]),
    Expense.aggregate([
      { $match: { ownerId, date: { $gte: start, $lte: end } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
  ]);

  const revenue  = income[0]?.total  || 0;
  const expenses = expense[0]?.total || 0;
  return { revenue, expenses, profit: revenue - expenses, month };
};
