import PDFDocument from "pdfkit";

export const generateFeeReceiptPDF = (fee, student, batch, instituteName, brandColor = "#3b82f6") => {
  return new Promise((resolve) => {
    const doc  = new PDFDocument({ size: "A5", margin: 40 });
    const chunks = [];
    doc.on("data", c => chunks.push(c));
    doc.on("end",  () => resolve(Buffer.concat(chunks)));

    const color = brandColor;

    // Header
    doc.rect(0, 0, doc.page.width, 80).fill(color);
    doc.fillColor("white").fontSize(20).font("Helvetica-Bold")
       .text(instituteName, 40, 25);
    doc.fontSize(10).font("Helvetica").text("Fee Receipt", 40, 52);

    // Receipt details
    doc.fillColor("#111").fontSize(12).font("Helvetica-Bold")
       .text(`Receipt No: ${fee.receiptNumber}`, 40, 105);
    doc.fontSize(10).font("Helvetica").fillColor("#555")
       .text(`Date: ${new Date(fee.paidDate).toLocaleDateString("en-IN")}`, 40, 125);

    // Student info box
    doc.rect(40, 145, doc.page.width - 80, 60).stroke(color);
    doc.fillColor("#111").fontSize(11).font("Helvetica-Bold")
       .text("Student Details", 50, 153);
    doc.fontSize(10).font("Helvetica")
       .text(`Name: ${student.name}`, 50, 170)
       .text(`Batch: ${batch?.name || "—"}`, 50, 185);

    // Fee table
    const tableY = 225;
    doc.rect(40, tableY, doc.page.width - 80, 28).fill(color);
    doc.fillColor("white").fontSize(10).font("Helvetica-Bold")
       .text("Description", 50, tableY + 8)
       .text("Amount", doc.page.width - 120, tableY + 8);

    const rows = [
      ["Fee Amount",  `₹${fee.amount}`],
      ["Discount",    `-₹${fee.discount || 0}`],
      ["Month",       fee.month],
      ["Payment Mode",fee.paymentMode?.toUpperCase() || "—"],
    ];

    let y = tableY + 36;
    doc.fillColor("#111").font("Helvetica");
    for (const [label, value] of rows) {
      doc.fontSize(10).text(label, 50, y).text(value, doc.page.width - 120, y);
      doc.moveTo(40, y + 16).lineTo(doc.page.width - 40, y + 16).stroke("#e5e7eb");
      y += 22;
    }

    // Total
    doc.rect(40, y, doc.page.width - 80, 30).fill("#f0fdf4");
    doc.fillColor("#16a34a").fontSize(13).font("Helvetica-Bold")
       .text("Total Paid", 50, y + 8)
       .text(`₹${fee.finalAmount}`, doc.page.width - 120, y + 8);

    // Footer
    doc.fillColor("#9ca3af").fontSize(9).font("Helvetica")
       .text("Thank you for your payment!", 40, y + 50, { align: "center" });

    doc.end();
  });
};

export const generateReportCardPDF = (student, results, tests, instituteName, brandColor = "#3b82f6") => {
  return new Promise((resolve) => {
    const doc    = new PDFDocument({ margin: 40 });
    const chunks = [];
    doc.on("data", c => chunks.push(c));
    doc.on("end",  () => resolve(Buffer.concat(chunks)));

    // Header
    doc.rect(0, 0, doc.page.width, 90).fill(brandColor);
    doc.fillColor("white").fontSize(22).font("Helvetica-Bold")
       .text(instituteName, 40, 25);
    doc.fontSize(13).font("Helvetica").text("Academic Report Card", 40, 55);

    // Student info
    doc.fillColor("#111").fontSize(13).font("Helvetica-Bold")
       .text(student.name, 40, 115);
    doc.fontSize(10).font("Helvetica").fillColor("#555")
       .text(`Batch: ${student.currentBatch?.name || "—"}  |  Admission No: ${student.admissionNumber || "—"}`, 40, 133);

    // Results table header
    const tY = 165;
    doc.rect(40, tY, doc.page.width - 80, 25).fill(brandColor);
    doc.fillColor("white").fontSize(10).font("Helvetica-Bold")
       .text("Subject / Test", 50, tY + 7)
       .text("Marks", 280, tY + 7)
       .text("%", 360, tY + 7)
       .text("Grade", 420, tY + 7)
       .text("Rank", 490, tY + 7);

    let ry = tY + 33;
    doc.fillColor("#111").font("Helvetica");
    for (const r of results) {
      const t = r.testId;
      doc.fontSize(9)
         .text(`${t?.subject || "—"} — ${t?.name || "—"}`, 50, ry, { width: 220 })
         .text(`${r.marksObtained}/${t?.totalMarks}`, 280, ry)
         .text(`${r.percentage}%`, 360, ry)
         .text(r.grade, 420, ry)
         .text(`#${r.rank}`, 490, ry);
      doc.moveTo(40, ry + 14).lineTo(doc.page.width - 40, ry + 14).stroke("#e5e7eb");
      ry += 20;
    }

    // Average
    const avg = results.length
      ? Math.round(results.reduce((s, r) => s + r.percentage, 0) / results.length)
      : 0;
    doc.rect(40, ry + 5, doc.page.width - 80, 28).fill("#f0fdf4");
    doc.fillColor("#16a34a").fontSize(11).font("Helvetica-Bold")
       .text(`Overall Average: ${avg}%`, 50, ry + 13);

    doc.end();
  });
};

