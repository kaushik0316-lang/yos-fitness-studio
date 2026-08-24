import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MemberStatus } from "@prisma/client";
import { startOfDay, endOfDay, parseISO } from "date-fns";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dateParam = req.nextUrl.searchParams.get("date");
    const date = dateParam ? parseISO(dateParam) : new Date();
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    // Who checked in on this date?
    const checkedInToday = await prisma.memberAttendance.findMany({
      where: { date: { gte: dayStart, lte: dayEnd } },
      select: { memberId: true },
    });
    const checkedInIds = new Set(checkedInToday.map((a) => a.memberId));

    // All active members not in that set
    const members = await prisma.member.findMany({
      where: { status: MemberStatus.ACTIVE },
      select: {
        id: true, memberId: true, fullName: true, phone: true, gender: true,
        lastAttendanceDate: true, expiryDate: true,
        currentPackage: { select: { name: true } },
        memberships: {
          orderBy: { expiryDate: "desc" as const }, take: 1,
          select: { package: { select: { name: true } } },
        },
        trainer: { select: { fullName: true } },
      },
      orderBy: { fullName: "asc" },
    });

    const pending = members
      .filter((m) => !checkedInIds.has(m.id))
      .map((m) => ({
        ...m,
        expiryDate: m.expiryDate?.toISOString() ?? null,
        lastAttendanceDate: m.lastAttendanceDate?.toISOString() ?? null,
        memberships: m.memberships.map((ms) => ({
          ...ms,
          expiryDate: null,
        })),
      }));

    return NextResponse.json(pending);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
