import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/import/fix-company
 * Previously updated member primaryCompany from payment records.
 * The primaryCompany field has been removed from the Member model — this endpoint is no longer applicable.
 */
export async function POST(req: NextRequest) {
  return NextResponse.json({ message: "No longer applicable" });
}
