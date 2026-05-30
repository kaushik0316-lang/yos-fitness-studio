import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SECRET = "yos-fix-labels-2026";

export async function POST(req: Request) {
  const body = await req.json();
  if (body.secret !== SECRET)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const FIXES: Record<string, string> = {
    "G/F":        "General Fitness",
    "GF":         "General Fitness",
    "FIT":        "General Fitness",
    "SUMMER SLOT":"General Fitness",
    "ST/P":       "Student Package",
    "STP":        "Student Package",
    "S/P":        "Student Package",
    "T/P":        "Transformation Package",
    "TP":         "Transformation Package",
    "P/T":        "Personal Training",
    "PT":         "Personal Training",
    "P/T+HIIT":   "Personal Training + HIIT",
    "PT+HIIT":    "Personal Training + HIIT",
  };

  let payments = 0;
  let packages = 0;

  // Use raw SQL for case-insensitive update
  for (const [from, to] of Object.entries(FIXES)) {
    const p = await prisma.$executeRaw`UPDATE "Payment" SET "categoryLabel" = ${to} WHERE LOWER(TRIM("categoryLabel")) = LOWER(${from})`;
    payments += p;
  }

  // Show all distinct categoryLabel values
  const labels = await prisma.payment.findMany({
    select: { categoryLabel: true },
    distinct: ["categoryLabel"],
    orderBy: { categoryLabel: "asc" },
  });

  return NextResponse.json({ ok: true, fixedPayments: payments, fixedPackages: packages, distinctLabels: labels.map(l => l.categoryLabel) });
}
