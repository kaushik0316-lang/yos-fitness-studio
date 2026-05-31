"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { addDays } from "date-fns";
import { Company, MemberStatus, PaymentMode } from "@prisma/client";
import { generateMemberId, ucaseReq, ucase } from "@/lib/utils";
import { z } from "zod";

const createMemberSchema = z.object({
  fullName: z.string().min(2),
  phone: z.string().min(10),
  whatsapp: z.string().optional(),
  email: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  dateOfBirth: z.string().optional(),
  bloodGroup: z.string().optional(),
  weight: z.number().optional(),
  height: z.number().optional(),
  healthConditions: z.string().optional(),
  intentionOfJoining: z.string().optional(),
  address: z.string().optional(),
  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),
  idCompany: z.enum(["YOS_FITNESS", "YOS_FITNESS_STUDIO"]),
  trainerId: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["ACTIVE", "EXPIRED", "FROZEN", "INACTIVE", "PROSPECT"]).default("ACTIVE"),
  // Optional: create with package
  packageId: z.string().optional(),
  startDate: z.string().optional(),
  paymentAmount: z.number().optional(),
  discount: z.number().default(0),
  paymentMode: z.enum(["CASH", "UPI", "CARD", "BANK_TRANSFER", "CHEQUE", "FREE"]).optional(),
});

export async function createMember(input: z.infer<typeof createMemberSchema>) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const data = createMemberSchema.parse(input);

  const memberId = await generateMemberId(data.idCompany as Company, prisma);

  const member = await prisma.$transaction(async (tx) => {
    let startDate: Date | undefined;
    let expiryDate: Date | undefined;
    let pkg: any = null;

    if (data.packageId && data.startDate) {
      pkg = await tx.package.findUnique({ where: { id: data.packageId } });
      if (!pkg) throw new Error("Package not found");
      startDate = new Date(data.startDate);
      expiryDate = addDays(startDate, pkg.durationDays);
    }

    const newMember = await tx.member.create({
      data: {
        memberId,
        fullName: ucaseReq(data.fullName),
        phone: data.phone,
        whatsapp: data.whatsapp || data.phone,
        email: data.email?.trim().toLowerCase() || null,
        gender: data.gender as any,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
        bloodGroup: data.bloodGroup || null,
        weight: data.weight ?? null,
        height: data.height ?? null,
        healthConditions: ucase(data.healthConditions),
        intentionOfJoining: ucase(data.intentionOfJoining),
        address: ucase(data.address),
        emergencyContact: ucase(data.emergencyContact),
        emergencyPhone: data.emergencyPhone,
        trainerId: data.trainerId || null,
        notes: ucase(data.notes),
        status: startDate ? MemberStatus.ACTIVE : (data.status as MemberStatus),
        currentPackageId: pkg?.id ?? null,
        startDate,
        expiryDate,
        renewalDueDate: expiryDate,
        joinDate: new Date(),
      },
    });

    // Create payment + membership if package provided
    if (pkg && startDate && expiryDate) {
      const amount = data.paymentAmount ?? Number(pkg.price);
      const payment = await tx.payment.create({
        data: {
          memberId: newMember.id,
          amount,
          discount: data.discount,
          paymentMode: (data.paymentMode as PaymentMode) ?? PaymentMode.CASH,
          packageId: pkg.id,
          company: data.idCompany as Company,
          collectedById: session.user.id,
          notes: "Initial enrollment",
        },
      });

      await tx.membership.create({
        data: {
          memberId: newMember.id,
          packageId: pkg.id,
          startDate,
          expiryDate,
          company: data.idCompany as Company,
          amount,
          discount: data.discount,
          paymentId: payment.id,
        },
      });

      await tx.member.update({
        where: { id: newMember.id },
        data: { lastPaymentDate: new Date() },
      });
    }

    // Audit log
    await tx.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE",
        entity: "Member",
        entityId: newMember.id,
        newValues: { fullName: data.fullName, memberId },
      },
    });

    return newMember;
  });

  revalidatePath("/members");
  revalidatePath("/");

  return { success: true, memberId: member.memberId, id: member.id };
}

