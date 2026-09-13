import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function verifyPin(pin: string) {
  if (!pin) return null;
  return prisma.employee.findUnique({ where: { pin }, select: { id: true } });
}

// POST /api/staff/members/[memberId]/payments — list payments (PIN in body, not URL)
export async function GET(req: NextRequest, { params }: { params: { memberId: string } }) {
  // Legacy: still accept GET for backward compat, but POST is preferred
  const pin = req.nextUrl.searchParams.get("pin") ?? "";
  return fetchPayments(pin, params.memberId);
}

export async function POST(req: NextRequest, { params }: { params: { memberId: string } }) {
  const body = await req.json();
  return fetchPayments(body.pin ?? "", params.memberId);
}

async function fetchPayments(pin: string, memberId: string) {
  const employee = await verifyPin(pin);
  if (!employee) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payments = await prisma.payment.findMany({
    where: { memberId, isVoided: false },
    select: {
      id: true,
      date: true,
      amount: true,
      discount: true,
      paymentMode: true,
      paymentType: true,
      categoryLabel: true,
      periodLabel: true,
      receiptNumber: true,
      soldById: true,
      soldById2: true,
      soldByPct: true,
      soldBy:  { select: { id: true, fullName: true } },
      soldBy2: { select: { id: true, fullName: true } },
      package: { select: { name: true } },
    },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(payments);
}

// PATCH /api/staff/members/[memberId]/payments?pin=xxxx
// Body: { paymentId, soldById, soldById2?, soldByPct? }
export async function PATCH(req: NextRequest, { params: _ }: { params: { memberId: string } }) {
  const body = await req.json();
  const pin  = body.pin ?? "";
  const employee = await verifyPin(pin);
  if (!employee) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payment = await prisma.payment.update({
    where: { id: body.paymentId },
    data: {
      soldById:  body.soldById  || null,
      soldById2: body.soldById2 || null,
      soldByPct: body.soldByPct ?? 100,
    },
    select: {
      id: true,
      soldById: true,
      soldById2: true,
      soldByPct: true,
      soldBy:  { select: { id: true, fullName: true } },
      soldBy2: { select: { id: true, fullName: true } },
    },
  });

  return NextResponse.json(payment);
}
