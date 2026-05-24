import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Returns true for obvious placeholder/fake phone numbers */
function isFakePhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 9) return true;
  // All same digit: 0000000000, 1111111111, 9999999999 etc.
  if (new Set(digits.split("")).size === 1) return true;
  // Sequential patterns
  if (digits === "1234567890" || digits === "9876543210") return true;
  return false;
}

async function getDuplicateGroups() {
  // Fetch all members with their payment/attendance counts
  const all = await prisma.member.findMany({
    where: { phone: { not: "" } },
    select: {
      id: true,
      memberId: true,
      fullName: true,
      phone: true,
      status: true,
      joinDate: true,
      email: true,
      address: true,
      dateOfBirth: true,
      gender: true,
      bloodGroup: true,
      emergencyContact: true,
      emergencyPhone: true,
      expiryDate: true,
      renewalDueDate: true,
      _count: { select: { payments: true, attendances: true } },
    },
  });

  // Group by phone
  const phoneMap = new Map<string, typeof all>();
  for (const m of all) {
    if (!m.phone) continue;
    const key = m.phone.trim();
    if (!phoneMap.has(key)) phoneMap.set(key, []);
    phoneMap.get(key)!.push(m);
  }

  // Keep only real duplicate groups (exclude fake/placeholder phone numbers)
  return Array.from(phoneMap.entries())
    .filter(([phone, mems]) => mems.length > 1 && !isFakePhone(phone))
    .map(([phone, mems]) => {
      // Sort: non-IMP first, then by payment count desc, then by joinDate asc
      const sorted = [...mems].sort((a, b) => {
        const aGhost = a.memberId.startsWith("IMP-") ? 1 : 0;
        const bGhost = b.memberId.startsWith("IMP-") ? 1 : 0;
        if (aGhost !== bGhost) return aGhost - bGhost;
        if (b._count.payments !== a._count.payments) return b._count.payments - a._count.payments;
        return new Date(a.joinDate).getTime() - new Date(b.joinDate).getTime();
      });
      return { phone, members: sorted };
    });
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

    if (groups.length === 0)
      return NextResponse.json({ merged: 0, results: [] });

    const results: string[] = [];
    let mergedCount = 0;

    for (const { phone, members } of groups) {
      const primary = members[0];
      const duplicates = members.slice(1);

      for (const dup of duplicates) {
        try {
          await prisma.$transaction(async (tx) => {
            await tx.payment.updateMany({ where: { memberId: dup.id }, data: { memberId: primary.id } });
            await tx.membership.updateMany({ where: { memberId: dup.id }, data: { memberId: primary.id } });
            await tx.memberAttendance.updateMany({ where: { memberId: dup.id }, data: { memberId: primary.id } });

            // Merge missing fields onto primary
            const updates: Record<string, any> = {};
            if (!primary.email && dup.email) updates.email = dup.email;
            if (!primary.address && dup.address) updates.address = dup.address;
            if (!primary.dateOfBirth && dup.dateOfBirth) updates.dateOfBirth = dup.dateOfBirth;
            if (!primary.gender && dup.gender) updates.gender = dup.gender;
            if (!primary.bloodGroup && dup.bloodGroup) updates.bloodGroup = dup.bloodGroup;
            if (!primary.emergencyContact && dup.emergencyContact) updates.emergencyContact = dup.emergencyContact;
            if (!primary.emergencyPhone && dup.emergencyPhone) updates.emergencyPhone = dup.emergencyPhone;
            // Use whichever expiry date is further in the future
            if (dup.expiryDate && (!primary.expiryDate || new Date(dup.expiryDate) > new Date(primary.expiryDate))) {
              updates.expiryDate = dup.expiryDate;
              updates.renewalDueDate = dup.expiryDate;
            }
            // Prefer the better status
            const rank: Record<string, number> = { ACTIVE: 4, FROZEN: 3, EXPIRED: 2, INACTIVE: 1, PROSPECT: 0 };
            if ((rank[dup.status] ?? 0) > (rank[primary.status] ?? 0)) {
              updates.status = dup.status;
            }

            if (Object.keys(updates).length > 0) {
              await tx.member.update({ where: { id: primary.id }, data: updates });
            }

            await tx.member.delete({ where: { id: dup.id } });
          });

          results.push(`✓ ${dup.fullName} (${dup.memberId}) merged into ${primary.fullName} (${primary.memberId}) [${phone}]`);
          mergedCount++;
        } catch (e: any) {
          results.push(`✗ Failed to merge ${dup.memberId}: ${e.message}`);
        }
      }
    }

    return NextResponse.json({ merged: mergedCount, results });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
