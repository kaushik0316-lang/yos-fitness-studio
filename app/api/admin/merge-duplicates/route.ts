import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Returns true for obvious placeholder/fake phone numbers */
function isFakePhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 9) return true;
  if (new Set(digits.split("")).size === 1) return true; // all same digit
  if (digits === "1234567890" || digits === "9876543210") return true;
  return false;
}

/**
 * Returns true if two names are likely the same person written differently.
 * Uses Jaccard word-overlap >= 0.25 OR recall >= 0.5 (one name mostly inside the other).
 */
function areSimilarNames(a: string, b: string): boolean {
  const tokenise = (s: string) =>
    s.toLowerCase().replace(/[^a-z\s]/g, "").split(/\s+/).filter((w) => w.length > 1);

  const wA = tokenise(a);
  const wB = tokenise(b);
  if (wA.length === 0 || wB.length === 0) return false;

  // Count common words (without using Set iteration)
  let common = 0;
  for (let i = 0; i < wA.length; i++) {
    for (let j = 0; j < wB.length; j++) {
      if (wA[i] === wB[j]) { common++; break; }
    }
  }
  if (common === 0) return false;

  // Build union count without spread-Set
  const unionWords: string[] = wA.slice();
  for (let j = 0; j < wB.length; j++) {
    if (!wA.includes(wB[j])) unionWords.push(wB[j]);
  }
  const union = unionWords.length;
  const jaccard = common / union;
  const recall = common / Math.min(wA.length, wB.length);

  return jaccard >= 0.25 || recall >= 0.5;
}

type MemberRow = {
  id: string; memberId: string; fullName: string; phone: string;
  status: string; joinDate: Date;
  email: string | null; address: string | null; dateOfBirth: Date | null;
  gender: string | null; bloodGroup: string | null;
  emergencyContact: string | null; emergencyPhone: string | null;
  expiryDate: Date | null; renewalDueDate: Date | null;
  _count: { payments: number; attendances: number };
};

type DupeGroup = { phone: string; members: MemberRow[] };

async function getDuplicateGroups(): Promise<DupeGroup[]> {
  const all: MemberRow[] = await prisma.member.findMany({
    where: { phone: { not: "" } },
    select: {
      id: true, memberId: true, fullName: true, phone: true,
      status: true, joinDate: true,
      email: true, address: true, dateOfBirth: true,
      gender: true, bloodGroup: true,
      emergencyContact: true, emergencyPhone: true,
      expiryDate: true, renewalDueDate: true,
      _count: { select: { payments: true, attendances: true } },
    },
  }) as MemberRow[];

  // Group by phone using a plain object map
  const phoneMap: Record<string, MemberRow[]> = {};
  for (let i = 0; i < all.length; i++) {
    const m = all[i];
    if (!m.phone) continue;
    const key = m.phone.trim();
    if (!phoneMap[key]) phoneMap[key] = [];
    phoneMap[key].push(m);
  }

  const groups: DupeGroup[] = [];
  const phones = Object.keys(phoneMap);

  for (let pi = 0; pi < phones.length; pi++) {
    const phone = phones[pi];
    const mems = phoneMap[phone];
    if (mems.length < 2 || isFakePhone(phone)) continue;

    // Sort: non-IMP first, then more payments, then earlier joinDate
    const sorted = mems.slice().sort((a, b) => {
      const aGhost = a.memberId.startsWith("IMP-") ? 1 : 0;
      const bGhost = b.memberId.startsWith("IMP-") ? 1 : 0;
      if (aGhost !== bGhost) return aGhost - bGhost;
      if (b._count.payments !== a._count.payments) return b._count.payments - a._count.payments;
      return new Date(a.joinDate).getTime() - new Date(b.joinDate).getTime();
    });

    const primary = sorted[0];
    const mergeable: MemberRow[] = [];
    for (let i = 1; i < sorted.length; i++) {
      if (areSimilarNames(primary.fullName, sorted[i].fullName)) {
        mergeable.push(sorted[i]);
      }
    }

    if (mergeable.length > 0) {
      groups.push({ phone, members: [primary, ...mergeable] });
    }
  }

  return groups;
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const groups = await getDuplicateGroups();

    const duplicates = groups.map(({ phone, members }) => ({
      phone,
      members: members.map((m) => ({
        id: m.id,
        memberId: m.memberId,
        fullName: m.fullName,
        status: m.status,
        payments: m._count.payments,
        attendances: m._count.attendances,
      })),
    }));

    return NextResponse.json({ duplicates });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const groups = await getDuplicateGroups();
    if (groups.length === 0) return NextResponse.json({ merged: 0, results: [] });

    const results: string[] = [];
    let mergedCount = 0;

    for (let gi = 0; gi < groups.length; gi++) {
      const { phone, members } = groups[gi];
      const primary = members[0];
      const duplicates = members.slice(1);

      for (let di = 0; di < duplicates.length; di++) {
        const dup = duplicates[di];
        try {
          await prisma.$transaction(async (tx) => {
            await tx.payment.updateMany({ where: { memberId: dup.id }, data: { memberId: primary.id } });
            await tx.membership.updateMany({ where: { memberId: dup.id }, data: { memberId: primary.id } });
            await tx.memberAttendance.updateMany({ where: { memberId: dup.id }, data: { memberId: primary.id } });

            const updates: Record<string, any> = {};
            if (!primary.email && dup.email) updates.email = dup.email;
            if (!primary.address && dup.address) updates.address = dup.address;
            if (!primary.dateOfBirth && dup.dateOfBirth) updates.dateOfBirth = dup.dateOfBirth;
            if (!primary.gender && dup.gender) updates.gender = dup.gender;
            if (!primary.bloodGroup && dup.bloodGroup) updates.bloodGroup = dup.bloodGroup;
            if (!primary.emergencyContact && dup.emergencyContact) updates.emergencyContact = dup.emergencyContact;
            if (!primary.emergencyPhone && dup.emergencyPhone) updates.emergencyPhone = dup.emergencyPhone;
            if (dup.expiryDate && (!primary.expiryDate || new Date(dup.expiryDate) > new Date(primary.expiryDate))) {
              updates.expiryDate = dup.expiryDate;
              updates.renewalDueDate = dup.expiryDate;
            }
            const rank: Record<string, number> = { ACTIVE: 4, FROZEN: 3, EXPIRED: 2, INACTIVE: 1, PROSPECT: 0 };
            if ((rank[dup.status] ?? 0) > (rank[primary.status] ?? 0)) updates.status = dup.status;

            if (Object.keys(updates).length > 0) {
              await tx.member.update({ where: { id: primary.id }, data: updates });
            }
            await tx.member.delete({ where: { id: dup.id } });
          });

          results.push(`✓ ${dup.fullName} (${dup.memberId}) → ${primary.fullName} (${primary.memberId}) [${phone}]`);
          mergedCount++;
        } catch (e: any) {
          results.push(`✗ Failed ${dup.memberId}: ${e.message}`);
        }
      }
    }

    return NextResponse.json({ merged: mergedCount, results });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
