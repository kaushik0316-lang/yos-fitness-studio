import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toTitleCase } from "@/lib/utils/titleCase";

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
      include: {
        assignedTo: { select: { id: true, fullName: true } },
        member: { select: { id: true, memberId: true, fullName: true } },
      },
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

  // Fix 4: duplicate phone check
  const phone = (body.phone as string).trim();
  const existing = await prisma.enquiry.findFirst({
    where: { phone, status: { notIn: ["CONVERTED", "LOST"] } },
    select: { id: true, name: true },
  });
  if (existing) {
    return NextResponse.json(
      { error: `An active enquiry already exists for this phone number (${toTitleCase(existing.name)}).` },
      { status: 409 }
    );
  }

  const enquiry = await prisma.enquiry.create({
    data: {
      name:         (body.name as string).trim().toUpperCase(),
      phone,
      interest:     body.interest?.trim() || null,
      source:       body.source || "WALK_IN",
      assignedToId: body.assignedToId || employee.id,
      followUpDate: body.followUpDate ? new Date(body.followUpDate) : null,
      notes:        body.notes?.trim() || null,
      createdById,
    },
    include: {
      assignedTo: { select: { id: true, fullName: true } },
      member: { select: { id: true, memberId: true, fullName: true } },
    },
  });

  // Instant WhatsApp first response — fire and forget
  try {
    const { getActiveProvider } = await import("@/lib/messaging/provider");
    const phone = enquiry.phone.replace(/\D/g, "").slice(-10);
    const firstName = toTitleCase(enquiry.name);
    await getActiveProvider().send({
      to: `+91${phone}`,
      channel: "WHATSAPP",
      message: `Hi ${firstName}! 👋 Thanks for your interest in Yos Fitness Studio.\n\nOur team will get in touch with you shortly. Feel free to reply here with any questions!\n\n📍 Mylapore, Chennai`,
    });
  } catch {}

  return NextResponse.json({ enquiry });
}

// PATCH /api/staff/enquiries — update status/notes or convert
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const employee = await verifyPin(body.pin ?? "");
  if (!employee) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Unlink member — reset enquiry back to previous status and clear member link
  if (body.action === "unconvert") {
    const enq = await prisma.enquiry.findUnique({
      where: { id: body.enquiryId },
      select: { memberId: true, notes: true },
    });
    // Fix 5: restore previous status stored in notes during convert
    const prevMatch = enq?.notes?.match(/\[prev_status:([A-Z_]+)\]/);
    const prevStatus = prevMatch ? prevMatch[1] : "CONTACTED";
    const cleanNotes = enq?.notes?.replace(/\s*\[prev_status:[A-Z_]+\]/, "").trim() || null;

    await prisma.$transaction(async (tx) => {
      if (enq?.memberId) {
        await tx.member.update({
          where: { id: enq.memberId },
          data: { leadSource: null },
        });
      }
      await tx.enquiry.update({
        where: { id: body.enquiryId },
        data: { status: prevStatus as any, convertedAt: null, memberId: null, notes: cleanNotes },
      });
    });
    const updated = await prisma.enquiry.findUnique({
      where: { id: body.enquiryId },
      include: {
        assignedTo: { select: { id: true, fullName: true } },
        member: { select: { id: true, memberId: true, fullName: true } },
      },
    });
    return NextResponse.json({ enquiry: updated });
  }

  // Convert action: mark CONVERTED and optionally link member
  if (body.action === "convert") {
    const { enquiryId, memberId } = body;
    await prisma.$transaction(async (tx) => {
      // Fix 5: snapshot current status in notes so unconvert can restore it
      const current = await tx.enquiry.findUnique({
        where: { id: enquiryId },
        select: { status: true, notes: true },
      });
      const notesWithPrev = current?.status && current.status !== "CONVERTED"
        ? `${current.notes ?? ""} [prev_status:${current.status}]`.trim()
        : current?.notes ?? null;

      await tx.enquiry.update({
        where: { id: enquiryId },
        data: { status: "CONVERTED", convertedAt: new Date(), memberId: memberId ?? null, notes: notesWithPrev },
      });
      if (memberId) {
        const enq = await tx.enquiry.findUnique({ where: { id: enquiryId }, select: { source: true } });
        await tx.member.update({
          where: { id: memberId },
          data: { leadSource: enq?.source ?? "WALK_IN" },
        });
      }
    });
    const updated = await prisma.enquiry.findUnique({
      where: { id: enquiryId },
      include: {
        assignedTo: { select: { id: true, fullName: true } },
        member: { select: { id: true, memberId: true, fullName: true } },
      },
    });
    return NextResponse.json({ enquiry: updated });
  }

  // Regular update
  const enquiry = await prisma.enquiry.update({
    where: { id: body.id },
    data: {
      ...(body.status        !== undefined && { status: body.status }),
      ...(body.notes         !== undefined && { notes: body.notes || null }),
      ...(body.followUpDate  !== undefined && { followUpDate: body.followUpDate ? new Date(body.followUpDate) : null }),
      ...(body.assignedToId  !== undefined && { assignedToId: body.assignedToId || null }),
    },
    include: {
      assignedTo: { select: { id: true, fullName: true } },
      member: { select: { id: true, memberId: true, fullName: true } },
    },
  });

  return NextResponse.json({ enquiry });
}

// GET /api/staff/enquiries/members?pin=xxxx&q=...
// Searched separately via a sub-path — handled in members/route.ts
