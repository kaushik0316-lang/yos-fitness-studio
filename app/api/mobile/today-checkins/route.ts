import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function verifyStaffPin(req: NextRequest) {
  const pin = req.headers.get("x-staff-pin");
  if (!pin) return null;
  const employee = await prisma.employee.findUnique({
    where: { pin },
    select: { id: true, isActive: true },
  });
  return employee?.isActive ? employee : null;
}

function getISTDate(): Date {
  const now = new Date();
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  ist.setUTCHours(0, 0, 0, 0);
  return ist;
}

export async function GET(req: NextRequest) {
  const staff = await verifyStaffPin(req);
  if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const checkins = await prisma.memberAttendance.findMany({
    where: { date: getISTDate() },
    orderBy: { checkInTime: "desc" },
    select: {
      id: true,
      checkInTime: true,
      checkOutTime: true,
      member: { select: { fullName: true, memberId: true } },
    },
  });

  return NextResponse.json(checkins);
}
