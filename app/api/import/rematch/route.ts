import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function normalize(name: string) {
  return name.toLowerCase().replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim();
}

function similarity(a: string, b: string): number {
  const wa = new Set(normalize(a).split(" ").filter((w) => w.length >= 3));
  const wb = new Set(normalize(b).split(" ").filter((w) => w.length >= 3));
  if (wa.size === 0 || wb.size === 0) return 0;
  let common = 0;
  for (const w of wa) if (wb.has(w)) common++;
  return (2 * common) / (wa.size + wb.size);
}

export async function POST() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get all IMP-* ghost members
  const ghosts = await prisma.member.findMany({
    where: { memberId: { startsWith: "IMP-" } },
    include: { payments: { select: { id: true } } },
  });

  // Get all real members
  const realMembers = await prisma.member.findMany({
    where: { memberId: { not: { startsWith: "IMP-" } } },
    select: { id: true, fullName: true, phone: true },
  });

  let rematched = 0;
  let deleted = 0;
  let unresolved = 0;
  const unresolvedNames: string[] = [];

  for (const ghost of ghosts) {
    // Find best match by name similarity
    let bestMatch: (typeof realMembers)[0] | null = null;
    let bestScore = 0;
    let secondBestScore = 0;

    for (const real of realMembers) {
      const score = similarity(ghost.fullName, real.fullName);
      if (score > bestScore) {
        secondBestScore = bestScore;
        bestScore = score;
        bestMatch = real;
      } else if (score > secondBestScore) {
        secondBestScore = score;
      }
    }

    // Only accept if confident and unambiguous (score >= 0.6, gap from 2nd >= 0.15)
    if (!bestMatch || bestScore < 0.6 || bestScore - secondBestScore < 0.15) {
      unresolved++;
      unresolvedNames.push(ghost.fullName);
      continue;
    }

    // Reassign payments to real member
    if (ghost.payments.length > 0) {
      await prisma.payment.updateMany({
        where: { memberId: ghost.id },
        data: { memberId: bestMatch.id },
      });
      rematched++;
    }

    // Delete the ghost
    await prisma.member.delete({ where: { id: ghost.id } });
    deleted++;
  }

  return NextResponse.json({
    ghostsFound: ghosts.length,
    rematched,
    deleted,
    unresolved,
    unresolvedNames: unresolvedNames.slice(0, 50),
  });
}
