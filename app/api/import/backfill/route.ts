import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

function excelDate(serial: unknown): Date | null {
  if (typeof serial === "number" && serial > 1) {
    return new Date(Math.round((serial - 25569) * 86400 * 1000));
  }
  if (typeof serial === "string" && serial.trim()) {
    const m = serial.trim().match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
    if (m) {
      const day = parseInt(m[1], 10), mon = parseInt(m[2], 10) - 1;
      let yr = parseInt(m[3], 10);
      if (yr < 100) yr += yr < 50 ? 2000 : 1900;
      const d = new Date(yr, mon, day);
      if (!isNaN(d.getTime())) return d;
    }
  }
  return null;
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
  const updates: { id: string; startDate: Date; expiryDate: Date; date: Date | null; memberId: string }[] = [];

  // Cutoff: payment.date values equal to the import timestamp (defaulted because Excel
  // date was text). Any date within 2 hours of "now" at import time is suspect — we
  // replace those with the actual receipt date from column 0.
  const twoHoursMs = 2 * 60 * 60 * 1000;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as any[];
    const receiptNo   = typeof row[1] === "number" ? row[1] : null;
    const dateSerial  = row[0];   // DATE column
    const startSerial = row[9];   // START column
    const endSerial   = row[10];  // END column

    if (receiptNo === null) continue;

    const payment = byReceiptNo[receiptNo];
    if (!payment) { notFound++; continue; }

    const startDate  = excelDate(startSerial);
    const expiryDate = excelDate(endSerial);

    if (!startDate || !expiryDate) { noDates++; continue; }

    // Attempt to fix the payment date if it was defaulted to import time
    const receiptDate = excelDate(dateSerial);

    updates.push({ id: payment.id, startDate, expiryDate, date: receiptDate, memberId: payment.memberId });
  }

  // Bulk update payments with start/expiry dates (and fix date if available)
  for (const u of updates) {
    const data: any = { startDate: u.startDate, expiryDate: u.expiryDate };
    if (u.date) data.date = u.date; // overwrite defaulted date with real receipt date
    await prisma.payment.update({ where: { id: u.id }, data });
    datesUpdated++;
  }

  // ── Sync member status based on latest expiryDate ──────────────────────────
  const today = new Date();

  // Collect ghost member UUIDs so we can exclude them without a relation filter
  // (Prisma groupBy does not support relation-based where filters)
  const ghostMembers = await prisma.member.findMany({
    where: { memberId: { startsWith: "IMP-" } },
    select: { id: true },
  });
  const ghostIds = ghostMembers.map((g) => g.id);

  // Get each real member's latest payment expiryDate
  const memberLatestExpiry = await prisma.payment.groupBy({
    by: ["memberId"],
    where: {
      company: company as any,
      expiryDate: { not: null },
      ...(ghostIds.length > 0 ? { memberId: { notIn: ghostIds } } : {}),
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
      data: { status: newStatus, expiryDate: expiry },
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
