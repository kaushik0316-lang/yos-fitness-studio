/**
 * import-excel.mjs
 * Run: node scripts/import-excel.mjs
 *
 * Imports Member Master + both Receipt files into the CRM database.
 * Safe to run multiple times — upserts members, skips duplicate receipts
 * via transactionRef.
 */

import { createRequire } from "module";
import { PrismaClient } from "@prisma/client";

const require = createRequire(import.meta.url);
const XLSX = require("xlsx");

const prisma = new PrismaClient();

// ── Config ───────────────────────────────────────────────────────────────────
const FILES = {
  members:   "C:/Users/kaush/Downloads/Member Master (1).xlsx",
  receipts1: "C:/Users/kaush/Downloads/Yos fitness receipts-DESKTOP-P9VK7B2 (1).xlsx",
  receipts2: "C:/Users/kaush/Downloads/Yos fitness Studio Receipts-DESKTOP-P9VK7B2 (1).xlsx",
};

const ADMIN_USER_ID = "cmo7dphym0000tz2j4yxmpc34"; // Yos Admin

// ── Helpers ──────────────────────────────────────────────────────────────────

function excelDateToJS(serial) {
  if (!serial || typeof serial !== "number") return null;
  const utc = (serial - 25569) * 86400 * 1000;
  const d = new Date(utc);
  if (isNaN(d.getTime()) || d.getFullYear() < 1990 || d.getFullYear() > 2050) return null;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function parseDate(val) {
  if (!val) return null;
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    return new Date(Date.UTC(val.getUTCFullYear(), val.getUTCMonth(), val.getUTCDate()));
  }
  if (typeof val === "number") return excelDateToJS(val);
  if (typeof val === "string") {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

function cleanPhone(raw) {
  if (!raw) return null;
  const s = String(raw).replace(/[^\d]/g, "");
  const m = s.match(/\d{10}/);
  return m ? m[0] : (s.length >= 8 ? s.slice(0, 10) : null);
}

function normalizePaymentMode(raw) {
  if (!raw) return "CASH";
  const s = String(raw).toUpperCase().trim();
  if (s.includes("GPAY") || s.includes("PHONEPE") || s.includes("PHONE PE") ||
      s.includes("PHONEPEE") || s.includes("ONLINE") || s.includes("PH PE") ||
      s.includes("P/PE") || s.includes("G/C") || s.includes("UPI")) return "UPI";
  if (s.includes("CARD") || s === "VARD" || s === "CARDS" || s === "CAR") return "CARD";
  if (s.includes("CHEQUE")) return "CHEQUE";
  if (s.includes("BANK") || s === "B/T" || s === "B.T" || s === "BT" || s === "BANK/T") return "BANK_TRANSFER";
  if (s === "FREE" || s === "NIL" || s === "0") return "FREE";
  return "CASH";
}

function normalizePaymentType(raw) {
  if (!raw) return "RENEWAL";
  const s = String(raw).toUpperCase().trim();
  if (s === "ADM" || s.startsWith("ADM")) return "ADMISSION";
  if (s === "BAL") return "BALANCE";
  return "RENEWAL";
}

function parseDurationDays(raw) {
  if (!raw) return null;
  const s = String(raw).toUpperCase().replace(/\s/g, "");
  const m = s.match(/^(\d+)/);
  if (!m) return null;
  const n = parseInt(m[1]);
  if (n === 1) return 30;
  if (n === 2) return 60;
  if (n === 3) return 90;
  if (n === 4) return 120;
  if (n === 6) return 180;
  if (n === 12) return 365;
  if (n === 24) return 730;
  return null;
}

function cleanName(raw) {
  if (!raw) return null;
  return String(raw).trim().replace(/\s+/g, " ")
    .split(" ")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function readSheet(filePath, sheetIndex = 0) {
  const wb = XLSX.readFile(filePath, { cellDates: false, raw: true });
  const ws = wb.Sheets[wb.SheetNames[sheetIndex]];
  return XLSX.utils.sheet_to_json(ws, { defval: null, raw: true });
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("=".repeat(60));
  console.log("YOS CRM — Excel Import");
  console.log("=".repeat(60));

  // Load packages from DB, keyed by durationDays_company
  const dbPackages = await prisma.package.findMany();
  const packageMap = {};
  for (const pkg of dbPackages) {
    const company = pkg.name.includes("Studio") ? "YOS_FITNESS_STUDIO" : "YOS_FITNESS";
    packageMap[`${pkg.durationDays}_${company}`] = pkg;
  }

  function pickPackage(durationDays, company) {
    if (!durationDays) return null;
    return packageMap[`${durationDays}_${company}`]
        ?? packageMap[`${durationDays}_YOS_FITNESS`]
        ?? null;
  }

  // Load existing payment transactionRefs to skip duplicates
  const existingRefs = new Set(
    (await prisma.payment.findMany({ select: { transactionRef: true } }))
      .map(p => p.transactionRef)
      .filter(Boolean)
  );

  // ── 1. Import Members ───────────────────────────────────────────────────
  console.log("\n── Step 1: Importing members...");

  // Sheet1 is index 1 (index 0 = Chart1 which is empty)
  let masterRows;
  try {
    masterRows = readSheet(FILES.members, 1);
  } catch {
    masterRows = readSheet(FILES.members, 0);
  }

  let membersCreated = 0, membersUpdated = 0, membersSkipped = 0;
  const membersByAppNo = new Map();

  for (const row of masterRows) {
    const appNo = row["APPLICATION NUMBER"];
    if (!appNo || isNaN(Number(appNo))) { membersSkipped++; continue; }

    const name = cleanName(row["NAME"]);
    if (!name) { membersSkipped++; continue; }

    const phone   = cleanPhone(row["MOBILE"]);
    const memberId = `YF-${String(Math.round(Number(appNo))).padStart(3, "0")}`;
    const gender   = row["GENDER"] === "M" ? "MALE" : row["GENDER"] === "F" ? "FEMALE" : null;
    const dob      = parseDate(row["DATE OF BIRTH"]);
    const joinDate = parseDate(row["DOJ"]) ?? new Date();

    const updateData = {
      fullName: name,
      ...(phone && { phone }),
      ...(gender && { gender }),
      ...(dob && { dateOfBirth: dob }),
      ...(row["ADDRESS"] && { address: String(row["ADDRESS"]).trim() }),
      ...(row["EMAIL"] && { email: String(row["EMAIL"]).trim().toLowerCase() }),
      ...(row["WEIGHT"] && !isNaN(Number(row["WEIGHT"])) && { weight: Number(row["WEIGHT"]) }),
      ...(row["HEIGHT"] && !isNaN(Number(row["HEIGHT"])) && { height: Number(row["HEIGHT"]) }),
      ...(row["PURPOSE"] && { intentionOfJoining: String(row["PURPOSE"]).trim() }),
    };

    try {
      const existing = await prisma.member.findUnique({ where: { memberId } });
      if (existing) {
        await prisma.member.update({ where: { memberId }, data: updateData });
        membersByAppNo.set(Number(appNo), existing.id);
        membersUpdated++;
      } else {
        const created = await prisma.member.create({
          data: {
            memberId,
            fullName: name,
            phone: phone ?? "0000000000",
            joinDate,
            status: "INACTIVE",
            ...updateData,
          },
        });
        membersByAppNo.set(Number(appNo), created.id);
        membersCreated++;
      }
    } catch (e) {
      console.warn(`  ⚠ ${memberId} (${name}): ${e.message.slice(0, 80)}`);
      membersSkipped++;
    }
  }
  console.log(`  ✓ Created: ${membersCreated} | Updated: ${membersUpdated} | Skipped: ${membersSkipped}`);

  // Build phone → member.id map
  const allMembers = await prisma.member.findMany({ select: { id: true, phone: true, whatsapp: true } });
  const membersByPhone = new Map();
  for (const m of allMembers) {
    if (m.phone) membersByPhone.set(m.phone, m.id);
    if (m.whatsapp) membersByPhone.set(m.whatsapp, m.id);
  }

  // ── 2. Import Receipts ──────────────────────────────────────────────────
  const receiptFiles = [
    { path: FILES.receipts1, company: "YOS_FITNESS",        label: "Receipts File 1 (Yos Fitness)" },
    { path: FILES.receipts2, company: "YOS_FITNESS_STUDIO", label: "Receipts File 2 (Yos Studio)" },
  ];

  const latestMembership = new Map(); // memberId → { expiryDate, startDate, packageId }

  for (const { path, company, label } of receiptFiles) {
    console.log(`\n── Step 2: Importing ${label}...`);
    const rows = readSheet(path, 0);

    let created = 0, skipped = 0, unmatched = 0;

    for (const row of rows) {
      const typeRaw = String(row["TYPE"] ?? "").toUpperCase().trim();
      if (["CANCELLED BILL", "FREE", "NIL", "NO"].includes(typeRaw)) { skipped++; continue; }

      const receiptNoRaw = row["RECEIPT NO."] ?? row["RECEIPT NO"];
      const receiptNo    = receiptNoRaw ? parseInt(String(receiptNoRaw).trim()) : null;
      const amount       = Number(row["AMOUNT"] ?? 0);
      if (!receiptNo || isNaN(receiptNo) || isNaN(amount) || amount < 0) { skipped++; continue; }

      const startDate  = parseDate(row["START"]);
      const expiryDate = parseDate(row["END"]);
      const payDate    = parseDate(row["DATE"]) ?? startDate ?? new Date();

      // Unique ref to detect duplicates on re-run
      const txRef = `${company === "YOS_FITNESS" ? "YF" : "YFS"}-${receiptNo}`;
      if (existingRefs.has(txRef)) { skipped++; continue; }

      // Find member — try APPL NO first, then mobile
      const applNoRaw = row["APPL NO."] ?? row["APPL. NO"] ?? row["APPL NO"];
      let memberId = null;
      if (applNoRaw && !isNaN(Number(applNoRaw))) {
        memberId = membersByAppNo.get(Math.round(Number(applNoRaw)));
      }
      if (!memberId) {
        const phone = cleanPhone(row["MOBILE"]);
        if (phone) memberId = membersByPhone.get(phone);
      }
      if (!memberId) { unmatched++; continue; }

      const durRaw = row["DURATION"] ?? row["DURATION "] ?? null;
      const durationDays = parseDurationDays(durRaw);
      const pkg = pickPackage(durationDays, company);

      try {
        await prisma.payment.create({
          data: {
            memberId,
            receiptNumber: receiptNo,
            transactionRef: txRef,
            amount,
            paymentMode: normalizePaymentMode(row["MODE OF PAYMENT"]),
            paymentType: normalizePaymentType(typeRaw),
            date: payDate,
            ...(startDate && { startDate }),
            ...(expiryDate && { expiryDate }),
            ...(pkg && { packageId: pkg.id }),
            company,
            collectedById: ADMIN_USER_ID,
            notes: `Imported. Package: ${row["PACKAGE"] ?? ""} | Duration: ${durRaw ?? ""}`,
          },
        });

        existingRefs.add(txRef);

        if (expiryDate) {
          const ex = latestMembership.get(memberId);
          if (!ex || expiryDate > ex.expiryDate) {
            latestMembership.set(memberId, { expiryDate, startDate, packageId: pkg?.id ?? null });
          }
        }

        created++;
      } catch (e) {
        if (!e.message.includes("Unique constraint")) {
          console.warn(`  ⚠ Receipt ${txRef}: ${e.message.slice(0, 80)}`);
        }
        skipped++;
      }
    }

    console.log(`  ✓ Imported: ${created} | Skipped: ${skipped} | Unmatched (no member): ${unmatched}`);
  }

  // ── 3. Update member status & expiry ────────────────────────────────────
  console.log("\n── Step 3: Updating member status from receipts...");
  const today = new Date();
  let activated = 0, expired = 0;

  for (const [memberId, { expiryDate, startDate, packageId }] of latestMembership) {
    const status = expiryDate >= today ? "ACTIVE" : "EXPIRED";
    await prisma.member.update({
      where: { id: memberId },
      data: {
        status,
        expiryDate,
        renewalDueDate: expiryDate,
        ...(startDate && { startDate }),
        ...(packageId && { currentPackageId: packageId }),
      },
    });
    if (status === "ACTIVE") activated++; else expired++;
  }
  console.log(`  ✓ Active: ${activated} | Expired: ${expired}`);

  // ── Summary ─────────────────────────────────────────────────────────────
  const [totalMembers, totalPayments] = await Promise.all([
    prisma.member.count(),
    prisma.payment.count(),
  ]);

  console.log("\n" + "=".repeat(60));
  console.log("Import complete!");
  console.log(`  Total members in DB : ${totalMembers}`);
  console.log(`  Total payments in DB: ${totalPayments}`);
  console.log("=".repeat(60));
}

main()
  .catch((e) => { console.error("\nFatal error:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
