import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ── Text helpers ──────────────────────────────────────────────────────────────

/** Significant words: strip punctuation, keep words ≥ 3 chars (uppercase) */
function sigWords(name: string): string[] {
  return name
    .toUpperCase()
    .replace(/[.\-\/,;()]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 3);
}

/** Single-letter tokens that act as initials */
function initials(name: string): string[] {
  return name
    .toUpperCase()
    .replace(/[.\-\/,;()]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length === 1);
}

/** Levenshtein distance (iterative, O(mn)) */
function lev(a: string, b: string): number {
  const m = a.length, n = b.length;
  const row = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = row[j];
      row[j] =
        a[i - 1] === b[j - 1]
          ? prev
          : 1 + Math.min(prev, row[j], row[j - 1]);
      prev = tmp;
    }
  }
  return row[n];
}

/**
 * Score how well `ghostName` matches `memberName`.
 * Returns 0–1 (1 = perfect match).
 *
 * Scoring per ghost word:
 *   exact match with a member word      → +2.0
 *   Levenshtein ≤1  (word len ≥ 4)     → +1.5
 *   Levenshtein ≤2  (word len ≥ 6)     → +1.2
 *   no match                            →  0
 * Ghost initials that match first letter of any member word → +0.5 each
 */
function matchScore(ghostName: string, memberName: string): number {
  const gw = sigWords(ghostName);
  const mw = sigWords(memberName);
  const gi = initials(ghostName);

  if (gw.length === 0) return 0;

  let score = 0;

  for (const g of gw) {
    let best = 0;
    for (const m of mw) {
      if (g === m) { best = 2.0; break; }
      const d = lev(g, m);
      const maxLen = Math.max(g.length, m.length);
      if (d <= 1 && maxLen >= 4) best = Math.max(best, 1.5);
      else if (d <= 2 && maxLen >= 6) best = Math.max(best, 1.2);
    }
    score += best;
  }

  // Initials bonus: "DHIVYA.V" → initial "V" should boost match to "DHIVYA VASANTH"
  for (const init of gi) {
    for (const m of mw) {
      if (m[0] === init) { score += 0.5; break; }
    }
  }

  const maxPossible = 2.0 * gw.length + 0.5 * gi.length;
  return score / maxPossible;
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Load data ────────────────────────────────────────────────────────────────
  const [ghostMembers, realMembers] = await Promise.all([
    prisma.member.findMany({
      where: { memberId: { startsWith: "IMP-" } },
      select: { id: true, fullName: true, phone: true },
    }),
    prisma.member.findMany({
      where: { memberId: { not: { startsWith: "IMP-" } } },
      select: { id: true, fullName: true, phone: true },
    }),
  ]);

  // Build phone index for real members (quick exact lookup)
  const realByPhone: Record<string, string> = {}; // phone → real member id
  for (const m of realMembers) {
    if (m.phone && m.phone !== "0000000000") realByPhone[m.phone] = m.id;
  }

  const SCORE_THRESHOLD  = 0.75; // minimum score to even consider a match
  const AMBIGUITY_RATIO  = 1.25; // top score must be ≥ 25% better than runner-up

  let merged = 0, ambiguous = 0, noMatch = 0;
  const log: string[] = [];

  for (const ghost of ghostMembers) {
    // 1. Try phone first (exact, highest confidence)
    if (ghost.phone && ghost.phone !== "0000000000" && realByPhone[ghost.phone]) {
      const targetId = realByPhone[ghost.phone];
      await prisma.payment.updateMany({
        where: { memberId: ghost.id },
        data: { memberId: targetId },
      });
      await prisma.member.delete({ where: { id: ghost.id } });
      merged++;
      continue;
    }

    // 2. Fuzzy name matching
    const scored = realMembers
      .map((m) => ({ id: m.id, name: m.fullName, score: matchScore(ghost.fullName, m.fullName) }))
      .filter((x) => x.score >= SCORE_THRESHOLD)
      .sort((a, b) => b.score - a.score);

    if (scored.length === 0) {
      noMatch++;
      continue;
    }

    const top = scored[0];

    // Require unambiguous winner
    if (scored.length >= 2 && top.score / scored[1].score < AMBIGUITY_RATIO) {
      ambiguous++;
      log.push(`Ambiguous: "${ghost.fullName}" → "${top.name}" (${top.score.toFixed(2)}) vs "${scored[1].name}" (${scored[1].score.toFixed(2)})`);
      continue;
    }

    // Merge: reassign payments, delete ghost
    await prisma.payment.updateMany({
      where: { memberId: ghost.id },
      data: { memberId: top.id },
    });
    await prisma.member.delete({ where: { id: ghost.id } });
    merged++;
    log.push(`Merged: "${ghost.fullName}" → "${top.name}" (score ${top.score.toFixed(2)})`);
  }

  // After merging, re-sync status for any member who gained new payments
  const today = new Date();
  const newGhosts = await prisma.member.findMany({
    where: { memberId: { startsWith: "IMP-" } },
    select: { id: true },
  });
  const remainingGhostIds = newGhosts.map((g) => g.id);

  const latestExpiry = await prisma.payment.groupBy({
    by: ["memberId"],
    where: {
      expiryDate: { not: null },
      ...(remainingGhostIds.length > 0 ? { memberId: { notIn: remainingGhostIds } } : {}),
    },
    _max: { expiryDate: true },
  });

  let statusFixed = 0;
  const syncBatch = latestExpiry
    .filter((r) => r._max.expiryDate != null)
    .map((r) => {
      const exp = r._max.expiryDate!;
      const status = exp >= today ? "ACTIVE" : "EXPIRED";
      statusFixed++;
      return prisma.member.update({
        where: { id: r.memberId },
        data: { status, expiryDate: exp },
      });
    });

  for (let i = 0; i < syncBatch.length; i += 50) {
    await Promise.all(syncBatch.slice(i, i + 50));
  }

  return NextResponse.json({
    merged,
    ambiguous,
    noMatch,
    statusFixed,
    remainingGhosts: remainingGhostIds.length,
    log: log.slice(0, 200), // cap log size
  });
}
