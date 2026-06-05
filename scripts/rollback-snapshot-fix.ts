// scripts/rollback-snapshot-fix.ts
// Restores member snapshots from a backup JSON produced by snapshot-backup.ts.
// Pass the backup file path as the first argument:
//   npx tsx scripts/rollback-snapshot-fix.ts scripts/snapshot-backup-2026-06-03.json
//
// Only restores fields that were saved in the backup:
//   startDate, expiryDate, renewalDueDate, status, currentPackageId
//
// Identity fields (fullName, phone, memberId, etc.) are never changed.
// Payments, receipts, and schema are never changed.

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";

const prisma = new PrismaClient();

function parseDate(s: string | null): Date | null {
  if (!s || s === "null") return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

async function main() {
  const backupFile = process.argv[2];
  if (!backupFile) {
    console.error("\nUsage: npx tsx scripts/rollback-snapshot-fix.ts <backup-file.json>\n");
    console.error("Example: npx tsx scripts/rollback-snapshot-fix.ts scripts/snapshot-backup-2026-06-03.json");
    process.exit(1);
  }

  if (!fs.existsSync(backupFile)) {
    console.error(`\nBackup file not found: ${backupFile}\n`);
    process.exit(1);
  }

  const payload = JSON.parse(fs.readFileSync(backupFile, "utf8"));
  const rows: any[] = payload.rows ?? [];

  console.log("\n════════════════════════════════════════════════════════════");
  console.log("ROLLBACK — Restoring from backup");
  console.log("════════════════════════════════════════════════════════════");
  console.log(`Backup created:   ${payload.createdAt}`);
  console.log(`Members in backup:${rows.length}`);
  console.log(`Backup file:      ${backupFile}\n`);

  if (rows.length === 0) {
    console.log("No rows to restore. Exiting.");
    return;
  }

  let restored = 0;
  let notFound = 0;
  let errors   = 0;

  const restoredRows: any[] = [];
  const errorRows:    any[] = [];

  for (const row of rows) {
    // Verify member still exists by internal id
    const exists = await prisma.member.findUnique({
      where:  { id: row.id },
      select: { id: true, memberId: true },
    });

    if (!exists) {
      notFound++;
      console.warn(`  SKIP — member not found: ${row.memberId} (${row.fullName})`);
      continue;
    }

    const cur = row.current; // the pre-fix values saved by snapshot-backup.ts

    try {
      await prisma.member.update({
        where: { id: row.id },
        data: {
          startDate:        parseDate(cur.startDate),
          expiryDate:       parseDate(cur.expiryDate),
          renewalDueDate:   parseDate(cur.renewalDueDate),
          status:           cur.status,
          currentPackageId: cur.currentPackageId ?? null,
        },
      });

      restored++;
      restoredRows.push({
        memberId:  row.memberId,
        name:      row.fullName,
        expiry:    cur.expiryDate,
        status:    cur.status,
      });
    } catch (e: any) {
      errors++;
      errorRows.push({ memberId: row.memberId, name: row.fullName, error: e.message });
      console.error(`  ERROR restoring ${row.memberId} (${row.fullName}): ${e.message}`);
    }
  }

  console.log("════════════════════════════════════════════════════════════");
  console.log("ROLLBACK COMPLETE");
  console.log("════════════════════════════════════════════════════════════");
  console.log(`Restored:  ${restored}`);
  console.log(`Not found: ${notFound}`);
  console.log(`Errors:    ${errors}`);

  if (restoredRows.length > 0) {
    console.log("\nRESTORED MEMBERS:");
    console.table(restoredRows);
  }
  if (errorRows.length > 0) {
    console.log("\nERRORS:");
    console.table(errorRows);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
