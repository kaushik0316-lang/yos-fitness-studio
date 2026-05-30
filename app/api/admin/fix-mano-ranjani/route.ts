import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ONE-TIME FIX: Move Mano Ranjana Gowtham's (YF-1815) active membership to Mano Ranjani
// GET  → preview what will happen (safe, no changes)
// POST → execute the fix

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Receipt range 2681–2756 for Yos Studio
  const receiptRange = await prisma.payment.findMany({
    where: {
      company: "YOS_FITNESS_STUDIO",
      receiptNumber: { gte: 2681, lte: 2756 },
    },
    select: {
      receiptNumber: true,
      date: true,
      amount: true,
      paymentMode: true,
      member: { select: { memberId: true, fullName: true, phone: true } },
    },
    orderBy: { receiptNumber: "asc" },
  });

  // Mano Ranjani fix preview
  const gowtham = await prisma.member.findFirst({
    where: { memberId: "YF-1815" },
    include: {
      memberships: { orderBy: { startDate: "desc" }, take: 1 },
      payments: { orderBy: { date: "desc" }, take: 3, select: { id: true, receiptNumber: true, date: true, amount: true } },
    },
  });

  const ranjaniCandidates = await prisma.member.findMany({
    where: { fullName: { contains: "ranjani", mode: "insensitive" } },
    select: { id: true, memberId: true, fullName: true, phone: true, status: true, expiryDate: true },
  });

  return NextResponse.json({ receiptRange, totalInRange: receiptRange.length, gowtham, ranjaniCandidates });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { ranjaniMemberId } = await req.json();
  if (!ranjaniMemberId)
    return NextResponse.json({ error: "ranjaniMemberId required" }, { status: 400 });

  // Find Gowtham's latest payment
  const gowtham = await prisma.member.findFirst({
    where: { memberId: "YF-1815" },
    include: {
      payments: { orderBy: { date: "desc" }, take: 1 },
    },
  });

  if (!gowtham || !gowtham.payments[0])
    return NextResponse.json({ error: "Payment not found for YF-1815" }, { status: 404 });

  const paymentId = gowtham.payments[0].id;

  // Reuse the existing reassign-payment logic
  const res = await fetch(
    `${process.env.NEXTAUTH_URL ?? "https://yosfitnessstudio.in"}/api/admin/reassign-payment`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Pass admin cookie from current request
        cookie: req.headers.get("cookie") ?? "",
      },
      body: JSON.stringify({ paymentId, newMemberId: ranjaniMemberId }),
    }
  );

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
