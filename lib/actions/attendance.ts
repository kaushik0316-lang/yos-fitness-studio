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
  shiftIndex?: number;   // which shift to upsert (defaults to 1)
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

  // If times were provided, upsert the chosen shift
  const targetShift = input.shiftIndex ?? 1;
  if (checkIn) {
    const existing = attendance.shifts.find((s) => s.shiftIndex === targetShift);
    if (existing) {
      await prisma.attendanceShift.update({
        where: { id: existing.id },
        data: { checkInTime: checkIn, checkOutTime: checkOut ?? null },
      });
    } else {
      await prisma.attendanceShift.create({
        data: {
          attendanceId: attendance.id,
          shiftIndex: targetShift,
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

// ── Manual member attendance entry with check-in/out times ──────────────────
export async function manualMarkMemberAttendance(input: {
  memberId: string;
  date: string;       // "YYYY-MM-DD"
  checkInTime: string;  // "HH:MM" IST
  checkOutTime: string; // "HH:MM" IST
  remarks?: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.role !== "ADMIN" && session.user.role !== "FRONT_DESK") {
    throw new Error("Insufficient permissions");
  }

  function toIST(dateStr: string, timeStr: string): Date {
    return new Date(`${dateStr}T${timeStr}:00+05:30`);
  }

  const attendanceDate = new Date(`${input.date}T00:00:00.000Z`);
  const checkIn  = toIST(input.date, input.checkInTime);
  const checkOut = toIST(input.date, input.checkOutTime);

  if (checkOut <= checkIn) throw new Error("Check-out time must be after check-in time.");

  const existing = await prisma.memberAttendance.findUnique({
    where: { memberId_date: { memberId: input.memberId, date: attendanceDate } },
  });

  if (existing) {
    // Update existing record's times
    await prisma.memberAttendance.update({
      where: { id: existing.id },
      data: {
        checkInTime:  checkIn,
        checkOutTime: checkOut,
        remarks: input.remarks ?? existing.remarks,
      },
    });
  } else {
    await prisma.$transaction([
      prisma.memberAttendance.create({
        data: {
          memberId:     input.memberId,
          date:         attendanceDate,
          checkInTime:  checkIn,
          checkOutTime: checkOut,
          markedById:   session.user.id,
          remarks:      input.remarks ?? null,
        },
      }),
      prisma.member.update({
        where: { id: input.memberId },
        data: { lastAttendanceDate: attendanceDate },
      }),
    ]);
  }

  revalidatePath("/attendance");
  revalidatePath("/challenge");
  revalidatePath("/members");
  return { success: true };
}

// ── Check out a member with optional custom time and remarks ─────────────────
export async function checkOutMember(input: {
  attendanceId: string;
  checkOutTime?: string; // "HH:MM" IST — defaults to now
  remarks?: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.role !== "ADMIN" && session.user.role !== "FRONT_DESK") {
    throw new Error("Insufficient permissions");
  }

  const record = await prisma.memberAttendance.findUnique({
    where: { id: input.attendanceId },
    select: { checkInTime: true, date: true },
  });
  if (!record) throw new Error("Attendance record not found.");

  let checkOutTime: Date;
  if (input.checkOutTime) {
    // Build checkout as IST time on the same calendar day as check-in
    const checkInIST = new Date(record.checkInTime.getTime() + 5.5 * 60 * 60 * 1000);
    const [h, m] = input.checkOutTime.split(":").map(Number);
    checkOutTime = new Date(
      Date.UTC(
        checkInIST.getUTCFullYear(),
        checkInIST.getUTCMonth(),
        checkInIST.getUTCDate(),
        h, m, 0
      ) - 5.5 * 60 * 60 * 1000
    );
    if (checkOutTime <= record.checkInTime) {
      throw new Error("Check-out time must be after check-in time.");
    }
  } else {
    checkOutTime = new Date();
  }

  await prisma.memberAttendance.update({
    where: { id: input.attendanceId },
    data: {
      checkOutTime,
      ...(input.remarks ? { remarks: input.remarks } : {}),
    },
  });

  revalidatePath("/attendance");
  revalidatePath("/challenge");
  return { success: true };
}

// ── Edit an existing member attendance record's times ───────────────────────
export async function editMemberAttendance(input: {
  attendanceId: string;
  checkInTime: string;       // "HH:MM" IST
  checkOutTime?: string | null; // "HH:MM" IST
  remarks?: string | null;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.role !== "ADMIN" && session.user.role !== "FRONT_DESK") {
    throw new Error("Insufficient permissions");
  }

  const existing = await prisma.memberAttendance.findUnique({
    where: { id: input.attendanceId },
    select: { date: true },
  });
  if (!existing) throw new Error("Record not found.");

  const dateStr = existing.date.toISOString().slice(0, 10);
  function toIST(d: string, t: string) { return new Date(`${d}T${t}:00+05:30`); }

  const checkIn  = toIST(dateStr, input.checkInTime);
  const checkOut = input.checkOutTime ? toIST(dateStr, input.checkOutTime) : null;
  if (checkOut && checkOut <= checkIn) throw new Error("Check-out must be after check-in.");

  await prisma.memberAttendance.update({
    where: { id: input.attendanceId },
    data: { checkInTime: checkIn, checkOutTime: checkOut, remarks: input.remarks ?? null },
  });

  revalidatePath("/attendance");
  revalidatePath("/challenge");
  revalidatePath("/members");
  return { success: true };
}

// ── Delete a single attendance shift ────────────────────────────────────────
export async function deleteAttendanceShift(shiftId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.role !== "ADMIN") throw new Error("Only admins can delete shifts.");

  await prisma.attendanceShift.delete({ where: { id: shiftId } });

  revalidatePath("/employee-attendance");
  revalidatePath("/payroll");
  return { success: true };
}
