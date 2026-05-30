import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SECRET = "yos-fix-labels-2026";

// Fix abbreviations and bad category labels in all payments
export async function POST(req: Request) {
  const body = await req.json();
  if (body.secret !== SECRET)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const FIXES: Record<string, string> = {
    "G/F": "General Fitness",
    "g/f": "General Fitness",
    "GF":  "General Fitness",
    "gf":  "General Fitness",
    "SF":  "Student Fitness",
    "SP":  "Student Package",
  };

  let total = 0;
  for (const [from, to] of Object.entries(FIXES)) {
    const r = await prisma.payment.updateMany({
      where: { categoryLabel: from },
      data:  { categoryLabel: to },
    });
    total += r.count;
  }

  return NextResponse.json({ ok: true, fixed: total });
}
