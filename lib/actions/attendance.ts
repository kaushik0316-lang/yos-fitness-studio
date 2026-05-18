"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { startOfDay, endOfDay } from "date-fns";

export async function markMemberAttendance(memberId: string, date?: Date, remarks?: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const attendanceDate = date ? startOfDay(date) : startOfDay(new Date());

  // Check for existing attendance
  const existing = await prisma.memberAttendance.findUnique({
    where: { memberId_date: { memberId, date: attendanceDate } },
  });

  if (existing) {
    return { success: false, error: "Attendance already marked for today" };
  }

  await prisma.$transaction(async (tx) => {
    await tx.memberAttendance.create({
      data: {
        memberId,
        date: attendanceDate,
        checkInTime: new Date(),
        markedById: session.user.id,
        remarks: remarks ?? null,
      },
    });

    // Update last attendance date on member
    await tx.member.update({
      where: { id: memberId },
      data: { lastAttendanceDate: attendanceDate },
    });
  });

  revalidatePath("/attendance");
  revalidatePath("/members");
  revalidatePath(`/members/${memberId}`);
  revalidatePath("/");

  return { success: true };
}

export async function removeMemberAttendance(attendanceId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.role !== "ADMIN" && session.user.role !== "FRONT_DESK") {
    throw new Error("Insufficient permissions");
  }

  await prisma.memberAttendance.delete({ where: { id: attendanceId } });

  revalidatePath("/attendance");
  return { success: true };
}

export async function markEmployeeAttendance(input: {
  employeeId: string;
  date: string;
  status: "PRESENT" | "ABSENT" | "HALF_DAY" | "WEEKLY_OFF" | "LEAVE" | "PAID_LEAVE";
  notes?: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.role !== "ADMIN" && session.user.role !== "ACCOUNTANT") {
    throw new Error("Insufficient permissions");
  }

  const date = startOfDay(new Date(input.date));

  await prisma.employeeAttendance.upsert({
    where: { employeeId_date: { employeeId: input.employeeId, date } },
    create: { employeeId: input.employeeId, date, status: input.status as any, notes: input.notes },
    update: { status: input.status as any, notes: input.notes },
  });

  revalidatePath("/employee-attendance");
  revalidatePath("/payroll");
  return { success: true };
}

// ── Manual time entry from the admin dashboard ──────────────────────────────
export async function manualMarkAttendanceWithTime(input: {
  employeeId: string;
  date: string; // "YYYY-MM-DD"
  status: "PRESENT" | "ABSENT" | "HALF_DAY" | "WEEKLY_OFF" | "LEAVE" | "PAID_LEAVE";
  checkInTime?: string;  // "HH:MM" in IST
  checkOutTime?: string; // "HH:MM" in IST
  notes?: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.role !== "ADMIN" && session.user.role !== "ACCOUNTANT") {
    throw new Error("Insufficient permissions");
  }

  const date = startOfDay(new Date(input.date));

  // Build DateTime objects from date + time strings in IST (UTC+5:30)
  function toIST(dateStr: string, timeStr: string): Date {
    return new Date(`${dateStr}T${timeStr}:00+05:30`);
  }

  const checkIn  = input.checkInTime  ? toIST(input.date, input.checkInTime)  : null;
  const checkOut = input.checkOutTime ? toIST(input.date, input.checkOutTime) : null;

  if (checkIn && checkOut && checkOut <= checkIn) {
    throw new Error("Check-out time must be after check-in time.");
  }

  // Upsert the day record
  const attendance = await prisma.employeeAttendance.upsert({
    where: { employeeId_date: { employeeId: input.employeeId, date } },
    create: { employeeId: input.employeeId, date, status: input.status as any, notes: input.notes },
    update: { status: input.status as any, notes: input.notes },
    include: { shifts: { orderBy: { shiftIndex: "asc" } } },
  });

  // If times were provided, upsert a manual shift (always shift index 1 for manual entry)
  if (checkIn) {
    const existing = attendance.shifts.find((s) => s.shiftIndex === 1);
    if (existing) {
      await prisma.attendanceShift.update({
        where: { id: existing.id },
        data: { checkInTime: checkIn, checkOutTime: checkOut ?? null },
      });
    } else {
      await prisma.attendanceShift.create({
        data: {
          attendanceId: attendance.id,
          shiftIndex: 1,
          checkInTime: checkIn,
          checkOutTime: checkOut ?? null,
        },
      });
    }
  }

  revalidatePath("/employee-attendance");
  revalidatePath("/payroll");
  return { success: true };
}
