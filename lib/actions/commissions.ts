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
  return setPaymentCommissions({
    paymentId:   input.paymentId,
    clientName:  input.clientName,
    packageType: input.packageType,
    totalAmount: input.totalAmount,
    entries: [{ trainerId: input.trainerId, commissionPct: input.commissionPct }],
  });
}

/**
 * Replace all commissions for a payment atomically.
 * Supports 1 or 2 (or more) trainers splitting a single bill.
 */
export async function setPaymentCommissions(input: {
  paymentId: string;
  clientName: string;
  packageType: string;
  totalAmount: number;
  entries: { trainerId: string; commissionPct: number }[];
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") throw new Error("Unauthorized");

  const payment = await prisma.payment.findUnique({
    where: { id: input.paymentId },
    select: { date: true, createdAt: true },
  });
  const paymentDate = payment?.date ?? payment?.createdAt ?? new Date();
  const month = paymentDate.getMonth() + 1;
  const year  = paymentDate.getFullYear();

  await prisma.$transaction([
    prisma.trainerCommission.deleteMany({ where: { paymentId: input.paymentId } }),
    ...input.entries.map((e) =>
      prisma.trainerCommission.create({
        data: {
          trainerId:       e.trainerId,
          paymentId:       input.paymentId,
          clientName:      input.clientName,
          packageType:     input.packageType,
          totalAmount:     input.totalAmount,
          commissionPct:   e.commissionPct,
          commissionAmount: Math.round(input.totalAmount * e.commissionPct) / 100,
          month,
          year,
        },
      })
    ),
  ]);

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
