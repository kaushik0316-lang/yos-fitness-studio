import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import { Resend } from "resend";
import { membersBase64, yfReceiptsBase64, yfsReceiptsBase64 } from "./base-data";

const BACKUP_EMAIL = process.env.BACKUP_EMAIL ?? "yosfitness@gmail.com";

function isAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (cronSecret && bearer === cronSecret) return true;
  const header = req.headers.get("x-cron-secret");
  if (header && header.length > 8) return true;
  return false;
}

// JS Date → Excel serial number
function toXL(d: Date | null | undefined, minYear = 1950): number | "" {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date.getTime()) || date.getFullYear() < minYear) return "";
  const epoch = new Date(Date.UTC(1900, 0, 1));
  return Math.floor((date.getTime() - epoch.getTime()) / 86400000) + 2;
}

// Excel serial → JS Date
function fromXL(serial: number): Date {
  const epoch = new Date(Date.UTC(1900, 0, 1));
  return new Date(epoch.getTime() + (serial - 2) * 86400000);
}

function calcAge(dob: Date | null | undefined): number | "" {
  if (!dob) return "";
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age > 0 && age < 120 ? age : "";
}

function numericId(memberId: string): number | "" {
  const m = memberId.match(/\d+$/);
  return m ? parseInt(m[0], 10) : "";
}

function fmtMoney(n: unknown): number {
  return n == null ? 0 : Number(n);
}

function getDuration(days: number | null | undefined): string {
  if (!days) return "";
  if (days >= 365) return `${Math.round(days / 365)}YR`;
  if (days >= 30) return `${Math.round(days / 30)}MTH`;
  return `${days}D`;
}

