import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rateLimit";

const joinSchema = z.object({
  joinCode: z.string().min(1, "Join code is required"),
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().regex(/^\d{10}$/, "Enter a valid 10-digit phone number"),
  role: z.enum(["FRONT_DESK", "TRAINER", "CLEANER"]),
  pin: z.string().regex(/^\d{4}$/, "PIN must be exactly 4 digits"),
});

async function generateEmployeeId(prisma: any): Promise<string> {
  const count = await prisma.employee.count();
  return `EMP-${String(count + 1).padStart(3, "0")}`;
}

export async function POST(req: NextRequest) {
  try {
    // ── Rate limit: 3 attempts / hour per IP; block 1 hour on breach ────────
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
    const rl = checkRateLimit(`${ip}:join`, { maxAttempts: 3, windowMs: 60 * 60 * 1000, blockMs: 60 * 60 * 1000 });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Too many registration attempts. Try again in ${rl.retryAfterSeconds} seconds.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const data = joinSchema.parse(body);

    // ── 1. Validate join code ────────────────────────────────────────────────
    const validCode = process.env.STAFF_JOIN_CODE;
    if (!validCode) {
      // If env var not set, registration is disabled
      return NextResponse.json({ error: "Staff registration is currently disabled. Contact the admin." }, { status: 403 });
    }
    if (data.joinCode.trim().toLowerCase() !== validCode.trim().toLowerCase()) {
      return NextResponse.json({ error: "Invalid join code. Ask your manager for the correct code." }, { status: 403 });
    }

    // ── 2. Check phone uniqueness ────────────────────────────────────────────
    const phoneTaken = await prisma.employee.findFirst({ where: { phone: data.phone } });
    if (phoneTaken) {
      return NextResponse.json({ error: "This phone number is already registered. Contact the admin if you need help." }, { status: 409 });
    }

    // ── 3. Check PIN uniqueness ──────────────────────────────────────────────
    const pinTaken = await prisma.employee.findUnique({ where: { pin: data.pin } });
    if (pinTaken) {
      return NextResponse.json({ error: "That PIN is already in use. Please choose a different one." }, { status: 409 });
    }

    // ── 4. Create employee (inactive until admin approves) ───────────────────
    const employeeId = await generateEmployeeId(prisma);
    const employee = await prisma.employee.create({
      data: {
        employeeId,
        fullName: data.fullName.trim().toUpperCase(),
        phone: data.phone,
        role: data.role,
        joinDate: new Date(),
        salaryType: "FIXED_MONTHLY",
        pin: data.pin,
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      employeeId: employee.employeeId,
      fullName: employee.fullName,
    });
  } catch (err: any) {
    if (err.name === "ZodError") {
      return NextResponse.json({ error: err.errors[0]?.message ?? "Invalid input." }, { status: 400 });
    }
    console.error("[join]", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
