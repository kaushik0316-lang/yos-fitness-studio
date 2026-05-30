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

  let payments = 0;
  let packages = 0;

  for (const [from, to] of Object.entries(FIXES)) {
    const p = await prisma.payment.updateMany({ where: { categoryLabel: from }, data: { categoryLabel: to } });
    payments += p.count;
    const pkg = await prisma.package.updateMany({ where: { name: from }, data: { name: to } });
    packages += pkg.count;
  }

  // Also list current package names for review
  const pkgList = await prisma.package.findMany({ select: { id: true, name: true, isActive: true } });

  return NextResponse.json({ ok: true, fixedPayments: payments, fixedPackages: packages, allPackages: pkgList });
}
