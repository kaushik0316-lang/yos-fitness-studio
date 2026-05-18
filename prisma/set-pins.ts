/**
 * prisma/set-pins.ts
 *
 * Assigns sequential 4-digit PINs (1001–1005) to all active employees.
 * PINs are stored as plain strings — the GPS geofence is the security layer.
 *
 * Run with:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/set-pins.ts
 * or:
 *   npx tsx prisma/set-pins.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const employees = await prisma.employee.findMany({
    where: { isActive: true },
    orderBy: { employeeId: "asc" },
  });

  if (employees.length === 0) {
    console.log("No active employees found.");
    return;
  }

  console.log("\n=== Yos Fitness Studio — Employee PIN Assignment ===\n");
  console.log(
    "Employee Name".padEnd(30) +
    "Employee ID".padEnd(15) +
    "PIN"
  );
  console.log("-".repeat(52));

  const updates: Promise<unknown>[] = [];

  employees.forEach((emp, index) => {
    const pin = String(1001 + index);
    console.log(emp.fullName.padEnd(30) + emp.employeeId.padEnd(15) + pin);
    updates.push(
      prisma.employee.update({
        where: { id: emp.id },
        data: { pin },
      })
    );
  });

  console.log("\nUpdating PINs in the database...");
  await Promise.all(updates);
  console.log(`\n✓ Done. ${employees.length} employees updated.\n`);
  console.log("IMPORTANT: Share each PIN privately with the respective employee.");
  console.log("Check-in URL: https://yosfitnessstudio.in/checkin\n");
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
