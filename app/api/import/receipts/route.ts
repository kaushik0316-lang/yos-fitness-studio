import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

function excelDate(serial: unknown): Date | null {
  // Numeric Excel serial (most cells)
  if (typeof serial === "number" && serial > 1) {
    return new Date(Math.round((serial - 25569) * 86400 * 1000));
  }
  // Text date — common Indian formats: DD/MM/YYYY, DD-MM-YYYY, D/M/YY
  if (typeof serial === "string" && serial.trim()) {
    const s = serial.trim();
    const m = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
    if (m) {
      const day = parseInt(m[1], 10);
      const mon = parseInt(m[2], 10) - 1;
      let yr  = parseInt(m[3], 10);
      if (yr < 100) yr += yr < 50 ? 2000 : 1900;
      const d = new Date(yr, mon, day);
      if (!isNaN(d.getTime())) return d;
    }
  }
  return null;
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

// ── Name matching helpers ─────────────────────────────────────────────────────
// Extract meaningful words: strip dots/slashes, keep words ≥ 3 chars
function sigWords(name: string): string[] {
  return name
    .toUpperCase()
    .replace(/[.\-\/,]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 3);
}

// Build inverted index: word → Set of member DB ids
function buildNameIndex(members: { id: string; fullName: string }[]): Record<string, string[]> {
  const idx: Record<string, string[]> = {};
  for (const m of members) {
    for (const w of sigWords(m.fullName)) {
      if (!idx[w]) idx[w] = [];
      idx[w].push(m.id);
    }
  }
  return idx;
}

// Find best member match by name.
// Returns member DB id if exactly one candidate has the highest overlap (≥ 1 word),
// and that candidate is not tied with another. Returns null if ambiguous or no match.
function findByName(
  receiptName: string,
  nameIndex: Record<string, string[]>,
  memberWordsMap: Record<string, string[]>   // memberId → sigWords
): string | null {
  const rWords = sigWords(receiptName);
  if (rWords.length === 0) return null;

  // Score each member
  const scores: Record<string, number> = {};
  for (const w of rWords) {
    for (const mid of nameIndex[w] ?? []) {
      scores[mid] = (scores[mid] ?? 0) + 1;
    }
  }

  if (Object.keys(scores).length === 0) return null;

  const topScore = Math.max(...Object.values(scores));
  const topCandidates = Object.entries(scores).filter(([, s]) => s === topScore);

  // Require at least 1 word match, and the match must cover ≥ 50% of the
  // receipt name words OR ≥ 50% of the member name words (handles subsets)
  if (topScore < 1) return null;

  const qualified = topCandidates.filter(([mid]) => {
    const mWords = memberWordsMap[mid] ?? [];
    const coverageByReceipt = topScore / rWords.length;          // how much of receipt matched
    const coverageByMember  = topScore / Math.max(mWords.length, 1); // how much of member matched
    return coverageByReceipt >= 0.5 || coverageByMember >= 0.5;
  });

  // Only return a match when there's exactly one confident candidate
  if (qualified.length === 1) return qualified[0][0];

  return null; // ambiguous
}

/** Replace dots, slashes, commas etc. with a space and collapse whitespace */
function cleanName(raw: string): string {
  return raw.replace(/[.\-\/,;()_\\]/g, " ").replace(/\s+/g, " ").trim().toUpperCase();
}

// ── Ghost member creation ─────────────────────────────────────────────────────
async function createGhostMember(
  name: string,
  phone: string,
  company: string,
  byPhone: Record<string, string>,
  byMemberId: Record<string, string>,
  ghostCounter: { n: number }
): Promise<string> {
  if (phone && phone !== "0000000000" && byPhone[phone]) return byPhone[phone];

  let memberId: string;
  do { memberId = `IMP-${ghostCounter.n++}`; } while (byMemberId[memberId]);

  const member = await prisma.member.create({
    data: {
      memberId,
      fullName: cleanName(name) || "UNKNOWN",
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

// ─────────────────────────────────────────────────────────────────────────────

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

  // ── Load all members + build indexes ────────────────────────────────────────
  const [allMembers, existingReceipts] = await Promise.all([
    prisma.member.findMany({ select: { id: true, memberId: true, phone: true, fullName: true } }),
    prisma.payment.findMany({
      where: { company: company as any, receiptNumber: { not: null } },
      select: { receiptNumber: true },
    }),
  ]);

  const byMemberId: Record<string, string> = {};
  const byPhone: Record<string, string>    = {};
  const memberWordsMap: Record<string, string[]> = {};

  for (const m of allMembers) {
    byMemberId[m.memberId] = m.id;
    if (m.phone) byPhone[m.phone] = m.id;
    memberWordsMap[m.id] = sigWords(m.fullName);
  }

  const nameIndex = buildNameIndex(allMembers);
  const prefix = company === "YOS_FITNESS" ? "YF" : "YFS";
  const existingReceiptNos = new Set(existingReceipts.map((r) => r.receiptNumber));
  const seenReceiptNos = new Set<number>();
  const ghostCounter = { n: 1 };

  let imported = 0, skipped = 0, errors = 0, ghostCreated = 0, nameMatched = 0;
  const warnings: string[] = [];
  const toCreate: any[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as any[];

    const rawDate      = row[0];
    const receiptNo    = typeof row[1] === "number" ? row[1] : null;
    const name         = String(row[2] ?? "").trim().toUpperCase();
    const rawMobile    = String(row[3] ?? "").replace(/\D/g, "");
    const mobile       = rawMobile.length >= 10 ? rawMobile.slice(-10) : rawMobile;
    const applNo       = row[4];
    const typeRaw      = row[5];
    const modeRaw      = row[6];
    const packageLabel = String(row[7] ?? "").trim() || null;   // PACKAGE column
    // row[8] = DURATION (text label, not used for matching)
    const rawStart     = row[9];   // START date
    const rawEnd       = row[10];  // END date
    const rawAmount    = row[11];
    const rawBalance   = row[12];

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

    // ── 1. By application number ─────────────────────────────────────────────
    let memberId: string | null = null;
    if (applNo) memberId = byMemberId[`${prefix}-${applNo}`] ?? null;

    // ── 2. By phone ──────────────────────────────────────────────────────────
    if (!memberId && mobile) memberId = byPhone[mobile] ?? null;

    // ── 3. By fuzzy name matching ────────────────────────────────────────────
    if (!memberId) {
      const nameMatch = findByName(name, nameIndex, memberWordsMap);
      if (nameMatch) {
        memberId = nameMatch;
        nameMatched++;
      }
    }

    // ── 4. Last resort: create a ghost member ────────────────────────────────
    if (!memberId) {
      try {
        memberId = await createGhostMember(name, mobile, company, byPhone, byMemberId, ghostCounter);
        // Update name index so later rows can match this ghost
        const gWords = sigWords(name);
        memberWordsMap[memberId] = gWords;
        for (const w of gWords) {
          if (!nameIndex[w]) nameIndex[w] = [];
          nameIndex[w].push(memberId);
        }
        ghostCreated++;
      } catch (e: any) {
        errors++;
        warnings.push(`Row ${i + 1}: "${name}" — could not create member: ${e.message}`);
        continue;
      }
    }

    toCreate.push({
      memberId,
      date:          excelDate(rawDate) ?? new Date(),
      amount,
      pendingAmount: balance,
      discount:      0,
      paymentMode:   normalizeMode(modeRaw),
      paymentType:   normalizeType(typeRaw),
      company,
      collectedById: userId,
      receiptNumber: receiptNo,
      categoryLabel: packageLabel,
      startDate:     excelDate(rawStart),
      expiryDate:    excelDate(rawEnd),
      notes:         null,
    });
  }

  // ── Batch insert ─────────────────────────────────────────────────────────────
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
    nameMatched,
    ghostCreated,
    errors,
    warnings: warnings.slice(0, 100),
  });
}
