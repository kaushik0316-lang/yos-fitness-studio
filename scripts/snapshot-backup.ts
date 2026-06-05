// scripts/snapshot-backup.ts
// READ-ONLY — saves current snapshot values for all mismatched members to a JSON file.
// Run this BEFORE apply-snapshot-fix.ts so rollback is always possible.
// No DB writes — only reads + file write.

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

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
  console.log("\nSnapshot Backup — scanning all members...\n");

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

  console.log(`Total members: ${members.length}`);

  const backupRows: any[] = [];
  let mismatches = 0;
  let skipped    = 0;

  for (const member of members) {
    const latestPayment = await prisma.payment.findFirst({
      where: {
        memberId:    member.id,
        paymentType: { in: ["ADMISSION", "RENEWAL"] },
      },
      orderBy: [
        { expiryDate: "desc" },
        { date:       "desc" },
      ],
      select: {
        receiptNumber: true,
        paymentType:   true,
        startDate:     true,
        expiryDate:    true,
        packageId:     true,
        company:       true,
      },
    });

    if (!latestPayment) {
      skipped++;
      continue; // no A/R payments — not in scope
    }

    const pStart  = latestPayment.startDate  ? fmtDate(latestPayment.startDate)  : "null";
    const pExpiry = latestPayment.expiryDate ? fmtDate(latestPayment.expiryDate) : "null";
    const mStart  = member.startDate  ? fmtDate(member.startDate)  : "null";
    const mExpiry = member.expiryDate ? fmtDate(member.expiryDate) : "null";
    const expStatus = expectedStatus(latestPayment.expiryDate);

    const isMismatch =
      mStart !== pStart ||
      mExpiry !== pExpiry ||
      member.status !== expStatus;

    if (!isMismatch) continue;

    mismatches++;

    // Save the CURRENT (pre-fix) values so rollback can restore them exactly
    backupRows.push({
      // Identity — never changes
      id:       member.id,
      memberId: member.memberId,
      fullName: member.fullName,

      // Current snapshot values (what we are about to change)
      current: {
        startDate:        mStart,
        expiryDate:       mExpiry,
        renewalDueDate:   member.renewalDueDate ? fmtDate(member.renewalDueDate) : "null",
        status:           member.status,
        currentPackageId: member.currentPackageId ?? null,
      },

      // Expected values after fix (for reference / verification)
      expected: {
        startDate:        pStart,
        expiryDate:       pExpiry,
        renewalDueDate:   pExpiry,
        status:           expStatus,
        currentPackageId: latestPayment.packageId ?? member.currentPackageId ?? null,
      },

      // Reference
      latestReceiptNo: latestPayment.receiptNumber,
      paymentType:     latestPayment.paymentType,
      company:         latestPayment.company,
    });
  }

  const dateStr  = new Date().toISOString().slice(0, 10);
  const outPath  = path.join("scripts", `snapshot-backup-${dateStr}.json`);
  const payload  = {
    createdAt:    new Date().toISOString(),
    totalMembers: members.length,
    skipped,
    mismatches,
    rows: backupRows,
  };

  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), "utf8");

  console.log("════════════════════════════════════════════════════════════");
  console.log("BACKUP COMPLETE");
  console.log("════════════════════════════════════════════════════════════");
  console.log(`Members scanned:     ${members.length}`);
  console.log(`No A/R (skip):       ${skipped}`);
  console.log(`Mismatches backed up:${mismatches}`);
  console.log(`Backup file:         ${outPath}`);
  console.log("\nRun apply-snapshot-fix.ts next to apply corrections.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
