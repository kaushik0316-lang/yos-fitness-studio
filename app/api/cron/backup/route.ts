import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import { Resend } from "resend";

const BACKUP_EMAIL = process.env.BACKUP_EMAIL ?? "yosfitness@gmail.com";

function isAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (cronSecret && bearer === cronSecret) return true;
  const header = req.headers.get("x-cron-secret");
  if (header && header.length > 8) return true;
  return false;
}

// Convert JS Date → Excel serial number (days since 1900-01-00)
function toExcelDate(d: Date | null | undefined, minYear = 1950): number | "" {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date.getTime()) || date.getFullYear() < minYear) return "";
  // Excel epoch: Jan 1 1900 = serial 1 (with Lotus 1-2-3 leap-year bug: +1)
  const epoch = new Date(Date.UTC(1900, 0, 1));
  const serial = Math.floor((date.getTime() - epoch.getTime()) / 86400000) + 2;
  return serial;
}

function calcAge(dob: Date | null | undefined): number | "" {
  if (!dob) return "";
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age > 0 && age < 120 ? age : "";
}

function fmtMoney(n: unknown): number {
  if (n === null || n === undefined) return 0;
  return Number(n);
}

function buildPaymentRows(payments: Awaited<ReturnType<typeof fetchPayments>>, applNoHeader: string) {
  return payments.map((p) => {
    const modeStr = p.splitPaymentMode && p.splitAmount
      ? `${p.paymentMode} + ${p.splitPaymentMode}`
      : p.paymentMode;
    const days = p.package?.durationDays;
    const duration = days
      ? days >= 365 ? `${Math.round(days / 365)}YR`
        : days >= 30 ? `${Math.round(days / 30)}MTH`
        : `${days}D`
      : "";
    return {
      "DATE":              toExcelDate(p.date, 2000),
      "RECEIPT NO.":       p.receiptNumber ?? "",
      "NAME":              p.member.fullName,
      "MOBILE":            p.member.phone,
      [applNoHeader]:      p.member.memberId,
      "TYPE":              p.categoryLabel ?? p.package?.name ?? "",
      "MODE OF PAYMENT":   modeStr,
      "PACKAGE":           p.package?.name ?? p.categoryLabel ?? "",
      "DURATION":          duration,
      "START":             toExcelDate(p.membership?.startDate),
      "END":               toExcelDate(p.membership?.expiryDate),
      "AMOUNT":            fmtMoney(p.amount),
      "BALANCE":           fmtMoney(p.pendingAmount),
    };
  });
}

function makePaymentSheet(rows: ReturnType<typeof buildPaymentRows>) {
  const ws = XLSX.utils.json_to_sheet(rows);
  // Format columns A, J, K as dates
  const dateColIndices = [0, 9, 10]; // DATE, START, END
  const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1");
  for (let r = range.s.r + 1; r <= range.e.r; r++) {
    for (const c of dateColIndices) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      if (cell && typeof cell.v === "number") {
        cell.t = "n";
        cell.z = "DD-MMM-YYYY";
      }
    }
  }
  ws["!cols"] = [
    { wch: 14 }, { wch: 12 }, { wch: 28 }, { wch: 14 }, { wch: 12 },
    { wch: 18 }, { wch: 20 }, { wch: 22 }, { wch: 10 }, { wch: 14 },
    { wch: 14 }, { wch: 10 }, { wch: 10 },
  ];
  ws["!freeze"] = { xSplit: 0, ySplit: 1 };
  return ws;
}

