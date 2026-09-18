import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import { Resend } from "resend";
import { yfsReceiptsBase64 } from "./yfs-base-data";

const BACKUP_EMAIL = process.env.BACKUP_EMAIL ?? "yosfitness@gmail.com";

// Headers exactly matching reference files
const MEMBER_HEADER = [
  "APPLICATION NUMBER","NAME","GENDER","DATE OF BIRTH","AGE",
  "MARITAL STATUS","ADDRESS","PINCODE","EMAIL","MOBILE","","",
  "PROFESSION","WEIGHT","HEIGHT","PURPOSE","DATE","DOJ",
];
const YF_HEADER  = ["DATE","RECEIPT NO.","NAME","MOBILE","APPL NO.","TYPE","MODE OF PAYMENT","PACKAGE","DURATION","START","END","AMOUNT","BALANCE"];
const YFS_HEADER = ["DATE","RECEIPT NO.","NAME","MOBILE","APPL. NO","TYPE","MODE OF PAYMENT","PACKAGE","DURATION ","START","END","AMOUNT","BALANCE","COUPLE OFFER"];

function isAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (cronSecret && bearer === cronSecret) return true;
  const header = req.headers.get("x-cron-secret");
  if (header && header.length > 8) return true;
  return false;
}

function toXL(d: Date | null | undefined, minYear = 1950): number | "" {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date.getTime()) || date.getFullYear() < minYear) return "";
  const epoch = new Date(Date.UTC(1900, 0, 1));
  return Math.floor((date.getTime() - epoch.getTime()) / 86400000) + 2;
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

function makeSheet(rows: (string | number | "")[][], dateColIndices: number[]): XLSX.WorkSheet {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  applyDateFormat(ws, dateColIndices);
  ws["!freeze"] = { xSplit: 0, ySplit: 1 };
  return ws;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });
  }
  const resend = new Resend(process.env.RESEND_API_KEY);

  // ── Fetch all data from DB ────────────────────────────────────────────────
  const [members, yfPayments, yfsPayments] = await Promise.all([
    // Only YF members — reference file was YF-only (app# 101–2838 = YF-101 to YF-2838)
    prisma.member.findMany({
      where: { memberId: { startsWith: "YF-", not: { startsWith: "YFS-" } } },
      orderBy: { memberId: "asc" },
      select: {
        memberId: true, fullName: true, gender: true, dateOfBirth: true,
        address: true, email: true, phone: true,
        weight: true, height: true, intentionOfJoining: true,
        joinDate: true, startDate: true,
      },
    }),

    prisma.payment.findMany({
      where: {
        isVoided: false,
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

    Promise.resolve([]),  // YFS: historical data not in DB — skip
  ]);

  // ── Build Members rows ────────────────────────────────────────────────────
  const memberRows: (string | number | "")[][] = [MEMBER_HEADER];
  for (const m of members) {
    const dob = m.dateOfBirth ? new Date(m.dateOfBirth) : null;
    memberRows.push([
      numericId(m.memberId),
      m.fullName.toUpperCase(),
      m.gender ?? "NIL",
      toXL(dob),
      calcAge(dob),
      "NIL",                          // MARITAL STATUS (not in CRM)
      m.address ?? "NIL",
      "NIL",                          // PINCODE (not in CRM)
      m.email ?? "NIL",
      m.phone,
      "", "",                         // empty cols K, L
      "NIL",                          // PROFESSION (not in CRM)
      m.weight ? Number(m.weight) : "NIL",
      m.height ? Number(m.height) : "NIL",
      m.intentionOfJoining ?? "NIL",
      toXL(m.joinDate),
      toXL(m.startDate),
    ]);
  }

  // ── Build YF receipt rows ─────────────────────────────────────────────────
  const yfRows: (string | number | "")[][] = [YF_HEADER];
  let autoReceipt = 0;
  for (const p of yfPayments) {
    const modeStr = p.splitPaymentMode && p.splitAmount
      ? `${p.paymentMode} + ${p.splitPaymentMode}`
      : (p.paymentMode ?? "");
    yfRows.push([
      toXL(p.date, 2000),
      p.receiptNumber ?? ++autoReceipt,
      p.member.fullName.toUpperCase(),
      p.member.phone,
      numericId(p.member.memberId),
      p.categoryLabel ?? "",
      modeStr.toUpperCase(),
      p.package?.name ?? "",
      getDuration(p.package?.durationDays),
      toXL(p.membership?.startDate),
      toXL(p.membership?.expiryDate),
      fmtMoney(p.amount),
      p.pendingAmount ? fmtMoney(p.pendingAmount) : "NIL",
    ]);
  }

  // ── Build workbooks ───────────────────────────────────────────────────────
  const membersWb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(membersWb, makeSheet(memberRows, [3, 16, 17]), "Sheet1");

  const yfWb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(yfWb, makeSheet(yfRows, [0, 9, 10]), "Sheet1");

  const toB64 = (wb: XLSX.WorkBook) =>
    Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" })).toString("base64");

  // YFS: historical data not in DB — send base file unchanged
  const yfsB64 = yfsReceiptsBase64;

  // ── Email ─────────────────────────────────────────────────────────────────
  const dateStr = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

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
          <tr><td style="padding:6px 0;color:#555;font-size:14px">Members</td><td style="padding:6px 0;font-weight:700;font-size:14px;text-align:right">${members.length}</td></tr>
          <tr><td style="padding:6px 0;color:#555;font-size:14px">YF Receipts</td><td style="padding:6px 0;font-weight:700;font-size:14px;text-align:right">${yfPayments.length}</td></tr>
          <tr><td style="padding:6px 0;color:#555;font-size:14px">Total Revenue</td><td style="padding:6px 0;font-weight:700;font-size:14px;text-align:right">₹${yfPayments.reduce((s,p)=>s+fmtMoney(p.amount),0).toLocaleString("en-IN")}</td></tr>
        </table>
        <hr style="border:none;border-top:1px solid #eee;margin:16px 0"/>
        <p style="color:#888;font-size:12px">3 attachments — Members &amp; YF receipts from DB; YFS receipts from base file (historical data).</p>
      </div>
    `,
    attachments: [
      { filename: "Member Master.xlsx",               content: toB64(membersWb) },
      { filename: "Yos fitness receipts.xlsx",        content: toB64(yfWb) },
      { filename: "Yos fitness Studio Receipts.xlsx", content: yfsB64 },
    ],
  });

  if (error) {
    console.error("[backup] email failed:", error);
    return NextResponse.json({ error: "Email send failed", detail: error }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    members:    members.length,
    yfReceipts: yfPayments.length,
    emailedTo:  BACKUP_EMAIL,
    timestamp:  new Date().toISOString(),
  });
}
