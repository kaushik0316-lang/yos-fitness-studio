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

  // Get active members with high attendance who have never had a PT/semi-private package
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
      (
        SELECT pkg.name FROM payments pay
        LEFT JOIN packages pkg ON pkg.id = pay."packageId"
        WHERE pay."memberId" = m.id AND pay."isVoided" = false
        ORDER BY pay.date DESC LIMIT 1
      ) AS "packageName",
      COUNT(a.id)::bigint AS "checkIns"
    FROM members m
    LEFT JOIN member_attendance a ON a."memberId" = m.id AND a.date >= ${since}
    WHERE m.status = 'ACTIVE'
      AND NOT EXISTS (
        SELECT 1 FROM payments pay2
        LEFT JOIN packages pkg2 ON pkg2.id = pay2."packageId"
        WHERE pay2."memberId" = m.id
          AND pay2."isVoided" = false
          AND (
            pkg2.name ILIKE '%semi private%'
            OR pkg2.name ILIKE '%semi-private%'
            OR pkg2.name ILIKE '%personal training%'
          )
      )
    GROUP BY m.id, m."memberId", m."fullName", m.phone
    HAVING COUNT(a.id) >= 12
    ORDER BY "checkIns" DESC
    LIMIT 30
  `;

  return NextResponse.json(
    candidates.map((c) => ({ ...c, checkIns: Number(c.checkIns) }))
  );
}
