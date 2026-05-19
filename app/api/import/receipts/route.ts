import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

function excelDate(serial: unknown): Date | null {
  if (typeof serial !== "number" || serial < 1) return null;
  return new Date(Math.round((serial - 25569) * 86400 * 1000));
}

function normalizeMode(raw: unknown): string {
  const s = String(raw ?? "").trim().toUpperCase().replace(/\s+/g, "");
  if (s.includes("GPAY") || s.includes("PHONEPE") || s.includes("PHONEPEE") || s.includes("PHONE") || s === "ONLINE" || s === "G/C")
    return "UPI";
  if (s === "B/T" || s === "BT" || s === "B.T" || s.startsWith("BANK") || s === "BANKTR" || s === "BANK/T" || s === "BANK/TR")
    return "BANK_TRANSFER";
  if (s === "CARD" || s === "VARD" || s === "CARDS" || s === "SAMECARD" || s === "CARD/CASH" || s === "CASH/CARD")
    return "CARD";
  if (s === "CHEQUE") return "CHEQUE";
  if (s === "FREE" || s === "NIL") return "FREE";
  return "CASH";
}

function normalizeType(raw: unknown): string {
  const s = String(raw ?? "").trim().toUpperCase();
  if (s.startsWith("ADM")) return "ADMISSION";
  if (s.startsWith("REN")) return "RENEWAL";
  if (s.startsWith("BAL")) return "BALANCE";
  return "ADMISSION";
}

// Generate a unique member ID not already in the DB
async function createGhostMember(
  name: string,
  phone: string,
  company: string,
  byPhone: Record<string, string>,
  byMemberId: Record<string, string>,
  ghostCounter: { n: number }
): Promise<string> {
  // Re-check by phone (may have been created earlier in this run)
  if (phone && phone !== "0000000000" && byPhone[phone]) return byPhone[phone];

  // Generate a unique ghost memberId
  let memberId: string;
  do {
    memberId = `IMP-${ghostCounter.n++}`;
  } while (byMemberId[memberId]);

  const member = await prisma.member.create({
    data: {
      memberId,
      fullName: name || "UNKNOWN",
      phone: phone || "0000000000",
      primaryCompany: company as any,
      status: "ACTIVE",
      joinDate: new Date(),
    },
    select: { id: true },
  });

  byMemberId[memberId] = member.id;
  if (phone && phone !== "0000000000") byPhone[phone] = member.id;
  return member.id;
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

  const userId = session.user.id;
  const buffer = Buffer.from(await file.arrayBuffer());
  const wb = XLSX.read(buffer, { type: "buffer" });
  const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[wb.SheetNames[0]], {
    header: 1, defval: "", raw: true,
  });

  // ── Build lookup maps ──────────────────────────────────────────────────────
  const [allMembers, existingReceipts] = await Promise.all([
    prisma.member.findMany({ select: { id: true, memberId: true, phone: true } }),
    prisma.payment.findMany({
      where: { company: company as any, receiptNumber: { not: null } },
      select: { receiptNumber: true },
    }),
  ]);

  const byMemberId: Record<string, string> = {};
  const byPhone: Record<string, string> = {};
  for (const m of allMembers) {
    byMemberId[m.memberId] = m.id;
    if (m.phone) byPhone[m.phone] = m.id;
  }

  const prefix = company === "YOS_FITNESS" ? "YF" : "YFS";
  const existingReceiptNos = new Set(existingReceipts.map((r) => r.receiptNumber));
  const seenReceiptNos = new Set<number>();

  // Counter for auto-created ghost member IDs
  const ghostCounter = { n: 1 };

  let imported = 0, skipped = 0, errors = 0, created = 0;
  const warnings: string[] = [];
  const toCreate: any[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as any[];

    const rawDate   = row[0];
    const receiptNo = typeof row[1] === "number" ? row[1] : null;
    const name      = String(row[2] ?? "").trim().toUpperCase();
    const rawMobile = String(row[3] ?? "").replace(/\D/g, "");
    const mobile    = rawMobile.length >= 10 ? rawMobile.slice(-10) : rawMobile;
    const applNo    = row[4];
    const typeRaw   = row[5];
    const modeRaw   = row[6];
    const rawAmount = row[11];
    const rawBalance = row[12];

    if (!name || !rawAmount) continue;

    const typeStr = String(typeRaw ?? "").trim().toUpperCase();
    if (typeStr === "CANCELLED BILL" || typeStr === "NIL" || typeStr === "NO ") {
      skipped++; continue;
    }

    if (receiptNo !== null) {
      if (existingReceiptNos.has(receiptNo) || seenReceiptNos.has(receiptNo)) {
        skipped++; continue;
      }
      seenReceiptNos.add(receiptNo);
    }

    const amount  = parseFloat(String(rawAmount)) || 0;
    const balance = parseFloat(String(rawBalance)) || 0;
    if (amount <= 0) { skipped++; continue; }

    // ── Member lookup ────────────────────────────────────────────────────────
    let memberId: string | null = null;

    if (applNo) memberId = byMemberId[`${prefix}-${applNo}`] ?? null;
    if (!memberId && mobile) memberId = byPhone[mobile] ?? null;

    // Not found → create a ghost member so the receipt is never lost
    if (!memberId) {
      try {
        memberId = await createGhostMember(name, mobile, company, byPhone, byMemberId, ghostCounter);
        created++;
        warnings.push(`Row ${i + 1}: Receipt #${receiptNo} "${name}" — no match found, created new member ${memberId}`);
      } catch (e: any) {
        errors++;
        warnings.push(`Row ${i + 1}: Receipt #${receiptNo} "${name}" — could not create member: ${e.message}`);
        continue;
      }
    }

    const date = excelDate(rawDate) ?? new Date();

    toCreate.push({
      memberId,
      date,
      amount,
      pendingAmount: balance,
      discount: 0,
      paymentMode: normalizeMode(modeRaw),
      paymentType: normalizeType(typeRaw),
      company,
      collectedById: userId,
      receiptNumber: receiptNo,
      notes: null,
    });
  }

  // Insert in batches of 500
  for (let i = 0; i < toCreate.length; i += 500) {
    try {
      const batch = toCreate.slice(i, i + 500);
      const result = await prisma.payment.createMany({ data: batch, skipDuplicates: true });
      imported += result.count;
    } catch (e: any) {
      errors++;
      warnings.push(`Batch ${Math.floor(i / 500) + 1} error: ${e.message}`);
    }
  }

  return NextResponse.json({
    imported,
    skipped,
    membersCreated: created,
    errors,
    total: toCreate.length,
    warnings: warnings.slice(0, 100),
  });
}
