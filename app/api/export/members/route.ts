import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

function fmtDate(d: Date | null | undefined): string {
  if (!d) return "";
  const dt = new Date(d);
  return `${dt.getMonth() + 1}/${dt.getDate()}/${dt.getFullYear()}`;
}

function calcAge(dob: Date | null | undefined): number | string {
  if (!dob) return "";
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export async function GET() {
  const session = await auth();
  if (!session?.user || !["ADMIN", "ACCOUNTANT"].includes(session.user.role)) {
    return new Response("Forbidden", { status: 403 });
  }

  const members = await prisma.member.findMany({
    orderBy: { memberId: "asc" },
  });

  const headers = [
    "APPLICATION NUMBER",
    "NAME",
    "GENDER",
    "DATE OF BIRTH",
    "AGE",
    "MARITAL STATUS",
    "ADDRESS",
    "PINCODE",
    "EMAIL",
    "MOBILE",
    "PROFESSION",
    "WEIGHT",
    "HEIGHT",
    "PURPOSE",
    "DATE",
    "STATUS",
  ];

  const rows = members.map((m) => [
    m.memberId,
    m.fullName,
    m.gender ?? "",
    fmtDate(m.dateOfBirth),
    calcAge(m.dateOfBirth),
    "", // marital status not stored
    m.address ?? "",
    "", // pincode not stored
    m.email ?? "",
    m.phone,
    "", // profession not stored
    m.weight != null ? Number(m.weight) : "",
    m.height != null ? Number(m.height) : "",
    m.intentionOfJoining ?? "",
    fmtDate(m.joinDate),
    m.status,
  ]);

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const today = new Date();
  const dateStr = fmtDate(today).replace(/\//g, "-");
  const filename = `Member Master - ${dateStr}.xlsx`;

  return new Response(buf, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
