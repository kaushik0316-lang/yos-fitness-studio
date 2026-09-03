import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Temporary diagnostic route — DELETE after use
const FIX_SECRET = "yos-fix-nithish-2024-tmp";
function auth(req: NextRequest) {
  return req.headers.get("x-fix-secret") === FIX_SECRET;
}

export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // IMP-xxx members with zero non-voided payments
  const impZero = await prisma.member.findMany({
    where: {
      memberId: { startsWith: "IMP-" },
      payments: { none: { isVoided: false } },
    },
    select: { id: true, memberId: true, fullName: true, phone: true, status: true, joinDate: true },
    orderBy: { memberId: "asc" },
  });

  // IMP-xxx members WITH payments (for contrast)
  const impWithPayments = await prisma.member.count({
    where: {
      memberId: { startsWith: "IMP-" },
      payments: { some: { isVoided: false } },
    },
  });

  const totalImp = await prisma.member.count({ where: { memberId: { startsWith: "IMP-" } } });

  return NextResponse.json({
    totalImpMembers: totalImp,
    impWithZeroPayments: impZero.length,
    impWithPayments,
    members: impZero,
  });
}
