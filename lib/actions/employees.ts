"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { EmployeeRole, SalaryType } from "@prisma/client";
import { generateEmployeeId, ucaseReq, ucase } from "@/lib/utils";
import { normalizeName, toTitleCase } from "@/lib/utils/titleCase";
import { z } from "zod";

const shiftSchema = z.object({
  start: z.string().regex(/^\d{2}:\d{2}$/),
  end:   z.string().regex(/^\d{2}:\d{2}$/),
});

const employeeSchema = z.object({
  fullName:      z.string().min(2),
  role:          z.nativeEnum(EmployeeRole),
  phone:         z.string().min(10),
  joinDate:      z.string(),
  salaryType:    z.nativeEnum(SalaryType),
  monthlySalary: z.number().optional(),
  perDaySalary:  z.number().optional(),
  pin:           z.string().regex(/^\d{4,6}$/, "PIN must be 4–6 digits"),
  shifts:        z.array(shiftSchema).optional(),
  shiftDays:     z.array(z.number().min(0).max(6)).optional(),
  notes:         z.string().optional(),
});

export async function createEmployee(input: z.infer<typeof employeeSchema>) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") throw new Error("Unauthorized");

  const data = employeeSchema.parse(input);

  const existing = await prisma.employee.findUnique({ where: { pin: data.pin } });
  if (existing) throw new Error(`PIN ${data.pin} is already assigned to ${existing.fullName}. Choose a different PIN.`);

  const employeeId = await generateEmployeeId(prisma);

  // Derive legacy shiftEndTime from first shift for backwards compat
  const shiftEndTime = data.shifts?.[0]?.end ?? null;

  const employee = await prisma.employee.create({
    data: {
      employeeId,
      fullName:      toTitleCase(normalizeName(data.fullName)),
      role:          data.role,
      phone:         data.phone,
      joinDate:      new Date(data.joinDate),
      salaryType:    data.salaryType,
      monthlySalary: data.monthlySalary,
      perDaySalary:  data.perDaySalary,
      pin:           data.pin,
      shiftEndTime,
      shifts:        data.shifts ?? [],
      shiftDays:     data.shiftDays ?? [],
      notes:         ucase(data.notes),
    },
  });

  revalidatePath("/employee-attendance");
  return { success: true, employeeId: employee.employeeId };
}

const updateSchema = z.object({
  id:            z.string(),
  fullName:      z.string().min(2),
  role:          z.nativeEnum(EmployeeRole),
  phone:         z.string().min(10),
  salaryType:    z.nativeEnum(SalaryType),
  monthlySalary: z.number().optional(),
  perDaySalary:  z.number().optional(),
  pin:           z.string().regex(/^\d{4,6}$/, "PIN must be 4–6 digits"),
  shifts:        z.array(shiftSchema).optional(),
  shiftDays:          z.array(z.number().min(0).max(6)).optional(),
  salesCommissionPct: z.number().min(0).max(100).optional(),
  notes:              z.string().optional(),
});

export async function updateEmployee(input: z.infer<typeof updateSchema>) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") throw new Error("Unauthorized");

  const data = updateSchema.parse(input);

  const existing = await prisma.employee.findFirst({
    where: { pin: data.pin, NOT: { id: data.id } },
  });
  if (existing) throw new Error(`PIN ${data.pin} is already assigned to ${existing.fullName}. Choose a different PIN.`);

  const shiftEndTime = data.shifts?.[0]?.end ?? null;

  await prisma.employee.update({
    where: { id: data.id },
    data: {
      fullName:      toTitleCase(normalizeName(data.fullName)),
      role:          data.role,
      phone:         data.phone,
      salaryType:    data.salaryType,
      monthlySalary: data.monthlySalary ?? null,
      perDaySalary:  data.perDaySalary ?? null,
      pin:           data.pin,
      shiftEndTime,
      shifts:             data.shifts ?? [],
      shiftDays:          data.shiftDays ?? [],
      salesCommissionPct: data.salesCommissionPct ?? null,
      notes:              ucase(data.notes),
    },
  });

  revalidatePath("/employee-attendance");
  return { success: true };
}

export async function setEmployeeActive(id: string, isActive: boolean) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") throw new Error("Unauthorized");

  await prisma.employee.update({ where: { id }, data: { isActive } });
  revalidatePath("/employee-attendance");
  return { success: true };
}

const shiftHistorySchema = z.object({
  employeeId:    z.string().min(1),
  shifts:        z.array(shiftSchema).min(1),
  shiftDays:     z.array(z.number().min(0).max(6)).min(1),
  monthlySalary: z.number().positive(),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes:         z.string().optional(),
});

export async function addShiftHistory(input: z.infer<typeof shiftHistorySchema>) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") throw new Error("Unauthorized");

  const data = shiftHistorySchema.parse(input);
  const effectiveDate = new Date(data.effectiveFrom);

  // If this is the first history entry, auto-seed the current employee values as the baseline
  const existingCount = await prisma.employeeShiftHistory.count({ where: { employeeId: data.employeeId } });
  if (existingCount === 0) {
    const emp = await prisma.employee.findUnique({ where: { id: data.employeeId } });
    if (emp && emp.shifts && emp.monthlySalary) {
      await prisma.employeeShiftHistory.create({
        data: {
          employeeId:    data.employeeId,
          shifts:        emp.shifts,
          shiftDays:     emp.shiftDays ?? [1,2,3,4,5,6],
          monthlySalary: emp.monthlySalary,
          effectiveFrom: emp.joinDate,
          notes:         "Initial record (auto-created)",
        },
      });
    }
  }

  await prisma.employeeShiftHistory.create({
    data: {
      employeeId:    data.employeeId,
      shifts:        data.shifts,
      shiftDays:     data.shiftDays,
      monthlySalary: data.monthlySalary,
      effectiveFrom: effectiveDate,
      notes:         data.notes,
    },
  });

  // Only update live employee fields if this record is the most recent period
  const newerExists = await prisma.employeeShiftHistory.findFirst({
    where: { employeeId: data.employeeId, effectiveFrom: { gt: effectiveDate } },
  });
  if (!newerExists && effectiveDate <= new Date()) {
    await prisma.employee.update({
      where: { id: data.employeeId },
      data: {
        shifts:        data.shifts,
        shiftDays:     data.shiftDays,
        monthlySalary: data.monthlySalary,
      },
    });
  }

  revalidatePath("/employee-attendance");
  return { success: true };
}

export async function getShiftHistory(employeeId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  // If no history exists yet, auto-seed from current employee values (join date as effectiveFrom)
  const count = await prisma.employeeShiftHistory.count({ where: { employeeId } });
  if (count === 0) {
    const emp = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (emp && emp.shifts && emp.monthlySalary) {
      await prisma.employeeShiftHistory.create({
        data: {
          employeeId,
          shifts:        emp.shifts,
          shiftDays:     emp.shiftDays ?? [1,2,3,4,5,6],
          monthlySalary: emp.monthlySalary,
          effectiveFrom: emp.joinDate,
          notes:         "Initial record (auto-created)",
        },
      });
    }
  }

  return prisma.employeeShiftHistory.findMany({
    where: { employeeId },
    orderBy: { effectiveFrom: "desc" },
  });
}
