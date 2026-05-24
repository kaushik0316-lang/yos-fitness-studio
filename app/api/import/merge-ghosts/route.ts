import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function normalize(name: string) {
  return name.toLowerCase().replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim();
}

function words(name: string): string[] {
  return normalize(name).split(" ").filter((w) => w.length >= 2);
}

// Jaccard-like word overlap
function wordOverlap(a: string, b: string): number {
  const wa = new Set(words(a));
  const wb = new Set(words(b));
  if (wa.size === 0 || wb.size === 0) return 0;
  let common = 0;
  for (const w of wa) if (wb.has(w)) common++;
  return (2 * common) / (wa.size + wb.size);
}

// Check if ghost name looks like "FIRSTNAME.INITIAL" → match on first name
function initialsMatch(ghost: string, real: string): boolean {
  const gParts = ghost.trim().split(/[\s.\/]+/).filter(Boolean);
  const rParts = real.trim().split(/\s+/).filter(Boolean);
  if (gParts.length < 1 || rParts.length < 1) return false;
  // First word matches
  if (gParts[0].toLowerCase() !== rParts[0].toLowerCase()) return false;
  // If ghost has an initial (single letter) as second part, check against real last name initial
  if (gParts[1]?.length === 1 && rParts[1]) {
    return gParts[1].toLowerCase() === rParts[1][0].toLowerCase();
  }
  // If only one word in ghost name, match on first word only (lower confidence)
  return gParts.length === 1 && rParts.length >= 1;
}

export async function POST() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ghosts = await prisma.member.findMany({
    where: { memberId: { startsWith: "IMP-" } },
    include: { payments: { select: { id: true } } },
  });

  const realMembers = await prisma.member.findMany({
    where: { memberId: { not: { startsWith: "IMP-" } } },
    select: { id: true, fullName: true, phone: true, expiryDate: true },
  });

  let merged = 0;
  let ambiguous = 0;
  let noMatch = 0;
  let statusFixed = 0;
  const today = new Date();
  const log: string[] = [];

  for (const ghost of ghosts) {
    const candidates: { member: (typeof realMembers)[0]; score: number; reason: string }[] = [];

    for (const real of realMembers) {
      const overlap = wordOverlap(ghost.fullName, real.fullName);
      const initials = initialsMatch(ghost.fullName, real.fullName);

      let score = 0;
      let reason = "";

      if (overlap >= 0.7) { score = overlap; reason = `word overlap ${(overlap * 100).toFixed(0)}%`; }
      else if (initials && overlap >= 0.4) { score = 0.65; reason = "initials match"; }
      else if (overlap >= 0.5) { score = overlap; reason = `partial overlap ${(overlap * 100).toFixed(0)}%`; }

      if (score >= 0.6) candidates.push({ member: real, score, reason });
    }

    // Sort by score desc
    candidates.sort((a, b) => b.score - a.score);

    if (candidates.length === 0) {
      noMatch++;
      log.push(`NO MATCH: ${ghost.fullName} (${ghost.memberId})`);
      continue;
    }

    // Ambiguous if top 2 are within 0.1 of each other
    if (candidates.length >= 2 && candidates[0].score - candidates[1].score < 0.1) {
      ambiguous++;
      log.push(`AMBIGUOUS: ${ghost.fullName} → ${candidates[0].member.fullName} vs ${candidates[1].member.fullName}`);
      continue;
    }

    const best = candidates[0];

    // Reassign payments
    if (ghost.payments.length > 0) {
      await prisma.payment.updateMany({
        where: { memberId: ghost.id },
        data: { memberId: best.member.id },
      });
    }

    // Re-sync member status after gaining new payments
    const latestPayment = await prisma.payment.findFirst({
      where: { memberId: best.member.id, expiryDate: { not: null } },
      orderBy: { expiryDate: "desc" },
      select: { expiryDate: true, startDate: true, packageId: true },
    });

    if (latestPayment?.expiryDate) {
      const status = latestPayment.expiryDate >= today ? "ACTIVE" : "EXPIRED";
      await prisma.member.update({
        where: { id: best.member.id },
        data: {
          status,
          expiryDate: latestPayment.expiryDate,
          renewalDueDate: latestPayment.expiryDate,
          ...(latestPayment.startDate && { startDate: latestPayment.startDate }),
          ...(latestPayment.packageId && { currentPackageId: latestPayment.packageId }),
        },
      });
      statusFixed++;
    }

    // Delete the ghost
    await prisma.member.delete({ where: { id: ghost.id } });

    merged++;
    log.push(`MERGED: ${ghost.fullName} (${ghost.memberId}) → ${best.member.fullName} [${best.reason}]`);
  }

  // Count remaining ghosts
  const remainingGhosts = await prisma.member.count({
    where: { memberId: { startsWith: "IMP-" } },
  });

  return NextResponse.json({
    merged,
    ambiguous,
    noMatch,
    statusFixed,
    remainingGhosts,
    log: log.slice(0, 200),
  });
}
