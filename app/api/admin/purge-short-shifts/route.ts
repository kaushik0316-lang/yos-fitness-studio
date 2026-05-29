import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MIN_SHIFT_MINUTES = 15;

// GET — preview: how many shifts would be deleted
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const shifts = await prisma.attendanceShift.findMany({
      where: { checkOutTime: { not: null } },
      select: {
        id: true,
        checkInTime: true,
        checkOutTime: true,
        attendance: {
          select: {
            id: true,
            employee: { select: { fullName: true, employeeId: true } },
          },
        },
      },
    });

    const short = shifts.filter((s) => {
      const mins = (s.checkOutTime!.getTime() - s.checkInTime.getTime()) / 60_000;
      return mins < MIN_SHIFT_MINUTES;
    });

    return NextResponse.json({
      count: short.length,
      samples: short.slice(0, 20).map((s) => ({
        employee: s.attendance.employee.fullName,
        employeeId: s.attendance.employee.employeeId,
        checkIn: s.checkInTime,
        checkOut: s.checkOutTime,
        durationMins: Math.round((s.checkOutTime!.getTime() - s.checkInTime.getTime()) / 60_000),
      })),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE — purge all shifts < 15 min and fix attendance status
export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const shifts = await prisma.attendanceShift.findMany({
      where: { checkOutTime: { not: null } },
      select: {
        id: true,
        checkInTime: true,
        checkOutTime: true,
        attendanceId: true,
        attendance: {
          select: {
            id: true,
            status: true,
            employee: { select: { fullName: true, employeeId: true } },
          },
        },
      },
    });

    const shortShiftIds = shifts
      .filter((s) => (s.checkOutTime!.getTime() - s.checkInTime.getTime()) / 60_000 < MIN_SHIFT_MINUTES)
      .map((s) => s.id);

    if (shortShiftIds.length === 0)
      return NextResponse.json({ deleted: 0, message: "No shifts under 15 minutes found." });

    // Collect unique attendance IDs affected
    const affectedAttendanceIds = [...new Set(
      shifts.filter((s) => shortShiftIds.includes(s.id)).map((s) => s.attendanceId)
    )];

    // Delete the short shifts
    await prisma.attendanceShift.deleteMany({ where: { id: { in: shortShiftIds } } });

    // For each affected attendance day: if no shifts remain, revert to ABSENT
    let reverted = 0;
    for (const attendanceId of affectedAttendanceIds) {
      const remaining = await prisma.attendanceShift.count({ where: { attendanceId } });
      if (remaining === 0) {
        await prisma.employeeAttendance.update({
          where: { id: attendanceId },
          data: { status: "ABSENT" },
        });
        reverted++;
      }
    }

    return NextResponse.json({
      deleted: shortShiftIds.length,
      daysReverted: reverted,
      message: `Deleted ${shortShiftIds.length} short shift(s). ${reverted} day(s) reverted to Absent.`,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
