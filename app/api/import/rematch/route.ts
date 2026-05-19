import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function sigWords(name: string): string[] {
  return name
    .toUpperCase()
    .replace(/[.\-\/,]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 3);
}

function findByName(
  ghostName: string,
  nameIndex: Record<string, string[]>,
  memberWordsMap: Record<string, string[]>
): string | null {
  const rWords = sigWords(ghostName);
  if (rWords.length === 0) return null;

  const scores: Record<string, number> = {};
  for (const w of rWords) {
    for (const mid of nameIndex[w] ?? []) {
      scores[mid] = (scores[mid] ?? 0) + 1;
    }
  }

  if (Object.keys(scores).length === 0) return null;

  const topScore = Math.max(...Object.values(scores));
  const topCandidates = Object.entries(scores).filter(([, s]) => s === topScore);

  const qualified = topCandidates.filter(([mid]) => {
    const mWords = memberWordsMap[mid] ?? [];
    const coverageByReceipt = topScore / rWords.length;
    const coverageByMember  = topScore / Math.max(mWords.length, 1);
    return coverageByReceipt >= 0.5 || coverageByMember >= 0.5;
  });

  return qualified.length === 1 ? qualified[0][0] : null;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Load all ghost members (IMP-*) and all real members
  const [ghostMembers, realMembers] = await Promise.all([
    prisma.member.findMany({
      where: { memberId: { startsWith: "IMP-" } },
      select: { id: true, memberId: true, fullName: true, phone: true },
    }),
    prisma.member.findMany({
      where: { NOT: { memberId: { startsWith: "IMP-" } } },
      select: { id: true, memberId: true, fullName: true, phone: true },
    }),
  ]);

  // Build indexes over real members only
  const byPhone: Record<string, string> = {};
  const memberWordsMap: Record<string, string[]> = {};
  const nameIndex: Record<string, string[]> = {};

  for (const m of realMembers) {
    if (m.phone) byPhone[m.phone] = m.id;
    const words = sigWords(m.fullName);
    memberWordsMap[m.id] = words;
    for (const w of words) {
      if (!nameIndex[w]) nameIndex[w] = [];
      nameIndex[w].push(m.id);
    }
  }

  let rematched = 0, deleted = 0, unresolved = 0;
  const unresolvedNames: string[] = [];

  for (const ghost of ghostMembers) {
    let realId: string | null = null;

    // 1. Try phone match
    if (ghost.phone && ghost.phone !== "0000000000") {
      realId = byPhone[ghost.phone] ?? null;
    }

    // 2. Try fuzzy name match
    if (!realId) {
      realId = findByName(ghost.fullName, nameIndex, memberWordsMap);
    }

    if (realId) {
      // Re-link all payments from ghost → real member, then delete ghost
      await prisma.$transaction([
        prisma.payment.updateMany({
          where: { memberId: ghost.id },
          data:  { memberId: realId },
        }),
        prisma.member.delete({ where: { id: ghost.id } }),
      ]);
      rematched++;
      deleted++;
    } else {
      unresolved++;
      unresolvedNames.push(`${ghost.memberId}: ${ghost.fullName}`);
    }
  }

  return NextResponse.json({
    ghostsFound: ghostMembers.length,
    rematched,
    deleted,
    unresolved,
    unresolvedNames: unresolvedNames.slice(0, 50),
  });
}
