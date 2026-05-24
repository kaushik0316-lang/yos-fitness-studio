import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Find all phone numbers that appear more than once
  const dupes = await prisma.$queryRaw<{ phone: string; count: bigint }[]>`
    SELECT phone, COUNT(*) as count
    FROM "Member"
    WHERE phone IS NOT NULL AND phone != ''
    GROUP BY phone
    HAVING COUNT(*) > 1
    ORDER BY count DESC
  `;

  if (dupes.length === 0) return NextResponse.json({ duplicates: [] });

  const phones = dupes.map((d) => d.phone);
  const members = await prisma.member.findMany({
    where: { phone: { in: phones } },
    include: {
      _count: { select: { payments: true, attendances: true, memberships: true } },
    },
    orderBy: { joinDate: "asc" },
  });

  // Group by phone
  const groups: Record<string, typeof members> = {};
  for (const m of members) {
    if (!groups[m.phone]) groups[m.phone] = [];
    groups[m.phone].push(m);
  }

  const result = Object.entries(groups).map(([phone, mems]) => ({
    phone,
    members: mems.map((m) => ({
      id: m.id,
      memberId: m.memberId,
      fullName: m.fullName,
      status: m.status,
      joinDate: m.joinDate,
      payments: m._count.payments,
      attendances: m._count.attendances,
    })),
  }));

  return NextResponse.json({ duplicates: result });
}

export async function POST() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Find all duplicate phone groups
  const dupes = await prisma.$queryRaw<{ phone: string }[]>`
    SELECT phone
    FROM "Member"
    WHERE phone IS NOT NULL AND phone != ''
    GROUP BY phone
    HAVING COUNT(*) > 1
  `;

  if (dupes.length === 0) return NextResponse.json({ merged: 0, results: [] });

  const phones = dupes.map((d) => d.phone);
  const members = await prisma.member.findMany({
    where: { phone: { in: phones } },
    include: {
      _count: { select: { payments: true, attendances: true, memberships: true } },
    },
    orderBy: { joinDate: "asc" },
  });

  // Group by phone
  const groups: Record<string, typeof members> = {};
  for (const m of members) {
    if (!groups[m.phone]) groups[m.phone] = [];
    groups[m.phone].push(m);
  }

  const results: string[] = [];
  let mergedCount = 0;

  for (const [phone, mems] of Object.entries(groups)) {
    if (mems.length < 2) continue;

    // Pick the "primary" member:
    // 1. Prefer non-IMP-* members
    // 2. Among equals, prefer the one with more payments
    // 3. Among equals, prefer the one joined earliest
    const sorted = [...mems].sort((a, b) => {
      const aIsGhost = a.memberId.startsWith("IMP-") ? 1 : 0;
      const bIsGhost = b.memberId.startsWith("IMP-") ? 1 : 0;
      if (aIsGhost !== bIsGhost) return aIsGhost - bIsGhost;
      if (b._count.payments !== a._count.payments) return b._count.payments - a._count.payments;
      return new Date(a.joinDate).getTime() - new Date(b.joinDate).getTime();
    });

    const primary = sorted[0];
    const duplicates = sorted.slice(1);

    for (const dup of duplicates) {
      try {
        await prisma.$transaction(async (tx) => {
          // Move payments
          await tx.payment.updateMany({
            where: { memberId: dup.id },
            data: { memberId: primary.id },
          });
          // Move memberships
          await tx.membership.updateMany({
            where: { memberId: dup.id },
            data: { memberId: primary.id },
          });
          // Move attendances
          await tx.memberAttendance.updateMany({
            where: { memberId: dup.id },
            data: { memberId: primary.id },
          });

          // Merge fields onto primary if primary is missing them
          const updates: Record<string, any> = {};
          if (!primary.email && dup.email) updates.email = dup.email;
          if (!primary.address && dup.address) updates.address = dup.address;
          if (!primary.dateOfBirth && dup.dateOfBirth) updates.dateOfBirth = dup.dateOfBirth;
          if (!primary.gender && dup.gender) updates.gender = dup.gender;
          if (!primary.bloodGroup && dup.bloodGroup) updates.bloodGroup = dup.bloodGroup;
          if (!primary.emergencyContact && dup.emergencyContact) updates.emergencyContact = dup.emergencyContact;
          if (!primary.emergencyPhone && dup.emergencyPhone) updates.emergencyPhone = dup.emergencyPhone;
          // Keep the better expiry date
          if (dup.expiryDate && (!primary.expiryDate || new Date(dup.expiryDate) > new Date(primary.expiryDate))) {
            updates.expiryDate = dup.expiryDate;
            updates.renewalDueDate = dup.expiryDate;
          }
          // Keep the better status (ACTIVE > EXPIRED > rest)
          const statusRank: Record<string, number> = { ACTIVE: 4, FROZEN: 3, EXPIRED: 2, INACTIVE: 1, PROSPECT: 0 };
          if ((statusRank[dup.status] ?? 0) > (statusRank[primary.status] ?? 0)) {
            updates.status = dup.status;
          }

          if (Object.keys(updates).length > 0) {
            await tx.member.update({ where: { id: primary.id }, data: updates });
          }

          // Delete the duplicate
          await tx.member.delete({ where: { id: dup.id } });
        });

        results.push(`✓ Merged ${dup.fullName} (${dup.memberId}) → ${primary.fullName} (${primary.memberId}) [phone: ${phone}]`);
        mergedCount++;
      } catch (e: any) {
        results.push(`✗ Failed to merge ${dup.memberId}: ${e.message}`);
      }
    }
  }

  return NextResponse.json({ merged: mergedCount, results });
}
