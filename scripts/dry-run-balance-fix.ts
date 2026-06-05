// scripts/dry-run-balance-fix.ts
// READ-ONLY dry run — no DB writes whatsoever
// Groups multiple BALANCE receipts against the same original receipt
// and sums them before calculating the new pendingAmount.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // 1. Find all BALANCE payments with a previousReceiptNo
  const balancePayments = await prisma.payment.findMany({
    where: {
      paymentType: "BALANCE",
      previousReceiptNo: { not: null },
    },
    select: {
      id: true,
      receiptNumber: true,
      company: true,
      amount: true,
      previousReceiptNo: true,
      date: true,
      member: { select: { fullName: true, memberId: true } },
    },
    orderBy: { date: "asc" },
  });

  console.log(`\nTotal BALANCE payments with previousReceiptNo: ${balancePayments.length}`);

  // 2. Group by company + previousReceiptNo
  type Group = {
    company: string;
    previousReceiptNo: number;
    totalBalancePaid: number;
    balanceReceiptNumbers: number[];
  };

  const groups = new Map<string, Group>();

  for (const bp of balancePayments) {
    const key = `${bp.company}__${bp.previousReceiptNo}`;
    if (!groups.has(key)) {
      groups.set(key, {
        company: bp.company,
        previousReceiptNo: bp.previousReceiptNo!,
        totalBalancePaid: 0,
        balanceReceiptNumbers: [],
      });
    }
    const g = groups.get(key)!;
    g.totalBalancePaid += Number(bp.amount);
    g.balanceReceiptNumbers.push(bp.receiptNumber!);
  }

  console.log(`Unique original receipts referenced: ${groups.size}\n`);

  // 3. For each group, look up the original receipt and calculate outcome
  let wouldUpdate    = 0;
  let alreadyZero    = 0;
  let notFound       = 0;
  let noReduction    = 0;
  let totalReduction = 0;

  const rows: any[] = [];

  for (const [, g] of Array.from(groups)) {
    const original = await prisma.payment.findFirst({
      where: {
        company:       g.company as any,
        receiptNumber: g.previousReceiptNo,
      },
      select: {
        receiptNumber: true,
        pendingAmount: true,
        member: { select: { fullName: true, memberId: true } },
      },
    });

    if (!original) {
      notFound++;
      rows.push({
        status:             "ORIGINAL NOT FOUND",
        company:            g.company,
        originalReceiptNo:  `#${g.previousReceiptNo}`,
        originalMember:     "—",
        oldPending:         "—",
        linkedCount:        g.balanceReceiptNumbers.length,
        balanceReceipts:    g.balanceReceiptNumbers.map((n: number) => `#${n}`).join(", "),
        totalBalancePaid:   `₹${g.totalBalancePaid}`,
        newPending:         "—",
        reduction:          "—",
      });
      continue;
    }

    const oldPending  = Number(original.pendingAmount ?? 0);
    const newPending  = Math.max(0, oldPending - g.totalBalancePaid);
    const reduction   = oldPending - newPending;

    let status: string;
    if (oldPending === 0) {
      status = "ALREADY ZERO";
      alreadyZero++;
    } else if (reduction === 0) {
      status = "NO REDUCTION";
      noReduction++;
    } else {
      status = "WOULD UPDATE";
      wouldUpdate++;
      totalReduction += reduction;
    }

    rows.push({
      status,
      company:            g.company,
      originalReceiptNo:  `#${original.receiptNumber}`,
      originalMember:     `${original.member.fullName} (${original.member.memberId})`,
      oldPending:         `₹${oldPending}`,
      linkedCount:        g.balanceReceiptNumbers.length,
      balanceReceipts:    g.balanceReceiptNumbers.map((n: number) => `#${n}`).join(", "),
      totalBalancePaid:   `₹${g.totalBalancePaid}`,
      newPending:         `₹${newPending}`,
      reduction:          `₹${reduction}`,
    });
  }

  // 4. Summary
  console.log("════════════════════════════════════════════════════════════");
  console.log("DRY-RUN SUMMARY (grouped by company + originalReceiptNo)");
  console.log("════════════════════════════════════════════════════════════");
  console.log(`WOULD UPDATE:           ${wouldUpdate} original receipts`);
  console.log(`ALREADY ZERO (skip):    ${alreadyZero}`);
  console.log(`ORIGINAL NOT FOUND:     ${notFound}`);
  console.log(`NO REDUCTION (skip):    ${noReduction}`);
  console.log(`Total pending reduced:  ₹${totalReduction}`);

  // 5. Full results table
  console.log("\nFULL RESULTS:");
  console.table(rows);

  // 6. Spotlight: receipt #2678 / balance #2701
  console.log("────────────────────────────────────────────────────────────");
  console.log("SPOTLIGHT: Original #2678 (Nitin Thilagan / YF-1291)");
  console.log("────────────────────────────────────────────────────────────");
  const spotlight = rows.find(r => r.originalReceiptNo === "#2678");
  if (spotlight) {
    console.log(`Status:             ${spotlight.status}`);
    console.log(`Company:            ${spotlight.company}`);
    console.log(`Original member:    ${spotlight.originalMember}`);
    console.log(`Old pending:        ${spotlight.oldPending}`);
    console.log(`Linked balances:    ${spotlight.balanceReceipts}`);
    console.log(`Total balance paid: ${spotlight.totalBalancePaid}`);
    console.log(`New pending:        ${spotlight.newPending}`);
    console.log(`Reduction:          ${spotlight.reduction}`);
    const has2701 = spotlight.balanceReceipts.includes("#2701");
    console.log(`#2701 linked?       ${has2701 ? "YES ✓" : "NO ✗"}`);
  } else {
    console.log("Receipt #2678 not found in any balance group (may not exist in this DB).");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
