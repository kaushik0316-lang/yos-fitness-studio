import { NextRequest, NextResponse } from "next/server";
import { generateMonthlyPayroll } from "@/lib/payroll/calculator";

function isAuthorized(req: NextRequest): boolean {
  const secret =
    req.headers.get("x-cron-secret") ??
    req.headers.get("authorization")?.replace("Bearer ", "");
  return secret === process.env.CRON_SECRET;
}

/**
 * POST /api/cron/generate-payroll
 *
 * Runs on the 1st of every month via GitHub Actions.
 * Generates payroll for the previous month based on attendance.
 * Safe to run multiple times — uses upsert, won't overwrite isPaid.
 */
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  // Generate for previous month
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const month = d.getMonth() + 1;
  const year  = d.getFullYear();

  try {
    const results = await generateMonthlyPayroll(month, year);
    return NextResponse.json({
      success: true,
      month,
      year,
      generated: results.length,
      employees: results.map((r) => `${r.employeeName} → ₹${r.netSalary}`),
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message ?? String(err) }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
