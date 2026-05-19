"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { EmployeeRole, SalaryType } from "@prisma/client";
import { generateEmployeeId, ucaseReq, ucase } from "@/lib/utils";
import { z } from "zod";

const employeeSchema = z.object({
  fullName: z.string().min(2),
  role: z.nativeEnum(EmployeeRole),
  phone: z.string().min(10),
  joinDate: z.string(),
  salaryType: z.nativeEnum(SalaryType),
  monthlySalary: z.number().optional(),
  perDaySalary: z.number().optional(),
  pin: z.string().regex(/^\d{4,6}$/, "PIN must be 4–6 digits"),
  notes: z.string().optional(),
});

export async function createEmployee(input: z.infer<typeof employeeSchema>) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") throw new Error("Unauthorized");

  const data = employeeSchema.parse(input);

  // Check PIN uniqueness
  const existing = await prisma.employee.findUnique({ where: { pin: data.pin } });
  if (existing) throw new Error(`PIN ${data.pin} is already assigned to ${existing.fullName}. Choose a different PIN.`);

  const employeeId = await generateEmployeeId(prisma);

  const employee = await prisma.employee.create({
    data: {
      employeeId,
      fullName: ucaseReq(data.fullName),
      role: data.role,
      phone: data.phone,
      joinDate: new Date(data.joinDate),
      salaryType: data.salaryType,
      monthlySalary: data.monthlySalary,
      perDaySalary: data.perDaySalary,
      pin: data.pin,
      notes: ucase(data.notes),
    },
  });

  revalidatePath("/employee-attendance");
  return { success: true, employeeId: employee.employeeId };
}

const updateSchema = z.object({
  id: z.string(),
  fullName: z.string().min(2),
  role: z.nativeEnum(EmployeeRole),
  phone: z.string().min(10),
  salaryType: z.nativeEnum(SalaryType),
  monthlySalary: z.number().optional(),
  perDaySalary: z.number().optional(),
  pin: z.string().regex(/^\d{4,6}$/, "PIN must be 4–6 digits"),
  notes: z.string().optional(),
});

export async function updateEmployee(input: z.infer<typeof updateSchema>) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") throw new Error("Unauthorized");

  const data = updateSchema.parse(input);

  // Check PIN uniqueness (excluding this employee)
  const existing = await prisma.employee.findFirst({
    where: { pin: data.pin, NOT: { id: data.id } },
  });
  if (existing) throw new Error(`PIN ${data.pin} is already assigned to ${existing.fullName}. Choose a different PIN.`);

  await prisma.employee.update({
    where: { id: data.id },
    data: {
      fullName: ucaseReq(data.fullName),
      role: data.role,
      phone: data.phone,
      salaryType: data.salaryType,
      monthlySalary: data.monthlySalary ?? null,
      perDaySalary: data.perDaySalary ?? null,
      pin: data.pin,
      notes: ucase(data.notes),
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
