import { NextRequest, NextResponse } from "next/server";
import { getActiveAnnouncements } from "@/lib/actions/announcements";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const packageName = searchParams.get("pkg");
  const status = searchParams.get("status") ?? "ACTIVE";
  const rows = await getActiveAnnouncements(packageName, status);
  return NextResponse.json(rows);
}
