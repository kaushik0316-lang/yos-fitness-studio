"use server";

import { prisma } from "@/lib/prisma";

export async function quickSearchMembers(query: string) {
  if (!query || query.trim().length < 2) return [];
  const q = query.trim();
  const members = await prisma.member.findMany({
    where: {
      OR: [
        { fullName: { contains: q, mode: "insensitive" } },
        { memberId: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
      ],
    },
    select: {
      id: true,
      memberId: true,
      fullName: true,
      phone: true,
      status: true,
      expiryDate: true,
    },
    take: 8,
    orderBy: { fullName: "asc" },
  });
  return members;
}
