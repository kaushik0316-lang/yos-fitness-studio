import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SECRET = "yos-fix-labels-2026";

export async function POST(req: Request) {
  const body = await req.json();
  if (body.secret !== SECRET)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const FIXES: Record<string, string> = {
    "G/F":  "General Fitness",
    "g/f":  "General Fitness",
    "GF":   "General Fitness",
    "ST/P": "Student Package",
    "st/p": "Student Package",
    "STP":  "Student Package",
    "T/P":  "Transformation Package",
    "t/p":  "Transformation Package",
    "TP":   "Transformation Package",
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
