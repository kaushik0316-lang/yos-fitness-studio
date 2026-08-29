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
