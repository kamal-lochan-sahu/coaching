// Excel/Sheets run any cell that starts with = + - @ (or tab / carriage return) as a FORMULA.
// Student names, notes etc. are typed by users, so a cell like  =HYPERLINK("http://evil",...)
// would execute when the exported file is opened. Prefixing a single quote makes it plain text.
const FORMULA_START = /^[=+\-@\t\r]/;
// Plain numbers / phone numbers ("+91 98765-43210", "-500") can't run anything — leave them as they are.
const NUMBER_LIKE = /^[+-]?[\d\s().,-]*$/;

/**
 * Convert an array of plain objects into a CSV string.
 * columns = [{ key: "name", label: "Name" }, ...] — controls order + header labels.
 */
export function toCSV(rows, columns) {
  const escape = (val) => {
    if (val === null || val === undefined) return "";
    let str = String(val);
    if (typeof val === "string" && FORMULA_START.test(str) && !NUMBER_LIKE.test(str)) str = `'${str}`;
    // Quote any field containing a comma, quote, or line break; double up internal quotes.
    if (/[",\r\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
    return str;
  };

  const header = columns.map(c => escape(c.label)).join(",");
  const lines = rows.map(row =>
    columns.map(c => escape(typeof c.get === "function" ? c.get(row) : row[c.key])).join(",")
  );
  return [header, ...lines].join("\r\n");
}

export function sendCSV(res, filename, rows, columns) {
  const csv = toCSV(rows, columns);
  const safeName = String(filename).replace(/[^\w.\-]/g, "_"); // no quotes / newlines in the header
  res.set({
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="${safeName}"`,
  });
  // Prepend BOM so Excel opens UTF-8 (₹, names with accents, etc.) correctly.
  return res.send("\uFEFF" + csv);
}
