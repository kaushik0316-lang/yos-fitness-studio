import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch all ABSENT records
  const absentRecords = await prisma.employeeAttendance.findMany({
    where: { status: "ABSENT" },
    select: { id: true, date: true },
  });

  // Filter to Sundays (getDay() === 0)
  const sundayAbsentIds = absentRecords
    .filter((r) => new Date(r.date).getDay() === 0)
    .map((r) => r.id);

  if (sundayAbsentIds.length === 0) {
    return NextResponse.json({ deleted: 0, message: "No Sunday absences found." });
  }

  const { count } = await prisma.employeeAttendance.deleteMany({
    where: { id: { in: sundayAbsentIds } },
  });

  return NextResponse.json({ deleted: count, message: `Removed ${count} Sunday absence record(s).` });
}
