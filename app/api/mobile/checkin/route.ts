import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function verifyStaffPin(req: NextRequest) {
  const pin = req.headers.get("x-staff-pin");
  if (!pin) return null;
  const employee = await prisma.employee.findUnique({
    where: { pin },
    select: { id: true, fullName: true, isActive: true },
  });
  return employee?.isActive ? employee : null;
}

function getISTDate(): Date {
  const now = new Date();
  const istNow = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  istNow.setUTCHours(0, 0, 0, 0);
  return istNow;
}

export async function POST(req: NextRequest) {
  const staff = await verifyStaffPin(req);
  if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { memberId } = await req.json();
  if (!memberId) return NextResponse.json({ error: "memberId required" }, { status: 400 });

  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: { id: true, fullName: true, status: true, expiryDate: true },
  });
  if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });

  const todayIST = getISTDate();
  const now = new Date();

  // Check if already checked in today
  const existing = await prisma.memberAttendance.findUnique({
    where: { memberId_date: { memberId: member.id, date: todayIST } },
  });
  if (existing) {
    return NextResponse.json({ success: false, error: `${member.fullName} is already checked in today.` });
  }

  const attendance = await prisma.memberAttendance.create({
    data: {
      memberId:    member.id,
      date:        todayIST,
      checkInTime: now,
      markedById:  staff.id,
    },
  });

  await prisma.member.update({
    where: { id: member.id },
    data:  { lastAttendanceDate: todayIST },
  });

  return NextResponse.json({ success: true, checkInTime: attendance.checkInTime.toISOString() });
}
