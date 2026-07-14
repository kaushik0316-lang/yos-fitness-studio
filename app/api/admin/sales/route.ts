import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth } from "date-fns";

// GET /api/admin/sales?month=6&year=2026 (all) or ?employeeId=xxx&month=6&year=2026 (one employee)
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || !["ADMIN", "ACCOUNTANT"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const employeeId = searchParams.get("employeeId");
  const month = parseInt(searchParams.get("month") ?? "0");
  const year  = parseInt(searchParams.get("year")  ?? "0");

  if (!month || !year) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const start = startOfMonth(new Date(year, month - 1));
  const end   = endOfMonth(new Date(year, month - 1));

  const payments = await prisma.payment.findMany({
    where: {
      isVoided: false,
      date: { gte: start, lte: end },
      ...(employeeId
        ? { OR: [{ soldById: employeeId }, { soldById2: employeeId }] }
        : { OR: [{ soldById: { not: null } }, { soldById2: { not: null } }] }),
    },
    select: {
      id: true,
      date: true,
      amount: true,
      discount: true,
      soldByPct: true,
      categoryLabel: true,
      member:  { select: { fullName: true, memberId: true } },
      soldBy:  { select: { id: true, fullName: true } },
      soldBy2: { select: { id: true, fullName: true } },
    },
    orderBy: { date: "desc" },
  });

  return NextResponse.json({ payments });
}

// PATCH /api/admin/sales — reassign soldById
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session || !["ADMIN", "ACCOUNTANT"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { paymentId, soldById } = await req.json();
  if (!paymentId) return NextResponse.json({ error: "Missing paymentId" }, { status: 400 });

  const payment = await prisma.payment.update({
    where: { id: paymentId },
    data: { soldById: soldById || null },
    select: { id: true, soldById: true },
  });

  return NextResponse.json({ payment });
}
