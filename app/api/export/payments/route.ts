import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Company } from "@prisma/client";
import * as XLSX from "xlsx";

function fmtDate(d: Date | null | undefined): string {
  if (!d) return "";
  const dt = new Date(d);
  return `${dt.getMonth() + 1}/${dt.getDate()}/${dt.getFullYear()}`;
}

function mapPaymentType(type: string): string {
  if (type === "ADMISSION") return "ADM";
  if (type === "RENEWAL") return "REN";
  if (type === "BALANCE") return "BAL";
  return type;
}

function mapPaymentMode(mode: string): string {
  if (mode === "UPI") return "GPAY";
  if (mode === "BANK_TRANSFER") return "GPAY";
  return mode; // CASH, CARD, CHEQUE, FREE
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user || !["ADMIN", "ACCOUNTANT"].includes(session.user.role)) {
    return new Response("Forbidden", { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const company = searchParams.get("company") ?? "ALL";
  const month = searchParams.get("month"); // "2026-05" or null

  const where: any = {};
  if (company !== "ALL") {
    where.company = company as Company;
  }
  if (month) {
    const [year, mon] = month.split("-").map(Number);
    const start = new Date(year, mon - 1, 1);
    const end = new Date(year, mon, 1);
    where.date = { gte: start, lt: end };
  }
  // Exclude voided receipts from all exports
  where.isVoided = false;

  const payments = await prisma.payment.findMany({
    where,
    include: {
      member: {
        select: { fullName: true, phone: true, memberId: true },
      },
    },
    orderBy: { date: "asc" },
  });

  const headers = [
    "DATE",
    "RECEIPT NO.",
    "NAME",
    "MOBILE",
    "APPL. NO.",
    "TYPE",
    "MODE OF PAYMENT",
    "PACKAGE",
    "DURATION",
    "START",
    "END",
    "AMOUNT",
    "CARD CHARGE",
    "TOTAL COLLECTED",
    "BALANCE",
  ];

  const rows = payments.map((p) => {
    const baseAmount = Number(p.amount);
    const discountAmt = Number(p.discount ?? 0);
    const cardChargeAmt = p.cardCharge ? Number(p.cardCharge) : 0;
    const totalCollected = baseAmount - discountAmt + cardChargeAmt;
    const pendingAmount = Number(p.pendingAmount ?? 0);
    return [
      fmtDate(p.date),
      p.receiptNumber ?? "",
      p.member.fullName.toUpperCase(),
      p.member.phone,
      p.member.memberId,
      mapPaymentType(p.paymentType),
      mapPaymentMode(p.paymentMode),
      p.categoryLabel ?? "",
      p.periodLabel ?? "",
      fmtDate(p.startDate),
      fmtDate(p.expiryDate),
      baseAmount,
      cardChargeAmt > 0 ? cardChargeAmt : "",
      totalCollected,
      pendingAmount > 0 ? pendingAmount : "NIL",
    ];
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  let monthLabel = "All";
  if (month) {
    const [year, mon] = month.split("-").map(Number);
    const d = new Date(year, mon - 1, 1);
    monthLabel = d.toLocaleString("en-US", { month: "long", year: "numeric" });
  }

  let filename: string;
  if (company === "YOS_FITNESS") {
    filename = `Yos Fitness Receipts - ${monthLabel}.xlsx`;
  } else if (company === "YOS_FITNESS_STUDIO") {
    filename = `Yos Fitness Studio Receipts - ${monthLabel}.xlsx`;
  } else {
    filename = `All Receipts - ${monthLabel}.xlsx`;
  }

  return new Response(buf, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
