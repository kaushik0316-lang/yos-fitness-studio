/**
 * Yos CRM Weekly Backup
 * Exports Members, Payments, Attendance to Excel and emails it.
 * Run: node scripts/backup.cjs
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const ExcelJS  = require("exceljs");
const nodemailer = require("nodemailer");
const path     = require("path");
const fs       = require("fs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// ── CONFIG (edit these) ─────────────────────────────────────────────────────
const GMAIL_USER     = "kaushik0316@gmail.com";
const GMAIL_APP_PASS = process.env.BACKUP_GMAIL_APP_PASS || "";   // set in .env
const SEND_TO        = "kaushik0316@gmail.com";
const BACKUP_DIR     = path.join(__dirname, "../backups");
// ────────────────────────────────────────────────────────────────────────────

const today     = new Date();
const dateLabel = today.toISOString().slice(0, 10);              // 2026-08-04
const fileName  = `YosCRM_Backup_${dateLabel}.xlsx`;
const filePath  = path.join(BACKUP_DIR, fileName);

// ── Helpers ─────────────────────────────────────────────────────────────────

function ist(date) {
  if (!date) return "";
  return new Date(date).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day:   "2-digit", month: "short", year: "numeric",
    hour:  "2-digit", minute: "2-digit", hour12: true,
  });
}

function istDate(date) {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit", month: "short", year: "numeric",
  });
}

function styleHeader(row, color = "FF4A1C") {
  row.eachCell(cell => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = {
      bottom: { style: "thin", color: { argb: "FFDDDDDD" } },
    };
  });
  row.height = 22;
}

function styleRow(row, even) {
  row.eachCell(cell => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: even ? "FFF9F9F9" : "FFFFFFFF" } };
    cell.alignment = { vertical: "middle", wrapText: false };
  });
  row.height = 18;
}

function setColWidths(sheet, widths) {
  widths.forEach((w, i) => { sheet.getColumn(i + 1).width = w; });
}

// ── Sheet 1: Members ─────────────────────────────────────────────────────────

async function buildMembersSheet(wb) {
  const members = await prisma.member.findMany({
    orderBy: { fullName: "asc" },
    select: {
      memberId: true, fullName: true, phone: true, whatsapp: true,
      gender: true, email: true, status: true,
      dateOfBirth: true, joinDate: true,
      startDate: true, expiryDate: true, lastPaymentDate: true, lastAttendanceDate: true,
      currentPackage: { select: { name: true } },
      trainer: { select: { fullName: true } },
    },
  });

  const ws = wb.addWorksheet("Members");

  ws.addRow([`Yos CRM — Member List as of ${istDate(today)}`]);
  ws.mergeCells("A1:N1");
  const titleRow = ws.getRow(1);
  titleRow.font  = { bold: true, size: 13, color: { argb: "FFF97316" } };
  titleRow.height = 28;

  ws.addRow([]);

  const hdr = ws.addRow([
    "Member ID", "Full Name", "Phone", "WhatsApp", "Gender", "Email",
    "Status", "Package", "Trainer",
    "Join Date", "Start Date", "Expiry Date",
    "Last Payment", "Last Attendance",
  ]);
  styleHeader(hdr);

  setColWidths(ws, [12, 24, 14, 14, 8, 24, 10, 22, 20, 14, 14, 14, 14, 14]);

  members.forEach((m, i) => {
    const r = ws.addRow([
      m.memberId,
      m.fullName,
      m.phone,
      m.whatsapp || "",
      m.gender || "",
      m.email || "",
      m.status,
      m.currentPackage?.name || "",
      m.trainer?.fullName || "",
      istDate(m.joinDate),
      istDate(m.startDate),
      istDate(m.expiryDate),
      istDate(m.lastPaymentDate),
      istDate(m.lastAttendanceDate),
    ]);
    styleRow(r, i % 2 === 0);

    // Color-code status cell
    const statusCell = r.getCell(7);
    const statusColors = { ACTIVE: "FF22C55E", EXPIRED: "FFEF4444", INACTIVE: "FF9CA3AF", PROSPECT: "FF60A5FA" };
    statusCell.font = { bold: true, color: { argb: statusColors[m.status] || "FF374151" } };
  });

  // Summary row
  const activeCount   = members.filter(m => m.status === "ACTIVE").length;
  const expiredCount  = members.filter(m => m.status === "EXPIRED").length;
  ws.addRow([]);
  const sumRow = ws.addRow([`Total: ${members.length}  |  Active: ${activeCount}  |  Expired: ${expiredCount}`]);
  sumRow.getCell(1).font = { italic: true, color: { argb: "FF6B7280" } };
  ws.mergeCells(`A${sumRow.number}:N${sumRow.number}`);

  return members.length;
}

// ── Sheet 2: Payments ────────────────────────────────────────────────────────

async function buildPaymentsSheet(wb) {
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const payments = await prisma.payment.findMany({
    where:   { date: { gte: threeMonthsAgo } },
    orderBy: { date: "desc" },
    select: {
      receiptNumber: true, date: true,
      member: { select: { fullName: true, memberId: true } },
      package: { select: { name: true } },
      amount: true, discount: true, pendingAmount: true,
      paymentMode: true, splitPaymentMode: true, splitAmount: true,
      company: true, paymentType: true, transactionRef: true, notes: true,
      collectedBy: { select: { name: true } },
    },
  });

  const ws = wb.addWorksheet("Payments (3 months)");

  ws.addRow([`Yos CRM — Payments — Last 3 Months (as of ${istDate(today)})`]);
  ws.mergeCells("A1:P1");
  const titleRow = ws.getRow(1);
  titleRow.font  = { bold: true, size: 13, color: { argb: "FFF97316" } };
  titleRow.height = 28;
  ws.addRow([]);

  const hdr = ws.addRow([
    "Receipt #", "Date", "Member ID", "Member Name",
    "Package", "Amount (₹)", "Discount (₹)", "Net (₹)", "Pending (₹)",
    "Mode", "Split Mode", "Split Amt",
    "Type", "Transaction Ref", "Company", "Collected By", "Notes",
  ]);
  styleHeader(hdr, "FF7C3AED");

  setColWidths(ws, [10, 18, 12, 24, 22, 12, 12, 12, 12, 10, 10, 10, 12, 20, 18, 18, 24]);

  let totalNet = 0;
  payments.forEach((p, i) => {
    const net = Number(p.amount) - Number(p.discount || 0);
    totalNet += net;
    const r = ws.addRow([
      p.receiptNumber || "",
      istDate(p.date),
      p.member.memberId,
      p.member.fullName,
      p.package?.name || "",
      Number(p.amount),
      Number(p.discount || 0),
      net,
      Number(p.pendingAmount || 0),
      p.paymentMode,
      p.splitPaymentMode || "",
      p.splitAmount ? Number(p.splitAmount) : "",
      p.paymentType || "",
      p.transactionRef || "",
      p.company || "",
      p.collectedBy?.name || "",
      p.notes || "",
    ]);
    styleRow(r, i % 2 === 0);

    // Bold the net amount
    r.getCell(8).font = { bold: true };
  });

  ws.addRow([]);
  const sumRow = ws.addRow([
    "", "", "", `${payments.length} payments`, "", "", "", `₹${totalNet.toLocaleString("en-IN")}`, "", "", "", "", "", "", "", "", ""
  ]);
  sumRow.getCell(4).font = { italic: true, color: { argb: "FF6B7280" } };
  sumRow.getCell(8).font = { bold: true, color: { argb: "FF16A34A" } };

  return payments.length;
}

// ── Sheet 3: Attendance Summary ───────────────────────────────────────────────

async function buildAttendanceSheet(wb) {
  // Current month's attendance grouped by member
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd   = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

  const records = await prisma.memberAttendance.findMany({
    where:   { date: { gte: monthStart, lte: monthEnd } },
    orderBy: { checkInTime: "asc" },
    select: {
      date: true, checkInTime: true, checkOutTime: true, autoCheckedOut: true,
      member: { select: { fullName: true, memberId: true } },
    },
  });

  // Group by member
  const memberMap = new Map();
  for (const r of records) {
    const key = r.member.memberId;
    if (!memberMap.has(key)) {
      memberMap.set(key, { name: r.member.fullName, id: key, visits: 0, totalMins: 0, challengeDays: 0 });
    }
    const m = memberMap.get(key);
    m.visits++;
    if (r.checkOutTime) {
      const mins = Math.round((new Date(r.checkOutTime) - new Date(r.checkInTime)) / 60000);
      m.totalMins += mins;
      if (mins >= 50) m.challengeDays++;
    }
  }

  const rows = Array.from(memberMap.values()).sort((a, b) => b.visits - a.visits);

  const monthLabel = today.toLocaleString("en-IN", { month: "long", year: "numeric", timeZone: "Asia/Kolkata" });
  const ws = wb.addWorksheet(`Attendance — ${monthLabel}`);

  ws.addRow([`Yos CRM — Attendance Summary — ${monthLabel}`]);
  ws.mergeCells("A1:G1");
  const titleRow = ws.getRow(1);
  titleRow.font  = { bold: true, size: 13, color: { argb: "FFF97316" } };
  titleRow.height = 28;
  ws.addRow([]);

  const hdr = ws.addRow([
    "Member ID", "Member Name", "Visits", "Total Hours", "Avg Duration", "Challenge Days (≥50 min)", "Aug Challenge Progress"
  ]);
  styleHeader(hdr, "FF0284C7");
  setColWidths(ws, [12, 26, 8, 12, 14, 22, 22]);

  rows.forEach((m, i) => {
    const hrs = Math.floor(m.totalMins / 60);
    const mins = m.totalMins % 60;
    const avgMins = m.visits > 0 ? Math.round(m.totalMins / m.visits) : 0;
    const r = ws.addRow([
      m.id,
      m.name,
      m.visits,
      `${hrs}h ${mins}m`,
      `${avgMins} min`,
      m.challengeDays,
      today.getMonth() === 7 ? `${m.challengeDays}/27` : "—",
    ]);
    styleRow(r, i % 2 === 0);
    if (m.challengeDays >= 27) {
      r.getCell(7).font = { bold: true, color: { argb: "FFCA8A04" } };
    }
  });

  ws.addRow([]);
  const sumRow = ws.addRow([`${rows.length} members · ${records.length} total check-ins this month`]);
  sumRow.getCell(1).font = { italic: true, color: { argb: "FF6B7280" } };
  ws.mergeCells(`A${sumRow.number}:G${sumRow.number}`);

  return records.length;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`[${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}] Starting Yos CRM backup...`);

  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

  const wb = new ExcelJS.Workbook();
  wb.creator  = "Yos CRM";
  wb.created  = today;
  wb.modified = today;

  const [mCount, pCount, aCount] = await Promise.all([
    buildMembersSheet(wb),
    buildPaymentsSheet(wb),
    buildAttendanceSheet(wb),
  ]);

  await wb.xlsx.writeFile(filePath);
  console.log(`✓ Excel written: ${fileName} (Members: ${mCount}, Payments: ${pCount}, Attendance records: ${aCount})`);

  // ── Email ────────────────────────────────────────────────────────────────
  if (!GMAIL_APP_PASS) {
    console.warn("⚠ BACKUP_GMAIL_APP_PASS not set in .env — skipping email. File saved locally only.");
    return;
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASS },
  });

  await transporter.sendMail({
    from:    `"Yos CRM Backup" <${GMAIL_USER}>`,
    to:      SEND_TO,
    subject: `Yos CRM Weekly Backup — ${dateLabel}`,
    text:    `Hi,\n\nAttached is the weekly Yos CRM backup for ${dateLabel}.\n\nSheets included:\n- Members (${mCount} records)\n- Payments — last 3 months (${pCount} payments)\n- Attendance — this month (${aCount} check-ins)\n\nYos CRM`,
    attachments: [{ filename: fileName, path: filePath }],
  });

  console.log(`✓ Email sent to ${SEND_TO}`);
}

main()
  .catch(err => { console.error("✗ Backup failed:", err.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
