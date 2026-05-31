"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { calculatePayroll, savePayroll, generateMonthlyPayroll } from "@/lib/payroll/calculator";

export async function generatePayrollAction(month: number, year: number) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "ACCOUNTANT")) {
    throw new Error("Unauthorized");
  }

  const results = await generateMonthlyPayroll(month, year);
  revalidatePath("/payroll");
  return { success: true, count: results.length };
}

export async function markPayrollPaid(recordId: string, paidMode: string) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "ACCOUNTANT")) {
    throw new Error("Unauthorized");
  }

  await prisma.payrollRecord.update({
    where: { id: recordId },
    data: { isPaid: true, paidDate: new Date(), paidMode },
  });

  revalidatePath("/payroll");
  return { success: true };
}

export async function clearPayrollAction(month: number, year: number) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized — only admins can clear payroll");
  }

  const { count } = await prisma.payrollRecord.deleteMany({ where: { month, year } });
  revalidatePath("/payroll");
  return { success: true, deleted: count };
}

export async function updateBonus(recordId: string, bonus: number) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "ACCOUNTANT")) {
    throw new Error("Unauthorized");
  }

  if (typeof bonus !== "number" || bonus < 0) {
    throw new Error("Bonus must be a non-negative number.");
  }

  const record = await prisma.payrollRecord.findUnique({ where: { id: recordId } });
  if (!record) throw new Error("Record not found");

  // Recalculate net salary with new bonus
  const netSalary = Math.max(0, Number(record.grossSalary) - Number(record.deductions) + bonus);

  await prisma.payrollRecord.update({
    where: { id: recordId },
    data: { bonus, netSalary },
  });

  revalidatePath("/payroll");
  return { success: true };
}