export async function updateMember(id: string, input: Partial<z.infer<typeof createMemberSchema>>) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const before = await prisma.member.findUnique({ where: { id } });

  // Prevent manually setting an expired member to active without a payment
  if (input.status === "ACTIVE" && before?.status === "EXPIRED") {
    throw new Error("Cannot manually set an expired member to active. Please record a renewal payment instead.");
  }

  // Compute which fields actually changed for the audit log
  const changedFields: string[] = [];
  if (input.fullName && input.fullName !== before?.fullName) changedFields.push("fullName");
  if (input.phone && input.phone !== before?.phone) changedFields.push("phone");
  if (input.status && input.status !== before?.status) changedFields.push("status");
  if (input.trainerId !== undefined && input.trainerId !== before?.trainerId) changedFields.push("trainerId");
  if (input.address !== undefined && input.address !== before?.address) changedFields.push("address");
  if (input.notes !== undefined && input.notes !== before?.notes) changedFields.push("notes");

  const updated = await prisma.member.update({
    where: { id },
    data: {
      fullName: input.fullName ? ucaseReq(input.fullName) : undefined,
      phone: input.phone,
      whatsapp: input.whatsapp,
      gender: input.gender as any,
      address: ucase(input.address),
      emergencyContact: ucase(input.emergencyContact),
      emergencyPhone: input.emergencyPhone,
      trainerId: input.trainerId || null,
      notes: ucase(input.notes),
      status: input.status as MemberStatus | undefined,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "UPDATE",
      entity: "Member",
      entityId: id,
      oldValues: before as any,
      newValues: { ...input, _changedFields: changedFields } as any,
    },
  });

  revalidatePath(`/members/${id}`);
  revalidatePath("/members");

  return { success: true };
}

export async function renewMembership(input: {
  memberId: string;
  packageId: string;
  startDate: string;
  amount: number;
  discount?: number;
  paymentMode: PaymentMode;
  company: Company;
  notes?: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const pkg = await prisma.package.findUnique({ where: { id: input.packageId } });
  if (!pkg) throw new Error("Package not found");

  const startDate = new Date(input.startDate);
  const expiryDate = addDays(startDate, pkg.durationDays);

  const { paymentId } = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: {
        memberId: input.memberId,
        amount: input.amount,
        discount: input.discount ?? 0,
        paymentMode: input.paymentMode,
        packageId: input.packageId,
        company: input.company,
        collectedById: session.user.id,
        notes: input.notes ?? "Renewal",
      },
    });

    await tx.membership.create({
      data: {
        memberId: input.memberId,
        packageId: input.packageId,
        startDate,
        expiryDate,
        company: input.company,
        amount: input.amount,
        discount: input.discount ?? 0,
        paymentId: payment.id,
        notes: input.notes,
      },
    });

    await tx.member.update({
      where: { id: input.memberId },
      data: {
        status: MemberStatus.ACTIVE,
        currentPackageId: input.packageId,
        startDate,
        expiryDate,
        renewalDueDate: expiryDate,
        lastPaymentDate: new Date(),
      },
    });

    await tx.auditLog.create({
      data: {
        userId: session.user.id,
        action: "RENEW",
        entity: "Member",
        entityId: input.memberId,
        newValues: { packageId: input.packageId, expiryDate: expiryDate.toISOString(), amount: input.amount },
      },
    });

    return { paymentId: payment.id };
  });

  revalidatePath(`/members/${input.memberId}`);
  revalidatePath("/members");
  revalidatePath("/renewals");
  revalidatePath("/");

  return { success: true, expiryDate, paymentId };
}

export async function toggleDoNotDisturb(memberId: string, value: boolean) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  await prisma.member.update({
    where: { id: memberId },
    data: { doNotDisturb: value },
  });

  revalidatePath(`/members/${memberId}`);
  return { success: true };
}
