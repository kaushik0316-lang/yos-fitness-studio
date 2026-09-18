import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import { Resend } from "resend";

const BACKUP_EMAIL = process.env.BACKUP_EMAIL ?? "kaushik0316@gmail.com";

function isAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  const manualSecret = process.env.CRON_SECRET_1;
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const header = req.headers.get("x-cron-secret");
  // Vercel sends Authorization: Bearer <CRON_SECRET> for automatic cron invocations
  if (cronSecret && bearer === cronSecret) return true;
  // Manual trigger via header (using CRON_SECRET_1)
  if (manualSecret && header === manualSecret) return true;
  // Manual trigger via Authorization: Bearer <CRON_SECRET_1>
  if (manualSecret && bearer === manualSecret) return true;
  return false;
}

function fmtDate(d: Date | null | undefined): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtMoney(n: unknown): number {
  if (n === null || n === undefined) return 0;
  return Number(n);
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });
  }
  const resend = new Resend(process.env.RESEND_API_KEY);

  // ── Fetch all members ─────────────────────────────────────────────────────
  const members = await prisma.member.findMany({
    orderBy: { memberId: "asc" },
    select: {
      memberId: true,
      fullName: true,
      gender: true,
      dateOfBirth: true,
      address: true,
      email: true,
      phone: true,
      whatsapp: true,
      bloodGroup: true,
      weight: true,
      height: true,
      healthConditions: true,
      intentionOfJoining: true,
      emergencyContact: true,
      emergencyPhone: true,
      joinDate: true,
      status: true,
      startDate: true,
      expiryDate: true,
      lastAttendanceDate: true,
      notes: true,
      doNotDisturb: true,
      currentPackage: { select: { name: true } },
    },
  });

  // ── Fetch all payments ────────────────────────────────────────────────────
  const payments = await prisma.payment.findMany({
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
      package: { select: { name: true } },
      categoryLabel: true,
      membership: { select: { startDate: true, expiryDate: true } },
      notes: true,
    },
  });

  // ── Build Members sheet (matching original Member Master format) ──────────
  const memberRows = members.map((m) => ({
    "MEMBER ID":            m.memberId,
    "NAME":                 m.fullName,
    "GENDER":               m.gender ?? "",
    "DATE OF BIRTH":        fmtDate(m.dateOfBirth),
    "ADDRESS":              m.address ?? "",
    "EMAIL":                m.email ?? "",
    "MOBILE":               m.phone,
    "WHATSAPP":             m.whatsapp ?? "",
    "BLOOD GROUP":          m.bloodGroup ?? "",
    "WEIGHT (kg)":          m.weight ? Number(m.weight) : "",
    "HEIGHT (cm)":          m.height ? Number(m.height) : "",
    "HEALTH CONDITIONS":    m.healthConditions ?? "",
    "GOALS":                m.intentionOfJoining ?? "",
    "EMERGENCY CONTACT":    m.emergencyContact ?? "",
    "EMERGENCY PHONE":      m.emergencyPhone ?? "",
    "JOIN DATE":            fmtDate(m.joinDate),
    "STATUS":               m.status,
    "CURRENT PACKAGE":      m.currentPackage?.name ?? "",
    "START DATE":           fmtDate(m.startDate),
    "EXPIRY DATE":          fmtDate(m.expiryDate),
    "LAST VISIT":           fmtDate(m.lastAttendanceDate),
    "DO NOT DISTURB":       m.doNotDisturb ? "YES" : "NO",
    "NOTES":                m.notes ?? "",
  }));

  // ── Build Payments sheet (matching original Receipts format) ─────────────
  const paymentRows = payments.map((p) => {
    const paid = fmtMoney(p.amount) - fmtMoney(p.discount);
    const modeStr = p.splitPaymentMode && p.splitAmount
      ? `${p.paymentMode} + ${p.splitPaymentMode}`
      : p.paymentMode;
    return {
      "RECEIPT NO.":      p.receiptNumber ?? "",
      "DATE":             fmtDate(p.date),
      "MEMBER ID":        p.member.memberId,
      "NAME":             p.member.fullName,
      "MOBILE":           p.member.phone,
      "TYPE":             p.categoryLabel ?? p.package?.name ?? "",
      "MODE OF PAYMENT":  modeStr,
      "PACKAGE":          p.package?.name ?? p.categoryLabel ?? "",
      "START":            fmtDate(p.membership?.startDate),
      "END":              fmtDate(p.membership?.expiryDate),
      "AMOUNT":           fmtMoney(p.amount),
      "DISCOUNT":         fmtMoney(p.discount),
      "PAID":             paid,
      "BALANCE":          fmtMoney(p.pendingAmount),
      "SPLIT AMOUNT":     p.splitAmount ? fmtMoney(p.splitAmount) : "",
      "NOTES":            p.notes ?? "",
    };
  });

  // ── Create workbook ───────────────────────────────────────────────────────
  const wb = XLSX.utils.book_new();

  const memberWs = XLSX.utils.json_to_sheet(memberRows);
  // Column widths
  memberWs["!cols"] = [
    { wch: 10 }, { wch: 28 }, { wch: 8 }, { wch: 14 }, { wch: 35 },
    { wch: 28 }, { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 10 },
    { wch: 10 }, { wch: 30 }, { wch: 25 }, { wch: 20 }, { wch: 14 },
    { wch: 14 }, { wch: 12 }, { wch: 22 }, { wch: 14 }, { wch: 14 },
    { wch: 14 }, { wch: 14 }, { wch: 30 },
  ];
  XLSX.utils.book_append_sheet(wb, memberWs, "Members");

  const paymentWs = XLSX.utils.json_to_sheet(paymentRows);
  paymentWs["!cols"] = [
    { wch: 12 }, { wch: 14 }, { wch: 10 }, { wch: 28 }, { wch: 14 },
    { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 14 }, { wch: 14 },
    { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 },
    { wch: 25 },
  ];
  XLSX.utils.book_append_sheet(wb, paymentWs, "Payments");

  // ── Convert to buffer ─────────────────────────────────────────────────────
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const base64 = Buffer.from(buffer).toString("base64");

  const today = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const fileName = `Yos-CRM-Backup-${today.replace(/ /g, "-")}.xlsx`;

  // ── Send email ────────────────────────────────────────────────────────────
  const { error } = await resend.emails.send({
    from: "Yos CRM Backup <onboarding@resend.dev>",
    to: BACKUP_EMAIL,
    subject: `📦 Yos CRM Backup — ${today}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
        <h2 style="color:#111;margin-bottom:4px">Yos CRM Backup</h2>
        <p style="color:#666;margin-top:0">Generated on ${today}</p>
        <hr style="border:none;border-top:1px solid #eee;margin:16px 0"/>
        <table style="width:100%;border-collapse:collapse">
          <tr>
            <td style="padding:8px 0;color:#555;font-size:14px">Total Members</td>
            <td style="padding:8px 0;font-weight:700;font-size:14px;text-align:right">${members.length}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#555;font-size:14px">Active Members</td>
            <td style="padding:8px 0;font-weight:700;font-size:14px;text-align:right;color:#16a34a">${members.filter(m => m.status === "ACTIVE").length}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#555;font-size:14px">Total Payments</td>
            <td style="padding:8px 0;font-weight:700;font-size:14px;text-align:right">${payments.length}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#555;font-size:14px">Total Revenue</td>
            <td style="padding:8px 0;font-weight:700;font-size:14px;text-align:right">₹${payments.reduce((s,p)=>s+fmtMoney(p.amount)-fmtMoney(p.discount),0).toLocaleString("en-IN")}</td>
          </tr>
        </table>
        <hr style="border:none;border-top:1px solid #eee;margin:16px 0"/>
        <p style="color:#888;font-size:12px">The attached Excel file contains all member and payment data from Yos CRM. Keep this safe — it can be used to restore the CRM if needed.</p>
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
    payments: payments.length,
    emailedTo: BACKUP_EMAIL,
    file: fileName,
    timestamp: new Date().toISOString(),
  });
}
