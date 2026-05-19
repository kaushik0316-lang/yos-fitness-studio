import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

// Excel serial date → JS Date (UTC)
function excelDate(serial: unknown): Date | null {
  if (typeof serial !== "number" || serial < 1) return null;
  return new Date(Math.round((serial - 25569) * 86400 * 1000));
}

function normalizeGender(raw: unknown): "MALE" | "FEMALE" | "OTHER" | null {
  const s = String(raw ?? "").trim().toUpperCase().replace(/\s+/g, "");
  if (s === "FEMALE" || s === "FEMLAE") return "FEMALE";
  if (s === "MALE") return "MALE";
  if (s === "MFMALE" || s === "OTHER") return "OTHER";
  return null; // CANCELED, blank etc — caller decides
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  // Members are company-agnostic. Use YF- prefix for all imported IDs.
  // primaryCompany defaults to YOS_FITNESS and can be edited per-member later.
  const prefix = "YF";
  const buffer = Buffer.from(await file.arrayBuffer());
  const wb = XLSX.read(buffer, { type: "buffer" });

  // Pick Sheet1 (skip Chart sheets)
  const sheetName = wb.SheetNames.find((n) => n === "Sheet1") ?? wb.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName], {
    header: 1,
    defval: "",
    raw: true,
  });

  // Pre-load existing phones and memberIds
  const [existingPhones, existingIds] = await Promise.all([
    prisma.member.findMany({ select: { phone: true } }).then((r) => new Set(r.map((m) => m.phone))),
    prisma.member.findMany({ select: { memberId: true } }).then((r) => new Set(r.map((m) => m.memberId))),
  ]);

  let imported = 0, skipped = 0, errors = 0;
  const warnings: string[] = [];
  const toCreate: any[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as any[];

    const appNo = row[0];
    const name  = String(row[1] ?? "").trim().toUpperCase();
    const genderRaw = String(row[2] ?? "").trim().toUpperCase();

    if (!name || !appNo || name === "" || appNo === "") continue;

    // Skip cancelled entries
    if (genderRaw === "CANCELED" || name.includes("CANCEL")) {
      warnings.push(`Row ${i + 1}: "${name}" — marked CANCELED, skipped`);
      skipped++;
      continue;
    }

    const memberId = `${prefix}-${appNo}`;
    const rawPhone = String(row[9] ?? "").replace(/\D/g, "");
    const phone = rawPhone.length >= 10 ? rawPhone.slice(-10) : rawPhone || "0000000000";

    if (existingIds.has(memberId)) {
      warnings.push(`Row ${i + 1}: "${name}" — memberId ${memberId} already exists, skipped`);
      skipped++;
      continue;
    }
    if (phone !== "0000000000" && existingPhones.has(phone)) {
      warnings.push(`Row ${i + 1}: "${name}" — phone ${phone} already exists, skipped`);
      skipped++;
      continue;
    }

    const gender = normalizeGender(genderRaw);
    const dob    = excelDate(row[3]);
    const doj    = excelDate(row[17]) ?? excelDate(row[16]);
    const addr   = String(row[6] ?? "").trim().toUpperCase() || null;
    const email  = String(row[8] ?? "").trim().toLowerCase() || null;
    const weight = typeof row[13] === "number" && row[13] > 0 ? row[13] : null;
    const height = typeof row[14] === "number" && row[14] > 0 ? row[14] : null;
    const purpose = String(row[15] ?? "").trim().toUpperCase() || null;

    // Track so within-batch duplicates are caught
    existingIds.add(memberId);
    if (phone !== "0000000000") existingPhones.add(phone);

    toCreate.push({
      memberId,
      fullName: name,
      phone,
      gender,
      dateOfBirth: dob,
      address: addr,
      email: email || null,
      weight,
      height,
      intentionOfJoining: purpose,
      primaryCompany: "YOS_FITNESS",
      status: "ACTIVE",
      joinDate: doj ?? new Date(),
    });
  }

  // Insert in batches of 500
  for (let i = 0; i < toCreate.length; i += 500) {
    try {
      const batch = toCreate.slice(i, i + 500);
      const result = await prisma.member.createMany({ data: batch, skipDuplicates: true });
      imported += result.count;
    } catch (e: any) {
      errors++;
      warnings.push(`Batch ${Math.floor(i / 500) + 1} error: ${e.message}`);
    }
  }

  return NextResponse.json({
    imported,
    skipped,
    errors,
    total: toCreate.length,
    warnings: warnings.slice(0, 100),
  });
}
