import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

function excelDate(serial: unknown): Date | null {
  if (typeof serial === "number" && serial > 1)
    return new Date(Math.round((serial - 25569) * 86400 * 1000));
  if (typeof serial === "string" && serial.trim()) {
    const s = serial.trim();
    const m = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
    if (m) {
      let yr = parseInt(m[3], 10);
      if (yr < 100) yr += yr < 50 ? 2000 : 1900;
      const d = new Date(parseInt(m[3], 10) >= 100 ? yr : yr, parseInt(m[2], 10) - 1, parseInt(m[1], 10));
      const d2 = new Date(yr, parseInt(m[2], 10) - 1, parseInt(m[1], 10));
      if (!isNaN(d2.getTime())) return d2;
    }
  }
  return null;
}

function parseDuration(raw: unknown): number | null {
  const s = String(raw ?? "").toUpperCase().replace(/\s/g, "");
  const m = s.match(/^(\d+)/);
  if (!m) return null;
  const n = parseInt(m[1]);
  const map: Record<number, number> = { 1: 30, 2: 60, 3: 90, 4: 120, 6: 180, 12: 365, 24: 730 };
  return map[n] ?? null;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const company = formData.get("company") as string | null;
  if (!file || !company)
    return NextResponse.json({ error: "Missing file or company" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const wb = XLSX.read(buffer, { type: "buffer" });
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]], {
    defval: null, raw: true,
  });

  // Build receipt number → payment id map for this company
  const existingPayments = await prisma.payment.findMany({
    where: { company: company as any, receiptNumber: { not: null } },
    select: { id: true, receiptNumber: true, memberId: true },
  });
  const byReceiptNo = new Map(existingPayments.map((p) => [p.receiptNumber!, p]));

  let datesUpdated = 0;
  let notFound = 0;
  let noDates = 0;
  const today = new Date();
  const affectedMemberIdsSet = new Set<string>();

  for (const row of rows) {
    const receiptNoRaw = row["RECEIPT NO."] ?? row["RECEIPT NO"];
    const receiptNo = receiptNoRaw ? parseInt(String(receiptNoRaw).trim()) : null;
    if (!receiptNo || isNaN(receiptNo)) { notFound++; continue; }

    const payment = byReceiptNo.get(receiptNo);
    if (!payment) { notFound++; continue; }

    const startDate = excelDate(row["START"]);
    const expiryDate = excelDate(row["END"]);
    if (!startDate && !expiryDate) { noDates++; continue; }

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        ...(startDate && { startDate }),
        ...(expiryDate && { expiryDate }),
        ...(startDate && { date: startDate }),
      },
    });

    if (expiryDate) affectedMemberIdsSet.add(payment.memberId);
    datesUpdated++;
  }

  // Sync member statuses
  let membersSetActive = 0;
  let membersSetExpired = 0;

  const affectedMemberIds = Array.from(affectedMemberIdsSet);
  for (let i = 0; i < affectedMemberIds.length; i++) {
    const memberId = affectedMemberIds[i];
    const latest = await prisma.payment.findFirst({
      where: { memberId, expiryDate: { not: null } },
      orderBy: { expiryDate: "desc" },
      select: { expiryDate: true, startDate: true, packageId: true },
    });
    if (!latest?.expiryDate) continue;
    const status = latest.expiryDate >= today ? "ACTIVE" : "EXPIRED";
    await prisma.member.update({
      where: { id: memberId },
      data: {
        status,
        expiryDate: latest.expiryDate,
        renewalDueDate: latest.expiryDate,
        ...(latest.startDate && { startDate: latest.startDate }),
        ...(latest.packageId && { currentPackageId: latest.packageId }),
      },
    });
    if (status === "ACTIVE") membersSetActive++; else membersSetExpired++;
  }

  return NextResponse.json({ datesUpdated, notFound, noDates, membersSetActive, membersSetExpired });
}
