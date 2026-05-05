export const generateReceiptNumber = async (FeeModel, ownerId) => {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
  const startOfDay = new Date(today.setHours(0, 0, 0, 0));
  const endOfDay   = new Date(today.setHours(23, 59, 59, 999));
  const count = await FeeModel.countDocuments({
    ownerId,
    createdAt: { $gte: startOfDay, $lte: endOfDay },
    status: { $in: ["paid", "partial"] },
  });
  return `EDU-${dateStr}-${String(count + 1).padStart(4, "0")}`;
};

export const generateId = (prefix = "REF") => {
  const ts   = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${ts}-${rand}`;
};
