import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { MemberStatus } from "@prisma/client";
import { subDays } from "date-fns";

export const dynamic = "force-dynamic";

// GET /api/members/upsell
// Returns ACTIVE members with high attendance (15+ check-ins in last 30 days)
// who are NOT on a personal training package
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const since = subDays(new Date(), 30);

  // Get active members with their attendance count in last 30 days and current package
  const candidates = await prisma.$queryRaw<{
    id: string;
    memberId: string;
    fullName: string;
    phone: string;
    packageName: string | null;
    checkIns: bigint;
  }[]>`
    SELECT
      m.id,
      m."memberId",
      m."fullName",
      m.phone,
      p.name AS "packageName",
      COUNT(a.id)::bigint AS "checkIns"
    FROM members m
    LEFT JOIN packages p ON p.id = m."currentPackageId"
    LEFT JOIN member_attendance a ON a."memberId" = m.id AND a.date >= ${since}
    WHERE m.status = 'ACTIVE'
      AND (
        p.name IS NULL
        OR (
          p.name NOT ILIKE '%semi private%'
          AND p.name NOT ILIKE '%semi-private%'
          AND p.name NOT ILIKE '%personal training%'
        )
      )
    GROUP BY m.id, m."memberId", m."fullName", m.phone, p.name
    HAVING COUNT(a.id) >= 12
    ORDER BY "checkIns" DESC
    LIMIT 30
  `;

  return NextResponse.json(
    candidates.map((c) => ({ ...c, checkIns: Number(c.checkIns) }))
  );
}
