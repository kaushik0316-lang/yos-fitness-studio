/**
 * POST /api/import/run-full
 * One-shot full clean re-import. Requires { secret } in JSON body.
 * Reads Excel files bundled under scripts/import-data/ at build time.
 *
 * Steps:
 *  1. Delete all payments
 *  2. Delete all IMP-* ghost members
 *  3. Import members from members.xlsx
 *  4. Import Yos Fitness receipts
 *  5. Import Yos Studio receipts
 *  6. Backfill dates on both (and auto-correct bad years)
 *  7. Sync member expiry / status
 *  8. Fix company assignment
 *  9. Fix members with no payments → PROSPECT
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import path from "path";
import fs from "fs";

const SECRET = "yos-reset-2026";

// ── Helpers ───────────────────────────────────────────────────────────────────

function excelDate(serial: unknown): Date | null {
  if (typeof serial === "number" && serial > 1)
    return new Date(Math.round((serial - 25569) * 86400 * 1000));
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

function safeDate(d: Date | null): Date | null {
  if (!d) return null;
  let y = d.getFullYear();
  while (y >= 3000) y -= 1000;
  while (y >= 2100) y -= 100;
  while (y > 2027)  y -= 10;
  if (y < 2005)     y += 20;
  const f = new Date(d); f.setFullYear(y); return f;
}

function normalizeMode(raw: unknown): string {
  const s = String(raw ?? "").trim().toUpperCase().replace(/\s+/g, "");
  if (s.includes("GPAY") || s.includes("PHONEPE") || s.includes("PHONE") || s === "ONLINE" || s === "G/C") return "UPI";
  if (s === "B/T" || s === "BT" || s === "B.T" || s.startsWith("BANK")) return "BANK_TRANSFER";
  if (s === "CARD" || s === "VARD" || s === "CARDS" || s.includes("CARD")) return "CARD";
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

function sigWords(name: string): string[] {
  return name.toUpperCase().replace(/[.\-\/,]/g, " ").split(/\s+/).map(w => w.trim()).filter(w => w.length >= 3);
}

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

function findByName(name: string, idx: Record<string, string[]>, wordsMap: Record<string, string[]>): string | null {
  const rWords = sigWords(name);
  if (!rWords.length) return null;
  const scores: Record<string, number> = {};
  for (const w of rWords) for (const mid of idx[w] ?? []) scores[mid] = (scores[mid] ?? 0) + 1;
  if (!Object.keys(scores).length) return null;
  const top = Math.max(...Object.values(scores));
  const qualified = Object.entries(scores)
    .filter(([, s]) => s === top)
    .filter(([mid]) => {
      const mw = wordsMap[mid] ?? [];
      return top / rWords.length >= 0.5 || top / Math.max(mw.length, 1) >= 0.5;
    });
  return qualified.length === 1 ? qualified[0][0] : null;
}

function readSheet(filePath: string) {
  const buf = fs.readFileSync(filePath);
  const wb  = XLSX.read(buf, { type: "buffer" });
  return XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: "", raw: true });
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  if (body.secret !== SECRET) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const base = path.join(process.cwd(), "scripts", "import-data");
  const log: string[] = [];

  // ── 1. Clean slate ───────────────────────────────────────────────────────────
  const delPayments = await prisma.payment.deleteMany({});
  log.push(`Deleted ${delPayments.count} payments`);

  const delGhosts = await prisma.member.deleteMany({ where: { memberId: { startsWith: "IMP-" } } });
  log.push(`Deleted ${delGhosts.count} ghost members`);

  // ── 2. Import members from Member Master ─────────────────────────────────────
  const memberRows = readSheet(path.join(base, "members.xlsx"));
  const memberBatch: any[] = [];
  let memberSkipped = 0;

  for (let i = 1; i < memberRows.length; i++) {
    const row = memberRows[i] as any[];
    const applNo  = row[0];
    const name    = String(row[1] ?? "").trim().toUpperCase();
    const gender  = String(row[2] ?? "").trim().toUpperCase();
    const dob     = safeDate(excelDate(row[3]));
    const mobile  = String(row[6] ?? "").replace(/\D/g, "").slice(-10);
    const doj     = safeDate(excelDate(row[10])) ?? new Date("2015-01-01");

    if (!name || gender === "CANCELED" || name.includes("CANCEL") || !applNo) { memberSkipped++; continue; }

    memberBatch.push({
      memberId: `YF-${applNo}`,
      fullName: name,
      gender: gender === "MALE" || gender === "M" ? "MALE" : gender === "FEMALE" || gender === "F" ? "FEMALE" : null,
      phone: mobile || "0000000000",
      primaryCompany: "YOS_FITNESS",
      status: "ACTIVE",
      joinDate: doj,
    });
  }

  let memberImported = 0;
  for (let i = 0; i < memberBatch.length; i += 500) {
    const r = await prisma.member.createMany({ data: memberBatch.slice(i, i + 500), skipDuplicates: true });
    memberImported += r.count;
  }
  log.push(`Members: ${memberImported} imported, ${memberSkipped} skipped`);

  // ── 3 & 4. Import receipts for both companies ─────────────────────────────────

  async function importReceipts(file: string, company: string) {
    const rows = readSheet(file);
    const prefix = company === "YOS_FITNESS" ? "YF" : "YFS";

    const allMembers = await prisma.member.findMany({ select: { id: true, memberId: true, phone: true, fullName: true } });
    const byMemberId: Record<string, string> = {};
    const byPhone: Record<string, string>    = {};
    const wordsMap: Record<string, string[]> = {};
    for (const m of allMembers) {
      byMemberId[m.memberId] = m.id;
      if (m.phone && m.phone !== "0000000000") byPhone[m.phone] = m.id;
      wordsMap[m.id] = sigWords(m.fullName);
    }
    const nameIdx = buildNameIndex(allMembers);
    const ghostCounter = { n: 1 };

    // Find next available IMP-N
    const lastGhost = await prisma.member.findFirst({ where: { memberId: { startsWith: "IMP-" } }, orderBy: { memberId: "desc" } });
    if (lastGhost) {
      const n = parseInt(lastGhost.memberId.replace("IMP-", ""), 10);
      if (!isNaN(n)) ghostCounter.n = n + 1;
    }

    // Collect a dummy collectedBy user id
    const adminUser = await prisma.user.findFirst({ where: { role: "ADMIN" } });
    if (!adminUser) throw new Error("No admin user found");

    const toCreate: any[] = [];
    let skipped = 0, ghosts = 0, nameMatched = 0;

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
      const rawBal    = row[12];

      if (!name || !rawAmount) continue;
      const typeStr = String(typeRaw ?? "").trim().toUpperCase();
      if (typeStr === "CANCELLED BILL" || typeStr === "NIL" || typeStr === "NO ") { skipped++; continue; }

      const amount = parseFloat(String(rawAmount)) || 0;
      if (amount <= 0) { skipped++; continue; }

      let memberId: string | null = null;
      if (applNo) memberId = byMemberId[`${prefix}-${applNo}`] ?? null;
      if (!memberId && mobile) memberId = byPhone[mobile] ?? null;
      if (!memberId) {
        const nm = findByName(name, nameIdx, wordsMap);
        if (nm) { memberId = nm; nameMatched++; }
      }
      if (!memberId) {
        // Create ghost
        let gId: string;
        do { gId = `IMP-${ghostCounter.n++}`; } while (byMemberId[gId]);
        const gm = await prisma.member.create({
          data: { memberId: gId, fullName: name, phone: mobile || "0000000000", primaryCompany: company as any, status: "ACTIVE", joinDate: new Date() },
          select: { id: true },
        });
        memberId = gm.id;
        byMemberId[gId] = gm.id;
        if (mobile && mobile !== "0000000000") byPhone[mobile] = gm.id;
        const gw = sigWords(name);
        wordsMap[gm.id] = gw;
        for (const w of gw) { if (!nameIdx[w]) nameIdx[w] = []; nameIdx[w].push(gm.id); }
        ghosts++;
      }

      toCreate.push({
        memberId,
        date:          safeDate(excelDate(rawDate)) ?? new Date(),
        amount,
        pendingAmount: parseFloat(String(rawBal)) || 0,
        discount:      0,
        paymentMode:   normalizeMode(modeRaw),
        paymentType:   normalizeType(typeRaw),
        company,
        collectedById: adminUser.id,
        receiptNumber: receiptNo,
      });
    }

    let imported = 0;
    for (let i = 0; i < toCreate.length; i += 500) {
      const r = await prisma.payment.createMany({ data: toCreate.slice(i, i + 500), skipDuplicates: true });
      imported += r.count;
    }
    return { imported, skipped, nameMatched, ghosts };
  }

  const fitnessResult = await importReceipts(path.join(base, "fitness.xlsx"), "YOS_FITNESS");
  log.push(`Yos Fitness receipts: ${fitnessResult.imported} imported, ${fitnessResult.ghosts} ghosts, ${fitnessResult.nameMatched} name-matched`);

  const studioResult = await importReceipts(path.join(base, "studio.xlsx"), "YOS_FITNESS_STUDIO");
  log.push(`Yos Studio receipts: ${studioResult.imported} imported, ${studioResult.ghosts} ghosts, ${studioResult.nameMatched} name-matched`);

  // ── 5. Backfill dates from both Excel files ───────────────────────────────────

  async function backfillDates(file: string, company: string) {
    const rows = readSheet(file);
    const existing = await prisma.payment.findMany({
      where: { company: company as any, receiptNumber: { not: null } },
      select: { id: true, receiptNumber: true, memberId: true },
    });
    const byReceipt: Record<number, { id: string; memberId: string }> = {};
    for (const p of existing) if (p.receiptNumber !== null) byReceipt[p.receiptNumber] = { id: p.id, memberId: p.memberId };

    let updated = 0;
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i] as any[];
      const receiptNo = typeof row[1] === "number" ? row[1] : null;
      if (!receiptNo) continue;
      const p = byReceipt[receiptNo];
      if (!p) continue;
      const d     = safeDate(excelDate(row[0]));
      const start = safeDate(excelDate(row[9]));
      const end   = safeDate(excelDate(row[10]));
      if (!start || !end) continue;
      const data: any = { startDate: start, expiryDate: end };
      if (d) data.date = d;
      await prisma.payment.update({ where: { id: p.id }, data });
      updated++;
    }
    return updated;
  }

  const bf1 = await backfillDates(path.join(base, "fitness.xlsx"), "YOS_FITNESS");
  const bf2 = await backfillDates(path.join(base, "studio.xlsx"), "YOS_FITNESS_STUDIO");
  log.push(`Backfilled dates: ${bf1} Fitness, ${bf2} Studio`);

  // ── 6. Sync member expiryDate + status ───────────────────────────────────────
  const today = new Date();
  const ghosts2 = await prisma.member.findMany({ where: { memberId: { startsWith: "IMP-" } }, select: { id: true } });
  const ghostIds = ghosts2.map(g => g.id);

  const latestExpiry = await prisma.payment.groupBy({
    by: ["memberId"],
    where: { expiryDate: { not: null }, ...(ghostIds.length > 0 ? { memberId: { notIn: ghostIds } } : {}) },
    _max: { expiryDate: true },
  });

  let setActive = 0, setExpired = 0;
  for (const row of latestExpiry) {
    const exp = row._max.expiryDate;
    if (!exp) continue;
    const status = exp >= today ? "ACTIVE" : "EXPIRED";
    await prisma.member.update({ where: { id: row.memberId }, data: { status, expiryDate: exp } });
    if (status === "ACTIVE") setActive++; else setExpired++;
  }
  log.push(`Status sync: ${setActive} ACTIVE, ${setExpired} EXPIRED`);

  // ── 7. Fix member company from most-recent payment ────────────────────────────
  const allPay = await prisma.payment.findMany({
    where: { receiptNumber: { not: null } },
    select: { memberId: true, company: true, date: true },
    orderBy: { date: "desc" },
  });
  const companyMap: Record<string, string> = {};
  for (const p of allPay) if (!companyMap[p.memberId]) companyMap[p.memberId] = p.company;
  let compFixed = 0;
  for (const [mid, co] of Object.entries(companyMap)) {
    await prisma.member.update({ where: { id: mid }, data: { primaryCompany: co as any } });
    compFixed++;
  }
  log.push(`Company fixed: ${compFixed} members`);

  // ── 8. Members with no payments → PROSPECT ───────────────────────────────────
  const paidIds = (await prisma.payment.findMany({ select: { memberId: true }, distinct: ["memberId"] })).map(p => p.memberId);
  const noPayFix = await prisma.member.updateMany({
    where: { memberId: { not: { startsWith: "IMP-" } }, status: "ACTIVE", expiryDate: null, id: { notIn: paidIds } },
    data: { status: "PROSPECT" },
  });
  log.push(`No-payment members → PROSPECT: ${noPayFix.count}`);

  // ── 9. Fix ghost members → INACTIVE ─────────────────────────────────────────
  const ghostFix = await prisma.member.updateMany({ where: { memberId: { startsWith: "IMP-" } }, data: { status: "INACTIVE" } });
  log.push(`Ghost members → INACTIVE: ${ghostFix.count}`);

  return NextResponse.json({ ok: true, log });
}
