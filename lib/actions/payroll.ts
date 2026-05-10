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
