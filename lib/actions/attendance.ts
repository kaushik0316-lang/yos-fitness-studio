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
  checkInTime?: string;
  checkOutTime?: string;
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
    create: {
      employeeId: input.employeeId,
      date,
      status: input.status as any,
      notes: input.notes,
    },
    update: {
      status: input.status as any,
      notes: input.notes,
    },
  });

  revalidatePath("/employee-attendance");
  revalidatePath("/payroll");

  return { success: true };
}
