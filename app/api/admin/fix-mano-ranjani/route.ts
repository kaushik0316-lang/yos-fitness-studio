import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ONE_TIME_SECRET = "yos-fix-2681-renumber";

function isAuthed(session: any, secret: string) {
  return session?.user?.role === "ADMIN" || secret === ONE_TIME_SECRET;
}

// GET  → preview renumber changes
// POST → { action: "renumber" } | { action: "fix-old-member", memberId } | { action: "ranjani", ranjaniMemberId }

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payments = await prisma.payment.findMany({
    where: { company: "YOS_FITNESS_STUDIO", receiptNumber: { gt: 2680 } },
    select: {
      id: true, receiptNumber: true, date: true, amount: true,
      member: { select: { memberId: true, fullName: true } },
    },
    orderBy: { receiptNumber: "asc" },
  });

  const preview = payments.map((p, idx) => ({
    id: p.id, oldNumber: p.receiptNumber, newNumber: 2681 + idx,
    changed: p.receiptNumber !== 2681 + idx,
    member: p.member.fullName, memberId: p.member.memberId,
    date: p.date, amount: p.amount,
  }));

  return NextResponse.json({ preview, total: payments.length, changedCount: preview.filter(p => p.changed).length });
}

export async function POST(req: Request) {
  const body = await req.json();
  const session = await auth();
  if (!isAuthed(session, body.secret))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // ── Close receipt number gap ──────────────────────────────────────────────
  if (body.action === "renumber") {
    const payments = await prisma.payment.findMany({
      where: { company: "YOS_FITNESS_STUDIO", receiptNumber: { gt: 2680 } },
      select: { id: true, receiptNumber: true },
      orderBy: { receiptNumber: "asc" },
    });

    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < payments.length; i++)
        await tx.payment.update({ where: { id: payments[i].id }, data: { receiptNumber: 100000 + i } });
      for (let i = 0; i < payments.length; i++)
        await tx.payment.update({ where: { id: payments[i].id }, data: { receiptNumber: 2681 + i } });
    });

    return NextResponse.json({ ok: true, message: `Renumbered ${payments.length} receipts. New range: 2681–${2680 + payments.length}` });
  }

  // ── Fix old member status after membership was moved away ─────────────────
  if (body.action === "fix-old-member") {
    // Support lookup by database id OR by memberId code (e.g. "YF-1915") OR by name fragment
    let record = body.memberId
      ? await prisma.member.findUnique({ where: { id: body.memberId }, select: { id: true, fullName: true, memberId: true } })
      : body.memberCode
      ? await prisma.member.findFirst({ where: { memberId: body.memberCode }, select: { id: true, fullName: true, memberId: true } })
      : body.name
      ? await prisma.member.findFirst({ where: { fullName: { contains: body.name, mode: "insensitive" } }, select: { id: true, fullName: true, memberId: true } })
      : null;

    if (!record) return NextResponse.json({ error: "Member not found" }, { status: 404 });

    const remaining = await prisma.membership.count({ where: { memberId: record.id } });
    const member = await prisma.member.update({
      where: { id: record.id },
      data: remaining === 0
        ? { currentPackageId: null, expiryDate: null, renewalDueDate: null, status: "EXPIRED" }
        : { status: "ACTIVE" },
      select: { id: true, fullName: true, memberId: true, status: true },
    });

    return NextResponse.json({ ok: true, member, remainingMemberships: remaining });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