export const generateMonthlyReportPDF = (data, instituteName, brandColor = "#3b82f6") => {
  return new Promise((resolve) => {
    const doc    = new PDFDocument({ margin: 40 });
    const chunks = [];
    doc.on("data", c => chunks.push(c));
    doc.on("end",  () => resolve(Buffer.concat(chunks)));

    const w = doc.page.width;
    const monthLabel = new Date(`${data.month}-01`).toLocaleDateString("en-IN", { month: "long", year: "numeric" });

    // Header
    doc.rect(0, 0, w, 90).fill(brandColor);
    doc.fillColor("white").fontSize(22).font("Helvetica-Bold").text(instituteName, 40, 25);
    doc.fontSize(13).font("Helvetica").text(`Monthly Business Report — ${monthLabel}`, 40, 55);

    let y = 115;

    const sectionTitle = (title) => {
      doc.fillColor("#111").fontSize(13).font("Helvetica-Bold").text(title, 40, y);
      y += 20;
    };
    const row = (label, value, valueColor = "#111") => {
      doc.fontSize(10).font("Helvetica").fillColor("#555").text(label, 50, y);
      doc.fontSize(10).font("Helvetica-Bold").fillColor(valueColor).text(value, w - 200, y, { width: 150, align: "right" });
      doc.moveTo(40, y + 15).lineTo(w - 40, y + 15).stroke("#e5e7eb");
      y += 20;
    };

    // Overview
    sectionTitle("Overview");
    row("Total Students", data.students.total);
    row("Active Students", data.students.active);
    row("New Admissions This Month", data.students.newThisMonth);
    row("Active Batches", data.batches.total);
    y += 8;

    // Finance
    sectionTitle("Finance");
    row("Fee Collected This Month", `Rs. ${data.fees.collected.toLocaleString("en-IN")}`, "#16a34a");
    row("Total Pending Fees", `Rs. ${data.fees.pending.toLocaleString("en-IN")}`, "#d97706");
    row("Total Expenses This Month", `Rs. ${data.expenses.total.toLocaleString("en-IN")}`, "#dc2626");
    row("Net Profit", `Rs. ${data.netProfit.toLocaleString("en-IN")}`, data.netProfit >= 0 ? "#16a34a" : "#dc2626");
    y += 8;

    // Payment mode breakdown
    if (Object.keys(data.fees.byPaymentMode).length) {
      sectionTitle("Fee Collection by Payment Mode");
      for (const [mode, amt] of Object.entries(data.fees.byPaymentMode)) {
        row(mode.toUpperCase(), `Rs. ${amt.toLocaleString("en-IN")}`);
      }
      y += 8;
    }

    // Expense breakdown
    if (Object.keys(data.expenses.byCategory).length) {
      sectionTitle("Expenses by Category");
      for (const [cat, amt] of Object.entries(data.expenses.byCategory)) {
        row(cat.charAt(0).toUpperCase() + cat.slice(1), `Rs. ${amt.toLocaleString("en-IN")}`);
      }
      y += 8;
    }

    // Attendance & Enquiries
    sectionTitle("Attendance & Enquiries");
    row("Average Attendance", `${data.attendance.percentage}%`);
    row("New Enquiries This Month", data.enquiries.newThisMonth);
    row("Converted to Admissions", data.enquiries.converted);
    row("Conversion Rate", `${data.enquiries.conversionRate}%`);

    // Footer
    doc.fillColor("#9ca3af").fontSize(8).font("Helvetica")
       .text(`Generated on ${new Date().toLocaleDateString("en-IN")} · EduManage`, 40, doc.page.height - 50, { align: "center", width: w - 80 });

    doc.end();
  });
};
