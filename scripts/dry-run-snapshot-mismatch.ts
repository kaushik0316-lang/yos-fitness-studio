// scripts/dry-run-snapshot-mismatch.ts  (optimized bulk-fetch)
// READ-ONLY — no DB writes whatsoever.
// Fetches all members and all A/R payments in two bulk queries,
// groups and compares in memory — avoids Neon connection drops.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const today = new Date();
today.setHours(0, 0, 0, 0);

function fmtDate(d: Date | null | undefined): string {
  if (!d) return "null";
  return new Date(d).toISOString().slice(0, 10);
}

function expectedStatus(expiryDate: Date | null | undefined): string {
  if (!expiryDate) return "EXPIRED";
  return new Date(expiryDate) >= today ? "ACTIVE" : "EXPIRED";
}

async function main() {
  console.log("\nSnapshot Mismatch Dry-Run (optimized bulk-fetch)\n");

  // ── 1. Bulk-fetch all members ─────────────────────────────────────────────
  console.log("Fetching all members...");
  const members = await prisma.member.findMany({
    select: {
      id:         true,
      memberId:   true,
      fullName:   true,
      startDate:  true,
      expiryDate: true,
      status:     true,
    },
    orderBy: { fullName: "asc" },
  });
  console.log(`  ${members.length} members loaded.`);

  // ── 2. Bulk-fetch all ADMISSION/RENEWAL payments ──────────────────────────
  console.log("Fetching all Admission/Renewal payments...");
  const allPayments = await prisma.payment.findMany({
    where: { paymentType: { in: ["ADMISSION", "RENEWAL"] } },
    select: {
      memberId:      true,
      receiptNumber: true,
      paymentType:   true,
      categoryLabel: true,
      periodLabel:   true,
      startDate:     true,
      expiryDate:    true,
      company:       true,
      date:          true,
    },
    orderBy: [
      { expiryDate: "desc" },
      { date:       "desc" },
    ],
  });
  console.log(`  ${allPayments.length} A/R payments loaded.`);

  // ── 3. Group by memberId — first entry per member = latest (already sorted) ──
  const latestByMember = new Map<string, typeof allPayments[0]>();
  for (const p of allPayments) {
    if (!latestByMember.has(p.memberId)) {
      latestByMember.set(p.memberId, p);
    }
  }
  console.log(`  ${latestByMember.size} members have at least one A/R payment.\n`);

  // ── 4. Compare in memory ──────────────────────────────────────────────────
  let mismatches = 0;
  let noPayments = 0;
  let ok         = 0;

  const rows: any[]      = [];
  let   spotlightRow: any = null;

  for (const member of members) {
    const latest = latestByMember.get(member.id);

    if (!latest) {
      noPayments++;
      if (member.memberId === "YF-1735") {
        spotlightRow = { member, latest: null, reasons: ["No A/R payments found"], mismatch: false };
      }
      continue;
    }

    const mStart  = fmtDate(member.startDate);
    const mExpiry = fmtDate(member.expiryDate);
    const pStart  = fmtDate(latest.startDate);
    const pExpiry = fmtDate(latest.expiryDate);
    const expStatus = expectedStatus(latest.expiryDate);

    const reasons: string[] = [];
    if (mStart  !== pStart)        reasons.push(`startDate: ${mStart} -> ${pStart}`);
    if (mExpiry !== pExpiry)       reasons.push(`expiryDate: ${mExpiry} -> ${pExpiry}`);
    if (member.status !== expStatus) reasons.push(`status: ${member.status} -> ${expStatus}`);

    const isMismatch = reasons.length > 0;

    // Always capture spotlight
    if (member.memberId === "YF-1735") {
      spotlightRow = { member, latest, reasons, mismatch: isMismatch };
    }

    if (!isMismatch) { ok++; continue; }

    mismatches++;
    rows.push({
      memberName:      member.fullName,
      memberId:        member.memberId,
      currentStart:    mStart,
      expectedStart:   pStart,
      currentExpiry:   mExpiry,
      expectedExpiry:  pExpiry,
      currentStatus:   member.status,
      expectedStatus:  expStatus,
      latestReceiptNo: `#${latest.receiptNumber ?? "—"}`,
      paymentType:     latest.paymentType,
      category:        latest.categoryLabel ?? "—",
      period:          latest.periodLabel   ?? "—",
      company:         latest.company,
      reasons:         reasons.join(" | "),
    });
  }

  // ── 5. Summary ────────────────────────────────────────────────────────────
  console.log("════════════════════════════════════════════════════════════");
  console.log("DRY-RUN SUMMARY — Snapshot Mismatches");
  console.log("════════════════════════════════════════════════════════════");
  console.log(`Total members checked:     ${members.length}`);
  console.log(`No A/R payments (skip):    ${noPayments}`);
  console.log(`Snapshot OK:               ${ok}`);
  console.log(`MISMATCHES FOUND:          ${mismatches}`);

  if (rows.length > 0) {
    console.log("\nMISMATCHED MEMBERS:");
    console.table(rows);
  } else {
    console.log("\nNo mismatches found. ✓");
  }

  // ── 6. Spotlight: Nithya Kalyani V / YF-1735 ─────────────────────────────
  console.log("\n────────────────────────────────────────────────────────────");
  console.log("SPOTLIGHT: Nithya Kalyani V / YF-1735 / receipt #2557");
  console.log("────────────────────────────────────────────────────────────");
  if (!spotlightRow) {
    console.log("YF-1735 not found in member list.");
  } else if (!spotlightRow.latest) {
    console.log("YF-1735 has no A/R payments.");
  } else {
    const { member: s, latest: l, reasons, mismatch } = spotlightRow;
    console.log(`Member:           ${s.fullName} (${s.memberId})`);
    console.log(`Current start:    ${fmtDate(s.startDate)}`);
    console.log(`Expected start:   ${fmtDate(l.startDate)}`);
    console.log(`Current expiry:   ${fmtDate(s.expiryDate)}`);
    console.log(`Expected expiry:  ${fmtDate(l.expiryDate)}`);
    console.log(`Current status:   ${s.status}`);
    console.log(`Expected status:  ${expectedStatus(l.expiryDate)}`);
    console.log(`Latest receipt:   #${l.receiptNumber ?? "—"}`);
    console.log(`Payment type:     ${l.paymentType}`);
    console.log(`Category/period:  ${l.categoryLabel ?? "—"} / ${l.periodLabel ?? "—"}`);
    console.log(`Company:          ${l.company}`);
    console.log(`Mismatch:         ${mismatch ? "YES — snapshot is stale" : "NO — snapshot matches ✓"}`);
    console.log(`Reasons:          ${reasons.length > 0 ? reasons.join(" | ") : "none"}`);
    console.log(`Receipt #2557 is latest? ${l.receiptNumber === 2557 ? "YES ✓" : "NO ✗ — different receipt is latest"}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
