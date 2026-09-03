import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Temporary diagnostic route — DELETE after use
const FIX_SECRET = "yos-fix-nithish-2024-tmp";

function auth(req: NextRequest) {
  return req.headers.get("x-fix-secret") === FIX_SECRET;
}

// GET ?action=zero-payment-members  → members with 0 non-voided payments
// GET ?action=hist-payments          → all payments on YF-HIST-0000
export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const action = req.nextUrl.searchParams.get("action");

  if (action === "zero-payment-members") {
    // Members who have no non-voided payments at all
    const members = await prisma.member.findMany({
      where: {
        memberId: { not: "YF-HIST-0000" },
        payments: { none: { isVoided: false } },
      },
      select: {
        id: true,
        memberId: true,
        fullName: true,
        phone: true,
        status: true,
        joinDate: true,
      },
      orderBy: { memberId: "asc" },
    });
    return NextResponse.json({ count: members.length, members });
  }

  if (action === "hist-payments") {
    const hist = await prisma.member.findFirst({
      where: { memberId: "YF-HIST-0000" },
      select: { id: true },
    });
    if (!hist) return NextResponse.json({ error: "YF-HIST-0000 not found" }, { status: 404 });

    const payments = await prisma.payment.findMany({
      where: { memberId: hist.id, isVoided: false },
      select: {
        id: true,
        receiptNumber: true,
        company: true,
        amount: true,
        date: true,
        categoryLabel: true,
      },
      orderBy: { date: "asc" },
    });
    return NextResponse.json({ count: payments.length, payments });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
