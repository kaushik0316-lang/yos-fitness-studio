import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get all ABSENT employee attendance records
  const absents = await prisma.employeeAttendance.findMany({
    where: { status: "ABSENT" },
    select: { id: true, date: true },
  });

  // Filter for Sundays (getDay() === 0)
  const sundayAbsentIds = absents
    .filter((a) => new Date(a.date).getDay() === 0)
    .map((a) => a.id);

  if (sundayAbsentIds.length === 0) {
    return NextResponse.json({ deleted: 0, message: "No Sunday absence records found." });
  }

  const result = await prisma.employeeAttendance.deleteMany({
    where: { id: { in: sundayAbsentIds } },
  });

  return NextResponse.json({
    deleted: result.count,
    message: `Removed ${result.count} Sunday absence record${result.count !== 1 ? "s" : ""}.`,
  });
}
