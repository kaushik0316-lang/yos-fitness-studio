import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const joinSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().min(10, "Enter a valid phone number"),
  role: z.enum(["FRONT_DESK", "TRAINER", "CLEANER", "MANAGER"]),
  pin: z.string().regex(/^\d{4,6}$/, "PIN must be 4–6 digits"),
});

async function generateEmployeeId(prisma: any): Promise<string> {
  const count = await prisma.employee.count();
  return `EMP-${String(count + 1).padStart(3, "0")}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = joinSchema.parse(body);

    // Check PIN uniqueness
    const pinTaken = await prisma.employee.findUnique({ where: { pin: data.pin } });
    if (pinTaken) {
      return NextResponse.json({ error: "That PIN is already in use. Please choose a different one." }, { status: 409 });
    }

    const employeeId = await generateEmployeeId(prisma);

    const employee = await prisma.employee.create({
      data: {
        employeeId,
        fullName: data.fullName,
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