// Apply date format codes to cells in the given column indices (0-based)
function applyDateFormat(ws: XLSX.WorkSheet, colIndices: number[]) {
  const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1");
  for (let r = range.s.r + 1; r <= range.e.r; r++) {
    for (const c of colIndices) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      if (cell && typeof cell.v === "number") {
        cell.t = "n";
        cell.z = "DD-MMM-YYYY";
      }
    }
  }
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });
  }
  const resend = new Resend(process.env.RESEND_API_KEY);

  // ── Load base workbooks from bundled Base64 constants ────────────────────
  const membersBase = XLSX.read(Buffer.from(membersBase64, "base64"), { type: "buffer" });
  const yfBase      = XLSX.read(Buffer.from(yfReceiptsBase64, "base64"), { type: "buffer" });
  const yfsBase     = XLSX.read(Buffer.from(yfsReceiptsBase64, "base64"), { type: "buffer" });

  const membersWs  = membersBase.Sheets["Sheet1"];
  const yfWs       = yfBase.Sheets["Sheet1"];
  const yfsWs      = yfsBase.Sheets["Sheet1"];

  const membersRows = XLSX.utils.sheet_to_json<(string | number)[]>(membersWs, { header: 1, defval: "" });
  const yfRows      = XLSX.utils.sheet_to_json<(string | number)[]>(yfWs,      { header: 1, defval: "" });
  const yfsRows     = XLSX.utils.sheet_to_json<(string | number)[]>(yfsWs,     { header: 1, defval: "" });

  // Determine cutoffs from last row of base files
  const lastMemberAppNo   = membersRows[membersRows.length - 1][0] as number;   // e.g. 2838
  const lastYFReceipt     = yfRows[yfRows.length - 1][1] as number;              // e.g. 4422
  const lastYFSReceipt    = yfsRows[yfsRows.length - 1][1] as number;            // e.g. 2680
  const lastYFDateSerial  = yfRows[yfRows.length - 1][0] as number;              // e.g. 46164
  const lastYFSDateSerial = yfsRows[yfsRows.length - 1][0] as number;

  const yfCutoff  = fromXL(lastYFDateSerial);
  const yfsCutoff = fromXL(lastYFSDateSerial);

  // ── Query new data from DB ────────────────────────────────────────────────
  const [newMembers, yfPayments, yfsPayments] = await Promise.all([
    // New members: those whose numeric ID > lastMemberAppNo
    prisma.member.findMany({
      orderBy: { memberId: "asc" },
      select: {
        memberId: true, fullName: true, gender: true, dateOfBirth: true,
        address: true, email: true, phone: true, whatsapp: true,
        weight: true, height: true, intentionOfJoining: true,
        joinDate: true, startDate: true,
      },
    }).then(all => all.filter(m => {
      const n = numericId(m.memberId);
      return typeof n === "number" && n > lastMemberAppNo;
    })),

    // New YF payments (YF- prefix, not YFS-)
    prisma.payment.findMany({
      where: {
        isVoided: false,
        date: { gt: yfCutoff },
        member: { memberId: { startsWith: "YF-", not: { startsWith: "YFS-" } } },
      },
      orderBy: [{ date: "asc" }, { receiptNumber: "asc" }],
      select: {
        receiptNumber: true, date: true,
        member: { select: { memberId: true, fullName: true, phone: true } },
        amount: true, pendingAmount: true,
        paymentMode: true, splitPaymentMode: true, splitAmount: true,
        package: { select: { name: true, durationDays: true } },
        categoryLabel: true,
        membership: { select: { startDate: true, expiryDate: true } },
      },
    }),

    // New YFS payments (YFS- prefix)
    prisma.payment.findMany({
      where: {
        isVoided: false,
        date: { gt: yfsCutoff },
        member: { memberId: { startsWith: "YFS-" } },
      },
      orderBy: [{ date: "asc" }, { receiptNumber: "asc" }],
      select: {
        receiptNumber: true, date: true,
        member: { select: { memberId: true, fullName: true, phone: true } },
        amount: true, pendingAmount: true,
        paymentMode: true, splitPaymentMode: true, splitAmount: true,
        package: { select: { name: true, durationDays: true } },
        categoryLabel: true,
        membership: { select: { startDate: true, expiryDate: true } },
      },
    }),
  ]);

  // ── Append new members ────────────────────────────────────────────────────
  // Exact column order: APPLICATION NUMBER, NAME, GENDER, DATE OF BIRTH, AGE,
  // MARITAL STATUS, ADDRESS, PINCODE, EMAIL, MOBILE, "", "", PROFESSION,
  // WEIGHT, HEIGHT, PURPOSE, DATE, DOJ
  for (const m of newMembers) {
    const dob = m.dateOfBirth ? new Date(m.dateOfBirth) : null;
    const row: (string | number)[] = [
      numericId(m.memberId) as number,
      m.fullName.toUpperCase(),
      m.gender ?? "NIL",
      toXL(dob) as number | "",
      calcAge(dob) as number | "",
      "NIL",                          // MARITAL STATUS
      m.address ?? "NIL",
      "NIL",                          // PINCODE
      m.email ?? "NIL",
      m.phone,
      "",                             // col K (empty)
      "",                             // col L (empty)
      "NIL",                          // PROFESSION
      m.weight ? Number(m.weight) : "NIL",
      m.height ? Number(m.height) : "NIL",
      m.intentionOfJoining ?? "NIL",
      toXL(m.joinDate) as number | "",
      toXL(m.startDate) as number | "",
    ] as (string | number)[];
    membersRows.push(row);
  }

  // ── Append new YF payments ────────────────────────────────────────────────
  // Exact columns: DATE, RECEIPT NO., NAME, MOBILE, APPL NO., TYPE,
  // MODE OF PAYMENT, PACKAGE, DURATION, START, END, AMOUNT, BALANCE
  let yfReceiptNo = lastYFReceipt;
  for (const p of yfPayments) {
    const modeStr = p.splitPaymentMode && p.splitAmount
      ? `${p.paymentMode} + ${p.splitPaymentMode}`
      : (p.paymentMode ?? "");
    const row: (string | number)[] = [
      toXL(p.date, 2000) as number | "",
      p.receiptNumber ?? ++yfReceiptNo,
      p.member.fullName.toUpperCase(),
      p.member.phone,
      numericId(p.member.memberId) as number | "",
      p.categoryLabel ?? "",
      modeStr.toUpperCase(),
      p.package?.name ?? "",
      getDuration(p.package?.durationDays),
      toXL(p.membership?.startDate) as number | "",
      toXL(p.membership?.expiryDate) as number | "",
      fmtMoney(p.amount),
      p.pendingAmount ? fmtMoney(p.pendingAmount) : "NIL",
    ] as (string | number)[];
    yfRows.push(row);
  }

  // ── Append new YFS payments ───────────────────────────────────────────────
  // Exact columns: DATE, RECEIPT NO., NAME, MOBILE, APPL. NO, TYPE,
  // MODE OF PAYMENT, PACKAGE, DURATION, START, END, AMOUNT, BALANCE, COUPLE OFFER
  let yfsReceiptNo = lastYFSReceipt;
  for (const p of yfsPayments) {
    const modeStr = p.splitPaymentMode && p.splitAmount
      ? `${p.paymentMode} + ${p.splitPaymentMode}`
      : (p.paymentMode ?? "");
    const row: (string | number)[] = [
      toXL(p.date, 2000) as number | "",
      p.receiptNumber ?? ++yfsReceiptNo,
      p.member.fullName.toUpperCase(),
      p.member.phone,
      numericId(p.member.memberId) as number | "",
      p.categoryLabel ?? "",
      modeStr.toUpperCase(),
      p.package?.name ?? "",
      getDuration(p.package?.durationDays),
      toXL(p.membership?.startDate) as number | "",
      toXL(p.membership?.expiryDate) as number | "",
      fmtMoney(p.amount),
      p.pendingAmount ? fmtMoney(p.pendingAmount) : "NIL",
      "",                             // COUPLE OFFER
    ] as (string | number)[];
    yfsRows.push(row);
  }

  // ── Rebuild worksheets from updated row arrays ────────────────────────────
  function rowsToSheet(rows: (string | number)[][], dateColIndices: number[]): XLSX.WorkSheet {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    applyDateFormat(ws, dateColIndices);
    ws["!freeze"] = { xSplit: 0, ySplit: 1 };
    return ws;
  }

  const newMembersWs = rowsToSheet(membersRows as (string|number)[][], [3, 16, 17]);
  const newYfWs      = rowsToSheet(yfRows as (string|number)[][], [0, 9, 10]);
  const newYfsWs     = rowsToSheet(yfsRows as (string|number)[][], [0, 9, 10]);

  // ── Build workbooks ───────────────────────────────────────────────────────
  function makeWb(sheetName: string, ws: XLSX.WorkSheet): XLSX.WorkBook {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    return wb;
  }

  const membersWb = makeWb("Sheet1", newMembersWs);
  const yfWb      = makeWb("Sheet1", newYfWs);
  const yfsWb     = makeWb("Sheet1", newYfsWs);

  const toB64 = (wb: XLSX.WorkBook) =>
    Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" })).toString("base64");

  // ── Email ─────────────────────────────────────────────────────────────────
  const today = new Date();
  const dateStr = today.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  const { error } = await resend.emails.send({
    from: "Yos CRM Backup <onboarding@resend.dev>",
    to: BACKUP_EMAIL,
    subject: `Yos CRM Backup — ${dateStr}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
        <h2 style="color:#111;margin-bottom:4px">Yos CRM Backup</h2>
        <p style="color:#666;margin-top:0">Generated on ${dateStr}</p>
        <hr style="border:none;border-top:1px solid #eee;margin:16px 0"/>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:6px 0;color:#555;font-size:14px">Total Members</td><td style="padding:6px 0;font-weight:700;font-size:14px;text-align:right">${membersRows.length - 1}</td></tr>
          <tr><td style="padding:6px 0;color:#555;font-size:14px">New Members (since base)</td><td style="padding:6px 0;font-weight:700;font-size:14px;text-align:right;color:#16a34a">+${newMembers.length}</td></tr>
          <tr><td style="padding:6px 0;color:#555;font-size:14px">YF Receipts</td><td style="padding:6px 0;font-weight:700;font-size:14px;text-align:right">${yfRows.length - 1}</td></tr>
          <tr><td style="padding:6px 0;color:#555;font-size:14px">New YF Receipts</td><td style="padding:6px 0;font-weight:700;font-size:14px;text-align:right;color:#16a34a">+${yfPayments.length}</td></tr>
          <tr><td style="padding:6px 0;color:#555;font-size:14px">YFS Receipts</td><td style="padding:6px 0;font-weight:700;font-size:14px;text-align:right">${yfsRows.length - 1}</td></tr>
          <tr><td style="padding:6px 0;color:#555;font-size:14px">New YFS Receipts</td><td style="padding:6px 0;font-weight:700;font-size:14px;text-align:right;color:#16a34a">+${yfsPayments.length}</td></tr>
        </table>
        <hr style="border:none;border-top:1px solid #eee;margin:16px 0"/>
        <p style="color:#888;font-size:12px">3 attachments match the original file format. Base data: up to 22 May 2026.</p>
      </div>
    `,
    attachments: [
      { filename: `Member Master.xlsx`,                      content: toB64(membersWb) },
      { filename: `Yos fitness receipts.xlsx`,               content: toB64(yfWb) },
      { filename: `Yos fitness Studio Receipts.xlsx`,        content: toB64(yfsWb) },
    ],
  });

  if (error) {
    console.error("[backup] email failed:", error);
    return NextResponse.json({ error: "Email send failed", detail: error }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    totalMembers:      membersRows.length - 1,
    newMembers:        newMembers.length,
    totalYFReceipts:   yfRows.length - 1,
    newYFReceipts:     yfPayments.length,
    totalYFSReceipts:  yfsRows.length - 1,
    newYFSReceipts:    yfsPayments.length,
    emailedTo:         BACKUP_EMAIL,
    timestamp:         new Date().toISOString(),
  });
}