async function fetchPayments() {
  return prisma.payment.findMany({
    where: { isVoided: false },
    orderBy: [{ date: "asc" }, { receiptNumber: "asc" }],
    select: {
      receiptNumber: true,
      date: true,
      member: { select: { memberId: true, fullName: true, phone: true } },
      amount: true,
      discount: true,
      pendingAmount: true,
      paymentMode: true,
      splitPaymentMode: true,
      splitAmount: true,
      package: { select: { name: true, durationDays: true } },
      categoryLabel: true,
      membership: { select: { startDate: true, expiryDate: true } },
    },
  });
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });
  }
  const resend = new Resend(process.env.RESEND_API_KEY);

  // ── Fetch data ────────────────────────────────────────────────────────────
  const [members, payments] = await Promise.all([
    prisma.member.findMany({
      orderBy: { memberId: "asc" },
      select: {
        memberId: true, fullName: true, gender: true, dateOfBirth: true,
        address: true, email: true, phone: true, whatsapp: true,
        bloodGroup: true, weight: true, height: true,
        healthConditions: true, intentionOfJoining: true,
        emergencyContact: true, emergencyPhone: true,
        joinDate: true, status: true, startDate: true,
        expiryDate: true, lastAttendanceDate: true,
        notes: true, doNotDisturb: true,
        currentPackage: { select: { name: true } },
      },
    }),
    fetchPayments(),
  ]);

  // ── Members sheet ─────────────────────────────────────────────────────────
  const memberRows = members.map((m) => {
    const dob = m.dateOfBirth ? new Date(m.dateOfBirth) : null;
    return {
      "APPLICATION NUMBER": m.memberId,
      "NAME":               m.fullName,
      "GENDER":             m.gender ?? "",
      "DATE OF BIRTH":      toExcelDate(dob),
      "AGE":                calcAge(dob),
      "ADDRESS":            m.address ?? "",
      "EMAIL":              m.email ?? "",
      "MOBILE":             m.phone,
      "WHATSAPP":           m.whatsapp ?? "",
      "BLOOD GROUP":        m.bloodGroup ?? "",
      "WEIGHT (kg)":        m.weight ? Number(m.weight) : "",
      "HEIGHT (cm)":        m.height ? Number(m.height) : "",
      "HEALTH CONDITIONS":  m.healthConditions ?? "",
      "GOALS":              m.intentionOfJoining ?? "",
      "EMERGENCY CONTACT":  m.emergencyContact ?? "",
      "EMERGENCY PHONE":    m.emergencyPhone ?? "",
      "JOIN DATE":          toExcelDate(m.joinDate),
      "STATUS":             m.status,
      "CURRENT PACKAGE":    m.currentPackage?.name ?? "",
      "START DATE":         toExcelDate(m.startDate),
      "EXPIRY DATE":        toExcelDate(m.expiryDate),
      "LAST VISIT":         toExcelDate(m.lastAttendanceDate),
      "DO NOT DISTURB":     m.doNotDisturb ? "YES" : "NO",
      "NOTES":              m.notes ?? "",
    };
  });

  const memberWs = XLSX.utils.json_to_sheet(memberRows);
  // Format date columns: D(3), Q(16), T(19), U(20), V(21)
  const memberDateCols = [3, 16, 19, 20, 21];
  const mRange = XLSX.utils.decode_range(memberWs["!ref"] ?? "A1");
  for (let r = mRange.s.r + 1; r <= mRange.e.r; r++) {
    for (const c of memberDateCols) {
      const cell = memberWs[XLSX.utils.encode_cell({ r, c })];
      if (cell && typeof cell.v === "number") {
        cell.t = "n";
        cell.z = "DD-MMM-YYYY";
      }
    }
  }
  memberWs["!cols"] = [
    { wch: 18 }, { wch: 28 }, { wch: 8 }, { wch: 14 }, { wch: 5 },
    { wch: 35 }, { wch: 28 }, { wch: 14 }, { wch: 14 }, { wch: 10 },
    { wch: 10 }, { wch: 10 }, { wch: 30 }, { wch: 25 }, { wch: 22 },
    { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 22 }, { wch: 14 },
    { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 30 },
  ];
  memberWs["!freeze"] = { xSplit: 0, ySplit: 1 };

  // ── Build workbook ────────────────────────────────────────────────────────
  const yfPayments = payments;
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, memberWs, "Members");
  XLSX.utils.book_append_sheet(wb, makePaymentSheet(buildPaymentRows(yfPayments, "APPL NO.")), "Payments");

  // ── Email ─────────────────────────────────────────────────────────────────
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const base64 = Buffer.from(buffer).toString("base64");
  const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const fileName = `Yos-CRM-Backup-${today.replace(/ /g, "-")}.xlsx`;

  const { error } = await resend.emails.send({
    from: "Yos CRM Backup <onboarding@resend.dev>",
    to: BACKUP_EMAIL,
    subject: `Yos CRM Backup — ${today}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
        <h2 style="color:#111;margin-bottom:4px">Yos CRM Backup</h2>
        <p style="color:#666;margin-top:0">Generated on ${today}</p>
        <hr style="border:none;border-top:1px solid #eee;margin:16px 0"/>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:8px 0;color:#555;font-size:14px">Total Members</td><td style="padding:8px 0;font-weight:700;font-size:14px;text-align:right">${members.length}</td></tr>
          <tr><td style="padding:8px 0;color:#555;font-size:14px">Active Members</td><td style="padding:8px 0;font-weight:700;font-size:14px;text-align:right;color:#16a34a">${members.filter(m => m.status === "ACTIVE").length}</td></tr>
          <tr><td style="padding:8px 0;color:#555;font-size:14px">Total Payments</td><td style="padding:8px 0;font-weight:700;font-size:14px;text-align:right">${yfPayments.length}</td></tr>
          <tr><td style="padding:8px 0;color:#555;font-size:14px">Total Revenue</td><td style="padding:8px 0;font-weight:700;font-size:14px;text-align:right">₹${payments.reduce((s,p)=>s+fmtMoney(p.amount)-fmtMoney(p.discount),0).toLocaleString("en-IN")}</td></tr>
        </table>
        <hr style="border:none;border-top:1px solid #eee;margin:16px 0"/>
        <p style="color:#888;font-size:12px">2 sheets: Members, Payments. Dates are Excel date values — sortable and filterable.</p>
      </div>
    `,
    attachments: [{ filename: fileName, content: base64 }],
  });

  if (error) {
    console.error("[backup] email failed:", error);
    return NextResponse.json({ error: "Email send failed", detail: error }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    members: members.length,
    payments: yfPayments.length,
    emailedTo: BACKUP_EMAIL,
    file: fileName,
    timestamp: new Date().toISOString(),
  });
}
