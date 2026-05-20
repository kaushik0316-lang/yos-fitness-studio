import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { amountToWords } from "@/lib/utils/amountToWords";
import { PrintButton } from "@/components/receipts/PrintButton";

export const dynamic = "force-dynamic";

type Props = { params: { id: string } };

const PAYMENT_MODE_LABELS: Record<string, string> = {
  CASH: "Cash",
  UPI: "GPay/UPI",
  CARD: "Card",
  CHEQUE: "Cheque",
  BANK_TRANSFER: "Bank Transfer",
  FREE: "Free",
};

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  ADMISSION: "Admission",
  RENEWAL: "Renewal",
  BALANCE: "Balance",
};

function formatIndian(amount: number): string {
  return new Intl.NumberFormat("en-IN").format(amount);
}

function fmtDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return format(new Date(d), "dd/MM/yyyy");
}

/** Derive a human period label from the duration in days */
function derivePeriod(startDate: Date | null | undefined, expiryDate: Date | null | undefined, packageDays?: number | null): string | null {
  const days = packageDays ?? (startDate && expiryDate
    ? Math.round((new Date(expiryDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24))
    : null);
  if (days === null) return null;
  if (days <= 35)  return "1 Month";
  if (days <= 65)  return "2 Months";
  if (days <= 95)  return "3 Months";
  if (days <= 185) return "6 Months";
  if (days <= 370) return "12 Months";
  return `${days} Days`;
}

export default async function ReceiptPage({ params }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const payment = await prisma.payment.findUnique({
    where: { id: params.id },
    include: {
      member: {
        select: {
          memberId: true,
          fullName: true,
          phone: true,
        },
      },
      package: { select: { name: true, durationDays: true } },
      collectedBy: { select: { name: true } },
    },
  });

  if (!payment) notFound();

  const companyName =
    payment.company === "YOS_FITNESS" ? "YOS FITNESS" : "YOS FITNESS STUDIO";
  const companyShort =
    payment.company === "YOS_FITNESS" ? "Yos Fitness" : "Yos Fitness Studio";
  const isYFS = payment.company === "YOS_FITNESS_STUDIO";

  const paymentDate = new Date(payment.date);
  const dayOfWeek = format(paymentDate, "EEEE");
  const dateFormatted = format(paymentDate, "dd/MM/yyyy");

  const amountNum = Number(payment.amount);
  const discountNum = Number(payment.discount);
  const pendingNum = Number(payment.pendingAmount);
  const prevAmountNum = payment.previousAmount ? Number(payment.previousAmount) : null;

  const amountWords = amountToWords(amountNum);

  return (
    <>
      {/* Print / Back controls — hidden on print */}
      <div className="no-print flex items-center gap-3 px-6 py-4 bg-white border-b border-gray-100 shadow-sm">
        <Link
          href="/payments"
          className="flex items-center gap-2 px-4 py-2 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-500 hover:border-gray-300 transition-colors"
        >
          ← Back
        </Link>
        <PrintButton />
        <span className="text-xs text-gray-400 ml-auto">
          Receipt #{payment.receiptNumber} · {companyName}
        </span>
      </div>

      {/* Print button script */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
      `}</style>

      {/* Receipt */}
      <div className="p-6 print:p-0 print:m-0">
        <div
          className="max-w-md mx-auto bg-white print:shadow-none"
          style={{
            border: isYFS ? "2px solid #f59e0b" : "2px solid #1e293b",
            borderRadius: "12px",
            overflow: "hidden",
            fontFamily: "'Segoe UI', sans-serif",
          }}
        >
          {/* Header */}
          <div
            style={{
              background: isYFS ? "#fef3c7" : "#1e293b",
              padding: "20px 24px 16px",
              borderBottom: isYFS ? "1px solid #f59e0b" : "1px solid #334155",
            }}
          >
            <h1
              style={{
                fontSize: "20px",
                fontWeight: 900,
                letterSpacing: "0.08em",
                color: isYFS ? "#92400e" : "#f97316",
                margin: 0,
              }}
            >
              {companyName}
            </h1>
            <p
              style={{
                fontSize: "11px",
                color: isYFS ? "#78350f" : "#94a3b8",
                margin: "6px 0 0",
                lineHeight: 1.5,
              }}
            >
              Old No. 54 &amp; 55, New No. 107 &amp; 109,
              <br />
              Kutchery Road, Mylapore, Chennai 600 004
              <br />
              Ph: 044 2462 2040/41
            </p>
          </div>

          {/* Receipt meta */}
          <div
            style={{
              padding: "14px 24px",
              borderBottom: "1px solid #e5e7eb",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "6px",
              background: isYFS ? "#fffbeb" : "#fff",
            }}
          >
            <div>
              <span style={{ fontSize: "10px", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Receipt No
              </span>
              <p style={{ fontSize: "15px", fontWeight: 800, color: "#111827", margin: "2px 0 0" }}>
                #{payment.receiptNumber ?? "—"}
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: "10px", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                App. No.
              </span>
              <p style={{ fontSize: "15px", fontWeight: 800, color: "#111827", margin: "2px 0 0" }}>
                {payment.member.memberId}
              </p>
            </div>
            <div>
              <span style={{ fontSize: "10px", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Date
              </span>
              <p style={{ fontSize: "13px", fontWeight: 600, color: "#374151", margin: "2px 0 0" }}>
                {dateFormatted}
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: "10px", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Day
              </span>
              <p style={{ fontSize: "13px", fontWeight: 600, color: "#374151", margin: "2px 0 0" }}>
                {dayOfWeek}
              </p>
            </div>
          </div>

          {/* Member */}
          <div
            style={{
              padding: "14px 24px",
              borderBottom: "1px solid #e5e7eb",
              background: isYFS ? "#fffbeb" : "#fff",
            }}
          >
            <p style={{ fontSize: "11px", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 6px" }}>
              Received with thanks from
            </p>
            <p style={{ fontSize: "17px", fontWeight: 800, color: "#111827", margin: 0 }}>
              {payment.member.fullName}
            </p>
            <p style={{ fontSize: "12px", color: "#6b7280", margin: "3px 0 0" }}>
              {payment.member.phone}
            </p>
          </div>

          {/* Amount */}
          <div
            style={{
              padding: "14px 24px",
              borderBottom: "1px solid #e5e7eb",
              background: isYFS ? "#fffbeb" : "#fff",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <p style={{ fontSize: "11px", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>
                Amount
              </p>
              <p style={{ fontSize: "22px", fontWeight: 900, color: isYFS ? "#92400e" : "#111827", margin: 0 }}>
                ₹{formatIndian(amountNum)}
              </p>
            </div>
            <p style={{ fontSize: "12px", color: "#6b7280", fontStyle: "italic", margin: "4px 0 8px" }}>
              {amountWords} Rupees only
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" }}>
              <div>
                <span style={{ fontSize: "10px", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em" }}>Payment</span>
                <p style={{ fontSize: "13px", fontWeight: 600, color: "#374151", margin: "2px 0 0" }}>
                  {PAYMENT_MODE_LABELS[payment.paymentMode] ?? payment.paymentMode}
                </p>
              </div>
              <div>
                <span style={{ fontSize: "10px", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em" }}>Type</span>
                <p style={{ fontSize: "13px", fontWeight: 600, color: "#374151", margin: "2px 0 0" }}>
                  {PAYMENT_TYPE_LABELS[payment.paymentType] ?? payment.paymentType}
                </p>
              </div>
            </div>
          </div>

          {/* Membership details */}
          <div
            style={{
              padding: "14px 24px",
              borderBottom: "1px solid #e5e7eb",
              background: isYFS ? "#fffbeb" : "#fff",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Category", "Period", "From", "To"].map((h) => (
                    <th
                      key={h}
                      style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        color: "#9ca3af",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        textAlign: "left",
                        paddingBottom: "6px",
                        borderBottom: "1px solid #e5e7eb",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ fontSize: "12px", fontWeight: 600, color: "#374151", paddingTop: "8px" }}>
                    {payment.categoryLabel ?? payment.package?.name ?? "General Fitness"}
                  </td>
                  <td style={{ fontSize: "12px", fontWeight: 600, color: "#374151", paddingTop: "8px" }}>
                    {payment.periodLabel
                      ?? derivePeriod(payment.startDate, payment.expiryDate, payment.package?.durationDays)
                      ?? "—"}
                  </td>
                  <td style={{ fontSize: "12px", fontWeight: 600, color: "#374151", paddingTop: "8px" }}>
                    {fmtDate(payment.startDate)}
                  </td>
                  <td style={{ fontSize: "12px", fontWeight: 600, color: "#374151", paddingTop: "8px" }}>
                    {fmtDate(payment.expiryDate)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Optional: discount, pending, prev receipt */}
          {(discountNum > 0 || pendingNum > 0 || payment.previousReceiptNo) && (
            <div
              style={{
                padding: "12px 24px",
                borderBottom: "1px solid #e5e7eb",
                background: isYFS ? "#fffbeb" : "#fff",
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}
            >
              {discountNum > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "12px", color: "#6b7280" }}>Discount</span>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#059669" }}>
                    − ₹{formatIndian(discountNum)}
                  </span>
                </div>
              )}
              {pendingNum > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "12px", color: "#6b7280" }}>Balance / Pending</span>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#dc2626" }}>
                    ₹{formatIndian(pendingNum)}
                  </span>
                </div>
              )}
              {payment.previousReceiptNo && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "12px", color: "#6b7280" }}>Previous Receipt</span>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "#374151" }}>
                    #{payment.previousReceiptNo}
                    {prevAmountNum !== null ? ` — ₹${formatIndian(prevAmountNum)}` : ""}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          {payment.notes && (
            <div
              style={{
                padding: "10px 24px",
                borderBottom: "1px solid #e5e7eb",
                background: isYFS ? "#fffbeb" : "#fff",
              }}
            >
              <p style={{ fontSize: "11px", color: "#9ca3af", fontStyle: "italic", margin: 0 }}>
                {payment.notes}
              </p>
            </div>
          )}

          {/* Footer / signature */}
          <div
            style={{
              padding: "16px 24px",
              background: isYFS ? "#fef3c7" : "#f8fafc",
              borderTop: isYFS ? "1px solid #f59e0b" : "1px solid #e5e7eb",
            }}
          >
            <p style={{ fontSize: "11px", color: "#6b7280", fontStyle: "italic", margin: "0 0 14px" }}>
              I have read and understood the Rules &amp; Regulations. I will obey the rules.
            </p>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "24px" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ borderTop: "1px solid #9ca3af", width: "120px", paddingTop: "4px" }}>
                  <span style={{ fontSize: "10px", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Customer Signature
                  </span>
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ borderTop: "1px solid #9ca3af", width: "120px", paddingTop: "4px" }}>
                  <span style={{ fontSize: "10px", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    For {companyShort}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
