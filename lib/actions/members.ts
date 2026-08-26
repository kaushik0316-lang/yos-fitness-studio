"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { addDays } from "date-fns";
import { Company, MemberStatus, PaymentMode } from "@prisma/client";
import { generateMemberId, ucaseReq, ucase } from "@/lib/utils";
import { normalizeName, toTitleCase } from "@/lib/utils/titleCase";
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
        fullName: toTitleCase(normalizeName(data.fullName)),
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

  // Welcome WhatsApp — fire and forget (don't block on failure)
  try {
    const { getActiveProvider } = await import("@/lib/messaging/provider");
    const phone = (data.whatsapp || data.phone).replace(/\D/g, "");
    const firstName = member.fullName.split(" ")[0];
    const portalLink = `https://yosfitnessstudio.in/member-portal?id=${member.memberId}`;
    await getActiveProvider().send({
      to: phone.startsWith("91") || phone.length === 10 ? `+91${phone.slice(-10)}` : `+${phone}`,
      channel: "WHATSAPP",
      message: `Welcome to Yos Fitness Studio, ${firstName}! 🎉\n\nYour Member ID is *${member.memberId}*.\n\nView your membership, attendance & payments anytime:\n👉 ${portalLink}\n\nCheck in by scanning the QR at the front desk. See you at the gym! 💪`,
    });
  } catch {}

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
      fullName: input.fullName ? toTitleCase(normalizeName(input.fullName)) : undefined,
      phone: input.phone || undefined,
      whatsapp: input.whatsapp || null,
      email: input.email || null,
      gender: (input.gender || null) as any,
      address: ucase(input.address),
      emergencyContact: ucase(input.emergencyContact),
      emergencyPhone: input.emergencyPhone || null,
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
  // Package-based path (existing)
  packageId?: string;
  // Category-based path (same as New Receipt)
  categoryLabel?: string;
  periodLabel?: string;
  durationDays?: number;
  expiryDate?: string;
  startDate: string;
  amount: number;
  discount?: number;
  paymentMode: PaymentMode;
  company: Company;
  notes?: string;
  commissionTrainerId?: string;
  commissionPct?: number;
  memberName?: string;
  packageName?: string;
  billDate?: string;
  pendingAmount?: number;
  splitPaymentMode?: PaymentMode;
  splitAmount?: number;
  cardCharge?: number;
  soldById?: string;
  soldById2?: string;
  soldByPct?: number;
  transactionRef?: string;
  paymentType?: string;
  previousReceiptNo?: number;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const startDate = new Date(input.startDate);
  let expiryDate: Date;
  let isPT = false;

  if (input.packageId) {
    // Package-based path
    const pkg = await prisma.package.findUnique({ where: { id: input.packageId } });
    if (!pkg) throw new Error("Package not found");
    expiryDate = addDays(startDate, pkg.durationDays);
    isPT = /pt|personal\s*train|semi\s*private/i.test(pkg.name);
  } else if (input.categoryLabel && input.durationDays) {
    // Category-based path (like New Receipt)
    expiryDate = input.expiryDate ? new Date(input.expiryDate) : addDays(startDate, input.durationDays);
    isPT = /pt|personal\s*train|semi\s*private/i.test(input.categoryLabel);
  } else {
    throw new Error("Either packageId or categoryLabel + durationDays is required");
  }

  const { paymentId } = await prisma.$transaction(async (tx) => {
    // Auto-assign receiptNumber per company (MAX + 1, race-safe inside transaction)
    const agg = await tx.payment.aggregate({
      _max: { receiptNumber: true },
      where: { company: input.company },
    });
    const nextReceiptNumber = (agg._max.receiptNumber ?? 0) + 1;

    const payment = await tx.payment.create({
      data: {
        memberId: input.memberId,
        amount: input.amount,
        discount: input.discount ?? 0,
        paymentMode: input.paymentMode,
        packageId: input.packageId ?? null,
        categoryLabel: input.categoryLabel ?? null,
        periodLabel: input.periodLabel ?? null,
        company: input.company,
        collectedById: session.user.id,
        notes: input.notes ?? "Renewal",
        receiptNumber: nextReceiptNumber,
        date: input.billDate ? new Date(input.billDate) : new Date(),
        pendingAmount: input.pendingAmount ?? 0,
        splitPaymentMode: input.splitPaymentMode ?? null,
        splitAmount: input.splitAmount ?? null,
        cardCharge: input.cardCharge && input.cardCharge > 0 ? input.cardCharge : null,
        soldById: input.soldById ?? null,
        soldById2: input.soldById2 ?? null,
        soldByPct: input.soldById2 ? (input.soldByPct ?? 100) : 100,
        transactionRef: input.transactionRef ?? null,
        paymentType: (input.paymentType as any) ?? "RENEWAL",
        previousReceiptNo: input.previousReceiptNo ?? null,
        expiryDate,
        startDate,
      },
    });

    // Membership record only when a package is selected (requires packageId)
    if (input.packageId) {
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
    }

    await tx.member.update({
      where: { id: input.memberId },
      data: {
        status: MemberStatus.ACTIVE,
        lastPaymentDate: new Date(),
        // PT packages don't own the member's expiry — only General membership does
        ...(!isPT && {
          ...(input.packageId && { currentPackageId: input.packageId }),
          startDate,
          expiryDate,
          renewalDueDate: expiryDate,
        }),
      },
    });

    if (input.commissionTrainerId && input.commissionPct) {
      const now = new Date();
      const commissionAmount = Math.round(input.amount * input.commissionPct) / 100;
      await tx.trainerCommission.create({
        data: {
          trainerId:       input.commissionTrainerId,
          paymentId:       payment.id,
          clientName:      input.memberName ?? "Unknown",
          packageType:     input.packageName ?? "OTHER",
          totalAmount:     input.amount,
          commissionPct:   input.commissionPct,
          commissionAmount,
          month:           now.getMonth() + 1,
          year:            now.getFullYear(),
        },
      });
    }

    await tx.auditLog.create({
      data: {
        userId: session.user.id,
        action: "RENEW",
        entity: "Member",
        entityId: input.memberId,
        newValues: { packageId: input.packageId ?? null, categoryLabel: input.categoryLabel ?? null, expiryDate: expiryDate.toISOString(), amount: input.amount },
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

export async function toggleKioskCheckin(memberId: string, value: boolean) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.role !== "ADMIN") throw new Error("Admin only");

  await prisma.member.update({
    where: { id: memberId },
    data: { allowKioskCheckin: value },
  });

  revalidatePath(`/members/${memberId}`);
  return { success: true };
}

export async function setMemberPin(memberId: string, pin: string | null) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.role !== "ADMIN") throw new Error("Admin only");

  if (pin !== null && !/^\d{4}$/.test(pin)) throw new Error("PIN must be exactly 4 digits");

  if (pin !== null) {
    const conflict = await prisma.member.findFirst({ where: { pin, NOT: { id: memberId } }, select: { memberId: true } });
    if (conflict) throw new Error(`PIN already in use by member ${conflict.memberId}`);
  }

  await prisma.member.update({
    where: { id: memberId },
    data: { pin: pin ?? null },
  });

  revalidatePath(`/members/${memberId}`);
  return { success: true };
}
