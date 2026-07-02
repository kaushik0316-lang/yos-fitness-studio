"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

const commissionSchema = z.object({
  trainerId:    z.string().min(1),
  clientName:   z.string().min(1),
  packageType:  z.string().min(1),
  totalAmount:  z.number().positive(),
  commissionPct: z.number().min(0).max(100),
  month:        z.number().int().min(1).max(12),
  year:         z.number().int().min(2020),
  notes:        z.string().optional(),
});

export async function addTrainerCommission(data: z.infer<typeof commissionSchema>) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "ACCOUNTANT")) {
    throw new Error("Unauthorized");
  }

  const parsed = commissionSchema.parse(data);
  const commissionAmount = Math.round(parsed.totalAmount * parsed.commissionPct) / 100;

  await prisma.trainerCommission.create({
    data: {
      trainerId:       parsed.trainerId,
      clientName:      parsed.clientName,
      packageType:     parsed.packageType,
      totalAmount:     parsed.totalAmount,
      commissionPct:   parsed.commissionPct,
      commissionAmount,
      month:           parsed.month,
      year:            parsed.year,
      notes:           parsed.notes,
    },
  });

  revalidatePath("/payroll");
  return { success: true };
}

export async function deleteTrainerCommission(id: string) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "ACCOUNTANT")) {
    throw new Error("Unauthorized");
  }

  await prisma.trainerCommission.delete({ where: { id } });
  revalidatePath("/payroll");
  return { success: true };
}

export async function assignCommissionToPayment(input: {
  paymentId: string;
  trainerId: string;
  commissionPct: number;
  clientName: string;
  packageType: string;
  totalAmount: number;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") throw new Error("Unauthorized");

  const commissionAmount = Math.round(input.totalAmount * input.commissionPct) / 100;
  const now = new Date();

  // Upsert: if a commission already exists for this payment, replace it
  const existing = await prisma.trainerCommission.findUnique({ where: { paymentId: input.paymentId } });
  if (existing) {
    await prisma.trainerCommission.update({
      where: { paymentId: input.paymentId },
      data: {
        trainerId:       input.trainerId,
        clientName:      input.clientName,
        packageType:     input.packageType,
        totalAmount:     input.totalAmount,
        commissionPct:   input.commissionPct,
        commissionAmount,
        month:           now.getMonth() + 1,
        year:            now.getFullYear(),
      },
    });
  } else {
    await prisma.trainerCommission.create({
      data: {
        trainerId:       input.trainerId,
        paymentId:       input.paymentId,
        clientName:      input.clientName,
        packageType:     input.packageType,
        totalAmount:     input.totalAmount,
        commissionPct:   input.commissionPct,
        commissionAmount,
        month:           now.getMonth() + 1,
        year:            now.getFullYear(),
      },
    });
  }

  revalidatePath(`/payments/${input.paymentId}/receipt`);
  revalidatePath("/payroll");
  return { success: true };
}

export async function removeCommissionFromPayment(paymentId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") throw new Error("Unauthorized");

  await prisma.trainerCommission.deleteMany({ where: { paymentId } });
  revalidatePath(`/payments/${paymentId}/receipt`);
  revalidatePath("/payroll");
  return { success: true };
}

export async function updateSalesCommissionPct(employeeId: string, pct: number | null) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }

  await prisma.employee.update({
    where: { id: employeeId },
    data: { salesCommissionPct: pct },
  });

  revalidatePath("/employee-attendance");
  return { success: true };
}
