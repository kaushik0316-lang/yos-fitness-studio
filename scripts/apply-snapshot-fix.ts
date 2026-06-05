// scripts/apply-snapshot-fix.ts  (optimized)
// Applies member snapshot corrections derived from each member's latest
// ADMISSION or RENEWAL payment.
//
// IMPORTANT: Run scripts/snapshot-backup.ts FIRST to save a rollback file.
//
// Optimization: fetches ALL members and ALL A/R payments in two bulk queries,
// then processes everything in memory. Updates in batches of 50 to avoid
// connection drops on Neon serverless.
//
// Fields updated per member (only when mismatched):
//   startDate, expiryDate, renewalDueDate, status
//   currentPackageId — only if latestPayment.packageId is non-null
//
// Members with NO ADMISSION/RENEWAL payments are never touched.
// Payments, receipts, Membership rows, and schema are never changed.

import { PrismaClient, Prisma, MemberStatus } from "@prisma/client";

const prisma = new PrismaClient();
const BATCH_SIZE = 50;

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
  console.log("\nApply Snapshot Fix (optimized batch mode)");
  console.log("==========================================");
  console.log("WARNING: This script writes to the database.\n");

  // ── Step 1: Bulk-fetch all members ───────────────────────────────────────
  console.log("Fetching all members...");
  const members = await prisma.member.findMany({
    select: {
      id:               true,
      memberId:         true,
      fullName:         true,
      startDate:        true,
      expiryDate:       true,
      renewalDueDate:   true,
      status:           true,
      currentPackageId: true,
    },
    orderBy: { fullName: "asc" },
  });
  console.log(`  ${members.length} members loaded.`);

  // ── Step 2: Bulk-fetch all ADMISSION/RENEWAL payments ────────────────────
  console.log("Fetching all Admission/Renewal payments...");
  const allPayments = await prisma.payment.findMany({
    where: {
      paymentType: { in: ["ADMISSION", "RENEWAL"] },
    },
    select: {
      memberId:      true,
      receiptNumber: true,
      paymentType:   true,
      startDate:     true,
      expiryDate:    true,
      packageId:     true,
      date:          true,
      company:       true,
    },
    orderBy: [
      { expiryDate: "desc" },
      { date:       "desc" },
    ],
  });
  console.log(`  ${allPayments.length} A/R payments loaded.`);

  // ── Step 3: Group payments by memberId, keep only the first (latest) ──────
  const latestPaymentByMember = new Map<string, typeof allPayments[0]>();
  for (const p of allPayments) {
    if (!latestPaymentByMember.has(p.memberId)) {
      latestPaymentByMember.set(p.memberId, p); // already sorted desc — first = latest
    }
  }
  console.log(`  ${latestPaymentByMember.size} members have at least one A/R payment.\n`);

  // ── Step 4: Identify mismatches in memory ─────────────────────────────────
  type UpdateItem = {
    id:               string;
    memberId:         string;
    fullName:         string;
    oldExpiry:        string;
    newExpiry:        string;
    oldStatus:        string;
    newStatus:        string;
    oldStart:         string;
    newStart:         string;
    packageId:        string | null;
    preservePkgId:    boolean;
    currentPackageId: string | null;
    receiptNo:        number | null;
    data: Prisma.MemberUpdateInput;
  };

  const toUpdate: UpdateItem[] = [];
  let skipped = 0;
  let alreadyOk = 0;

  for (const member of members) {
    const latest = latestPaymentByMember.get(member.id);
    if (!latest) { skipped++; continue; }

    const pStart  = fmtDate(latest.startDate);
    const pExpiry = fmtDate(latest.expiryDate);
    const mStart  = fmtDate(member.startDate);
    const mExpiry = fmtDate(member.expiryDate);
    const expStatus = expectedStatus(latest.expiryDate);

    const isMismatch =
      mStart !== pStart ||
      mExpiry !== pExpiry ||
      member.status !== expStatus;

    if (!isMismatch) { alreadyOk++; continue; }

    const updateData: Prisma.MemberUpdateInput = {
      startDate:      latest.startDate  ?? null,
      expiryDate:     latest.expiryDate ?? null,
      renewalDueDate: latest.expiryDate ?? null,
      status:         expStatus as MemberStatus,
    };

    // Only set currentPackageId if payment has one; otherwise preserve
    if (latest.packageId !== null && latest.packageId !== undefined) {
      updateData.currentPackage = { connect: { id: latest.packageId } };
    }

    toUpdate.push({
      id:               member.id,
      memberId:         member.memberId,
      fullName:         member.fullName,
      oldStart:         mStart,
      newStart:         pStart,
      oldExpiry:        mExpiry,
      newExpiry:        pExpiry,
      oldStatus:        member.status,
      newStatus:        expStatus,
      packageId:        latest.packageId,
      preservePkgId:    latest.packageId === null,
      currentPackageId: member.currentPackageId,
      receiptNo:        latest.receiptNumber,
      data:             updateData,
    });
  }

  console.log(`Members to skip (no A/R):   ${skipped}`);
  console.log(`Already correct (no update): ${alreadyOk}`);
  console.log(`MISMATCHES TO FIX:           ${toUpdate.length}\n`);

  if (toUpdate.length === 0) {
    console.log("Nothing to update. All snapshots are correct.");
    return;
  }

  // ── Step 5: Apply updates in batches of BATCH_SIZE ────────────────────────
  let updated = 0;
  let errors  = 0;
  const errorRows: any[] = [];

  const totalBatches = Math.ceil(toUpdate.length / BATCH_SIZE);

  for (let b = 0; b < totalBatches; b++) {
    const batch = toUpdate.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE);
    const batchNum = b + 1;

    for (const item of batch) {
      try {
        await prisma.member.update({
          where: { id: item.id },
          data:  item.data,
        });
        updated++;
      } catch (e: any) {
        errors++;
        errorRows.push({ memberId: item.memberId, name: item.fullName, error: e.message });
        console.error(`  ERROR: ${item.memberId} (${item.fullName}): ${e.message}`);
      }
    }

    console.log(`  Batch ${batchNum}/${totalBatches} done — ${Math.min((b + 1) * BATCH_SIZE, toUpdate.length)}/${toUpdate.length} processed, ${updated} updated, ${errors} errors`);
  }

  // ── Step 6: Summary ───────────────────────────────────────────────────────
  console.log("\n════════════════════════════════════════════════════════════");
  console.log("APPLY COMPLETE");
  console.log("════════════════════════════════════════════════════════════");
  console.log(`Total members scanned: ${members.length}`);
  console.log(`No A/R (skip):         ${skipped}`);
  console.log(`Already correct:       ${alreadyOk}`);
  console.log(`Updated:               ${updated}`);
  console.log(`Errors:                ${errors}`);

  if (errorRows.length > 0) {
    console.log("\nERRORS:");
    console.table(errorRows);
  }

  // ── Step 7: Spotlight YF-1735 ─────────────────────────────────────────────
  const spotlight = toUpdate.find(r => r.memberId === "YF-1735");
  console.log("\n────────────────────────────────────────────────────────────");
  console.log("SPOTLIGHT: Nithya Kalyani V / YF-1735");
  console.log("────────────────────────────────────────────────────────────");
  if (spotlight) {
    console.log(`Was in mismatch list:  YES`);
    console.log(`Old expiry:            ${spotlight.oldExpiry}`);
    console.log(`New expiry:            ${spotlight.newExpiry}`);
    console.log(`Old status:            ${spotlight.oldStatus}`);
    console.log(`New status:            ${spotlight.newStatus}`);
    console.log(`Receipt:               #${spotlight.receiptNo}`);
    console.log(`Applied:               ${errors === 0 || !errorRows.find(e => e.memberId === "YF-1735") ? "YES ✓" : "FAILED ✗"}`);
  } else {
    console.log("YF-1735 was NOT in mismatch list — already correct before this run.");
  }

  console.log("\nTo verify: re-run scripts/dry-run-snapshot-mismatch.ts");
  console.log("To rollback: run scripts/rollback-snapshot-fix.ts scripts/snapshot-backup-2026-06-03.json");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
