/**
 * Convert an array of plain objects into a CSV string.
 * columns = [{ key: "name", label: "Name" }, ...] — controls order + header labels.
 */
export function toCSV(rows, columns) {
  const escape = (val) => {
    if (val === null || val === undefined) return "";
    const str = String(val);
    // Quote any field containing a comma, quote, or newline; double up internal quotes.
    if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
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
  res.set({
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="${filename}"`,
  });
  // Prepend BOM so Excel opens UTF-8 (₹, names with accents, etc.) correctly.
  return res.send("\uFEFF" + csv);
}
