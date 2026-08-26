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
    categoryLabel: string | null;
    checkIns: bigint;
  }[]>`
    SELECT
      m.id,
      m."memberId",
      m."fullName",
      m.phone,
      (
        SELECT pay."categoryLabel" FROM payments pay
        WHERE pay."memberId" = m.id AND pay."isVoided" = false
        ORDER BY pay.date DESC LIMIT 1
      ) AS "categoryLabel",
      COUNT(a.id)::bigint AS "checkIns"
    FROM members m
    LEFT JOIN member_attendance a ON a."memberId" = m.id AND a.date >= ${since}
    WHERE m.status = 'ACTIVE'
      AND NOT EXISTS (
        SELECT 1 FROM memberships ms
        JOIN payments pay2 ON pay2.id = ms."paymentId"
        WHERE ms."memberId" = m.id
          AND ms."startDate" <= NOW()
          AND ms."expiryDate" >= NOW()
          AND (
            pay2."categoryLabel" ILIKE '%semi private%'
            OR pay2."categoryLabel" ILIKE '%semi-private%'
            OR pay2."categoryLabel" ILIKE '%personal training%'
          )
      )
    GROUP BY m.id, m."memberId", m."fullName", m.phone
    HAVING COUNT(a.id) >= 12
    ORDER BY "checkIns" DESC
    LIMIT 30
  `;

  return NextResponse.json(
    candidates.map((c) => ({ ...c, checkIns: Number(c.checkIns), packageName: c.categoryLabel }))
  );
}
