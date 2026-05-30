import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SECRET = "yos-fix-labels-2026";

export async function POST(req: Request) {
  const body = await req.json();
  if (body.secret !== SECRET)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Fix "12 Months - Yos Studio" and similar duration-prefixed labels → General Fitness
  const fixed = await prisma.$executeRaw`
    UPDATE "Payment"
    SET "categoryLabel" = 'General Fitness'
    WHERE "categoryLabel" ~ '^\d+ Months? - Yos'
  `;

  const labels = await prisma.payment.findMany({
    select: { categoryLabel: true },
    distinct: ["categoryLabel"],
    orderBy: { categoryLabel: "asc" },
  });

  return NextResponse.json({ ok: true, fixed, remaining: labels.map(l => l.categoryLabel) });
}
