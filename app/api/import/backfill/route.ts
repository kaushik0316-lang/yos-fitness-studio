import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

function excelDate(serial: unknown): Date | null {
  if (typeof serial !== "number" || serial < 1) return null;
  return new Date(Math.round((serial - 25569) * 86400 * 1000));
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file    = formData.get("file") as File | null;
  const company = formData.get("company") as string | null;

  if (!file || !company) {
    return NextResponse.json({ error: "Missing file or company" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const wb = XLSX.read(buffer, { type: "buffer" });
  const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[wb.SheetNames[0]], {
    header: 1, defval: "", raw: true,
  });

  // Load all payments for this company that have a receipt number
  const existingPayments = await prisma.payment.findMany({
    where: { company: company as any, receiptNumber: { not: null } },
    select: { id: true, receiptNumber: true, memberId: true },
  });
  const byReceiptNo: Record<number, { id: string; memberId: string }> = {};
  for (const p of existingPayments) {
    if (p.receiptNumber !== null) byReceiptNo[p.receiptNumber] = { id: p.id, memberId: p.memberId };
  }

  let datesUpdated = 0, notFound = 0, noDates = 0;

  // Process in batches of 100 updates
  const updates: { id: string; startDate: Date; expiryDate: Date; memberId: string }[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as any[];
    const receiptNo = typeof row[1] === "number" ? row[1] : null;
    const startSerial = row[9];   // START column
    const endSerial   = row[10];  // END column

    if (receiptNo === null) continue;

    const payment = byReceiptNo[receiptNo];
    if (!payment) { notFound++; continue; }

    const startDate  = excelDate(startSerial);
    const expiryDate = excelDate(endSerial);

    if (!startDate || !expiryDate) { noDates++; continue; }

    updates.push({ id: payment.id, startDate, expiryDate, memberId: payment.memberId });
  }

  // Bulk update payments with start/expiry dates
  for (const u of updates) {
    await prisma.payment.update({
      where: { id: u.id },
      data: { startDate: u.startDate, expiryDate: u.expiryDate },
    });
    datesUpdated++;
  }

  // ── Sync member status based on latest expiryDate ──────────────────────────
  const today = new Date();

  // Get each real member's latest payment expiryDate
  const memberLatestExpiry = await prisma.payment.groupBy({
    by: ["memberId"],
    where: {
      company: company as any,
      expiryDate: { not: null },
      member: { NOT: { memberId: { startsWith: "IMP-" } } },
    },
    _max: { expiryDate: true },
  });

  let setActive = 0, setExpired = 0;

  for (const row of memberLatestExpiry) {
    const expiry = row._max.expiryDate;
    if (!expiry) continue;

    const newStatus = expiry >= today ? "ACTIVE" : "EXPIRED";
    await prisma.member.update({
      where: { id: row.memberId },
      data: { status: newStatus },
    });

    if (newStatus === "ACTIVE") setActive++;
    else setExpired++;
  }

  return NextResponse.json({
    datesUpdated,
    notFound,
    noDates,
    membersSetActive: setActive,
    membersSetExpired: setExpired,
  });
}
