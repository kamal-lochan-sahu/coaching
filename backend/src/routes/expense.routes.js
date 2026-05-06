import { Router } from "express";
import { getExpenses, addExpense, getExpenseReport } from "../controllers/expense.controller.js";
import { protect, adminAndAbove, allRoles } from "../middleware/auth.middleware.js";
const router = Router();
router.use(protect);
router.get("/",       allRoles, getExpenses);
router.post("/",      adminAndAbove, addExpense);
router.get("/report", adminAndAbove, getExpenseReport);
export default router;
