/**
 * clear-payments.ts
 * Deletes all payment and membership records (seed/test data).
 * Resets member membership snapshot fields.
 * Does NOT touch: members, packages, employees, users, attendance.
 *
 * Run: npx tsx prisma/clear-payments.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🗑️  Clearing payment & membership data...\n");

  // 1. Delete memberships first (has FK → payment)
  const memberships = await prisma.membership.deleteMany();
  console.log(`✅ Deleted ${memberships.count} membership records`);

  // 2. Delete all payments
  const payments = await prisma.payment.deleteMany();
  console.log(`✅ Deleted ${payments.count} payment records`);

  // 3. Reset member membership snapshot fields
  const members = await prisma.member.updateMany({
    data: {
      currentPackageId: null,
      startDate: null,
      expiryDate: null,
      renewalDueDate: null,
      lastPaymentDate: null,
    },
  });
  console.log(`✅ Reset membership fields on ${members.count} members`);

  console.log("\n✅ Done. Payments wiped — members, employees, and packages are untouched.");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
