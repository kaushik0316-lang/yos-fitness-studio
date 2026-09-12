"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { EnquirySource, EnquiryStatus } from "@prisma/client";
import { z } from "zod";
import { toTitleCase, normalizeName } from "@/lib/utils/titleCase";

const enquirySchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(10),
  interest: z.string().optional(),
  source: z.nativeEnum(EnquirySource).default("WALK_IN"),
  assignedToId: z.string().optional(),
  followUpDate: z.string().optional(),
  notes: z.string().optional(),
});

export async function createEnquiry(input: z.infer<typeof enquirySchema>) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const data = enquirySchema.parse(input);

  await prisma.enquiry.create({
    data: {
      name: toTitleCase(normalizeName(data.name)),
      phone: data.phone.trim(),
      interest: data.interest?.trim() || null,
      source: data.source,
      assignedToId: data.assignedToId || null,
      followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
      notes: data.notes?.trim() || null,
      createdById: session.user.id,
    },
  });

  revalidatePath("/enquiries");
}

export async function updateEnquiry(id: string, input: {
  status?: EnquiryStatus;
  assignedToId?: string | null;
  followUpDate?: string | null;
  notes?: string | null;
  interest?: string | null;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  await prisma.enquiry.update({
    where: { id },
    data: {
      ...(input.status !== undefined && { status: input.status }),
      ...(input.assignedToId !== undefined && { assignedToId: input.assignedToId || null }),
      ...(input.followUpDate !== undefined && { followUpDate: input.followUpDate ? new Date(input.followUpDate) : null }),
      ...(input.notes !== undefined && { notes: input.notes || null }),
      ...(input.interest !== undefined && { interest: input.interest || null }),
    },
  });

  revalidatePath("/enquiries");
}

export async function deleteEnquiry(id: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") throw new Error("Unauthorized");

  await prisma.enquiry.delete({ where: { id } });
  revalidatePath("/enquiries");
}

export async function convertEnquiry(enquiryId: string, memberId: string | null) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  await prisma.$transaction(async (tx) => {
    await tx.enquiry.update({
      where: { id: enquiryId },
      data: {
        status: "CONVERTED",
        convertedAt: new Date(),
        memberId: memberId ?? null,
      },
    });
    if (memberId) {
      const enquiry = await tx.enquiry.findUnique({ where: { id: enquiryId }, select: { source: true } });
      await tx.member.update({
        where: { id: memberId },
        data: { leadSource: enquiry?.source ?? "WALK_IN" },
      });
    }
  });

  revalidatePath("/enquiries");
}

export async function searchMembersForLink(query: string) {
  const q = query.trim();
  if (!q) return [];
  return prisma.member.findMany({
    where: {
      enquiry: null, // not already linked to an enquiry
      OR: [
        { fullName: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
        { memberId: { contains: q, mode: "insensitive" } },
      ],
    },
    select: { id: true, fullName: true, memberId: true, phone: true },
    take: 8,
  });
}

export async function getFunnelStats() {
  const [all, byStatus, bySource, converted] = await Promise.all([
    prisma.enquiry.count(),
    prisma.enquiry.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.enquiry.groupBy({ by: ["source"], _count: { _all: true } }),
    prisma.enquiry.findMany({
      where: { status: "CONVERTED", convertedAt: { not: null } },
      select: { createdAt: true, convertedAt: true, source: true },
    }),
  ]);

  const statusMap: Record<string, number> = {};
  for (const r of byStatus) statusMap[r.status] = r._count._all;

  const sourceMap: Record<string, number> = {};
  for (const r of bySource) sourceMap[r.source] = r._count._all;

  const avgDays = converted.length
    ? Math.round(
        converted.reduce((sum, r) => {
          const days = (r.convertedAt!.getTime() - r.createdAt.getTime()) / 86400000;
          return sum + days;
        }, 0) / converted.length
      )
    : null;

  return { total: all, statusMap, sourceMap, avgDays, convertedCount: converted.length };
}
