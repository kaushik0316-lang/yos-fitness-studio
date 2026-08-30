"use client";

import { getFirstName } from "@/lib/utils/titleCase";

type Props = {
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

export function WhatsAppButton({ phone, memberName, amount, receiptNo, company, startDate, expiryDate }: Props) {
  const digits = phone.replace(/\D/g, "");
  // Only show if there's a real phone number
  if (!digits || digits.length < 9 || new Set(digits.split("")).size === 1) return null;

  // Indian numbers — prepend 91 if not already an international number
  const wa = digits.startsWith("91") && digits.length === 12 ? digits : `91${digits.slice(-10)}`;

  const companyName = company === "YOS_FITNESS_STUDIO" ? "Yos Fitness Studio" : "Yos Fitness";
  const firstName = getFirstName(memberName);
  const periodLine =
    startDate && expiryDate
      ? `\nValidity: ${formatDate(startDate)} → ${formatDate(expiryDate)}`
      : "";

  const message =
    `Dear ${firstName}, your payment of ₹${new Intl.NumberFormat("en-IN").format(amount)} has been recorded at ${companyName}.` +
    `\nReceipt No: #${receiptNo ?? "—"}${periodLine}` +
    `\n\nThank you for choosing ${companyName}! 💪`;

  const url = `https://wa.me/${wa}?text=${encodeURIComponent(message)}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="no-print flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors shadow-md"
      style={{ background: "#25D366", color: "#fff", boxShadow: "0 4px 12px rgba(37,211,102,0.3)" }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
      Send via WhatsApp
    </a>
  );
}
