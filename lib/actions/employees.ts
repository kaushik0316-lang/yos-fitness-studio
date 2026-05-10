"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { EmployeeRole, SalaryType } from "@prisma/client";
import { generateEmployeeId } from "@/lib/utils";
import { z } from "zod";

const employeeSchema = z.object({
  fullName: z.string().min(2),
  role: z.nativeEnum(EmployeeRole),
  phone: z.string().min(10),
  joinDate: z.string(),
  salaryType: z.nativeEnum(SalaryType),
  monthlySalary: z.number().optional(),
  perDaySalary: z.number().optional(),
  notes: z.string().optional(),
});

export async function createEmployee(input: z.infer<typeof employeeSchema>) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") throw new Error("Unauthorized");

  const data = employeeSchema.parse(input);
  const employeeId = await generateEmployeeId(prisma);

  const employee = await prisma.employee.create({
    data: {
      employeeId,
      fullName: data.fullName,
      role: data.role,
      phone: data.phone,
      joinDate: new Date(data.joinDate),
      salaryType: data.salaryType,
      monthlySalary: data.monthlySalary,
      perDaySalary: data.perDaySalary,
      notes: data.notes,
    },
  });

  revalidatePath("/employees");
  return { success: true, employeeId: employee.employeeId };
}
