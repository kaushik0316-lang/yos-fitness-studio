import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function verifyPin(pin: string) {
  if (!pin) return null;
  return prisma.employee.findUnique({
    where: { pin },
    select: { id: true, fullName: true, employeeId: true, role: true },
  });
}

// GET /api/staff/enquiries?pin=xxxx
export async function GET(req: NextRequest) {
  const pin = req.nextUrl.searchParams.get("pin") ?? "";
  const employee = await verifyPin(pin);
  if (!employee) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [enquiries, employees] = await Promise.all([
    prisma.enquiry.findMany({
      include: { assignedTo: { select: { id: true, fullName: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.employee.findMany({
      where: { isActive: true },
      select: { id: true, fullName: true },
      orderBy: { fullName: "asc" },
    }),
  ]);

  return NextResponse.json({ enquiries, employee, employees });
}

// POST /api/staff/enquiries — create
export async function POST(req: NextRequest) {
  const body = await req.json();
  const employee = await verifyPin(body.pin ?? "");
  if (!employee) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Prefer employee's linked CRM user; fall back to any admin
  const emp = await prisma.employee.findUnique({
    where: { id: employee.id },
    select: { userId: true },
  });

  const createdById = emp?.userId ?? (
    await prisma.user.findFirst({ where: { role: "ADMIN", isActive: true }, select: { id: true } })
  )?.id;

  if (!createdById) {
    return NextResponse.json({ error: "No CRM user available to create enquiry" }, { status: 500 });
  }

  const enquiry = await prisma.enquiry.create({
    data: {
      name:         (body.name as string).trim().toUpperCase(),
      phone:        (body.phone as string).trim(),
      interest:     body.interest?.trim() || null,
      source:       body.source || "WALK_IN",
      assignedToId: body.assignedToId || employee.id,
      followUpDate: body.followUpDate ? new Date(body.followUpDate) : null,
      notes:        body.notes?.trim() || null,
      createdById,
    },
    include: { assignedTo: { select: { id: true, fullName: true } } },
  });

  return NextResponse.json({ enquiry });
}

// PATCH /api/staff/enquiries — update status/notes
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const employee = await verifyPin(body.pin ?? "");
  if (!employee) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const enquiry = await prisma.enquiry.update({
    where: { id: body.id },
    data: {
      ...(body.status       !== undefined && { status: body.status }),
      ...(body.notes        !== undefined && { notes: body.notes || null }),
      ...(body.followUpDate !== undefined && { followUpDate: body.followUpDate ? new Date(body.followUpDate) : null }),
    },
    include: { assignedTo: { select: { id: true, fullName: true } } },
  });

  return NextResponse.json({ enquiry });
}
