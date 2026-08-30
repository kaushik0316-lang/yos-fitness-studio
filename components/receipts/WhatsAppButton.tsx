"use client";

import { toTitleCase } from "@/lib/utils/titleCase";
import { WaConfirmButton } from "@/components/whatsapp/WaConfirmButton";

type Props = {
  memberId: string;
  phone: string;
  memberName: string;
  amount: number;
  receiptNo: number | null;
  company: string;
  startDate?: string | null;
  expiryDate?: string | null;
};

function formatDate(d: string | null | undefined) {
  if (!d) return null;
  const dt = new Date(d);
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function WhatsAppButton({ memberId, phone, memberName, amount, receiptNo, company, startDate, expiryDate }: Props) {
  const digits = phone.replace(/\D/g, "");
  if (!digits || digits.length < 9 || new Set(digits.split("")).size === 1) return null;

  const companyName = company === "YOS_FITNESS_STUDIO" ? "Yos Fitness Studio" : "Yos Fitness";
  const firstName = toTitleCase(memberName);
  const periodLine =
    startDate && expiryDate
      ? `\nValidity: ${formatDate(startDate)} → ${formatDate(expiryDate)}`
      : "";

  const message =
    `Dear ${firstName}, your payment of Rs.${new Intl.NumberFormat("en-IN").format(amount)} has been recorded at ${companyName}.` +
    `\nReceipt No: #${receiptNo ?? "—"}${periodLine}` +
    `\n\nThank you for choosing ${companyName}!`;

  return (
    <WaConfirmButton
      memberId={memberId}
      phone={phone}
      message={message}
      waType="PAYMENT"
      label="Send via WhatsApp"
      className="no-print flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors shadow-md"
      style={{ background: "#25D366", color: "#fff", boxShadow: "0 4px 12px rgba(37,211,102,0.3)" }}
    />
  );
}
