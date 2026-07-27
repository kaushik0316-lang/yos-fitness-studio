import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { amountToWords } from "@/lib/utils/amountToWords";
import { toTitleCase } from "@/lib/utils/titleCase";
import { WhatsAppButton } from "@/components/receipts/WhatsAppButton";
import { EditReceiptButton } from "@/components/receipts/EditReceiptButton";
import { SendPDFButton } from "@/components/receipts/SendPDFButton";
import { ReassignMemberButton } from "@/components/receipts/ReassignMemberButton";
import { VoidReceiptButton } from "@/components/receipts/VoidReceiptButton";
import { AssignCommissionButton } from "@/components/receipts/AssignCommissionButton";

export const dynamic = "force-dynamic";

type Props = { params: { id: string }; searchParams: { from?: string } };

const PAYMENT_MODE_LABELS: Record<string, string> = {
  CASH: "Cash",
  UPI: "GPay / UPI",
  CARD: "Card",
  CHEQUE: "Cheque",
  BANK_TRANSFER: "Bank Transfer",
  FREE: "Free / Complimentary",
};

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  ADMISSION: "Admission",
  RENEWAL: "Renewal",
  BALANCE: "Balance",
  UPGRADE: "Upgrade",
};

function formatIndian(n: number) {
  return new Intl.NumberFormat("en-IN").format(n);
}

function fmtDate(d: Date | null | undefined) {
  if (!d) return "—";
  return format(new Date(d), "dd/MM/yyyy");
}

function derivePeriod(
  start: Date | null | undefined,
  end: Date | null | undefined,
  pkgDays?: number | null
): string | null {
  const days =
    pkgDays ??
    (start && end
      ? Math.round(
          (new Date(end).getTime() - new Date(start).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : null);
  if (days === null) return null;
  if (days <= 10) return "1 Week";
  if (days <= 20) return "2 Weeks";
  if (days <= 35) return "1 Month";
  if (days <= 65) return "2 Months";
  if (days <= 95) return "3 Months";
  if (days <= 185) return "6 Months";
  if (days <= 370) return "12 Months";
  return `${days} Days`;
}

// ─── Shared style tokens ──────────────────────────────────────────────────────
const label = {
  fontSize: "9px",
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase" as const,
  color: "#9ca3af",
  marginBottom: "3px",
};
const value = {
  fontSize: "13px",
  fontWeight: 600,
  color: "#111827",
  margin: 0,
};
const divider = { borderTop: "1px solid #f3f4f6", margin: "0" };

export default async function ReceiptPage({ params, searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const payment = await prisma.payment.findUnique({
    where: { id: params.id },
    include: {
      member:     { select: { id: true, memberId: true, fullName: true, phone: true } },
      package:    { select: { name: true, durationDays: true } },
      collectedBy: { select: { name: true } },
      voidedBy:   { select: { name: true } },
      soldBy:     { select: { id: true, fullName: true } },
      soldBy2:    { select: { id: true, fullName: true } },
    },
  });

  if (!payment) notFound();

  const [existingCommissions, activeTrainers, allEmployees] = session.user.role === "ADMIN" && !payment.isVoided
    ? await Promise.all([
        prisma.trainerCommission.findMany({
          where: { paymentId: params.id },
          select: { id: true, trainerId: true, trainer: { select: { fullName: true } }, commissionPct: true, commissionAmount: true },
          orderBy: { createdAt: "asc" },
        }),
        prisma.employee.findMany({ where: { role: "TRAINER", isActive: true }, select: { id: true, fullName: true }, orderBy: { fullName: "asc" } }),
        prisma.employee.findMany({ where: { isActive: true }, select: { id: true, fullName: true }, orderBy: { fullName: "asc" } }),
      ])
    : [[], [], []];

  const isYFS = payment.company === "YOS_FITNESS_STUDIO";
  const companyName = isYFS ? "YOS FITNESS STUDIO" : "YOS FITNESS";
  const companyShort = isYFS ? "Yos Fitness Studio" : "Yos Fitness";

  const paymentDate = new Date(payment.date);
  const amountNum = Number(payment.amount);
  const discountNum = Number(payment.discount);
  const pendingNum = Number(payment.pendingAmount);
  const prevAmountNum = payment.previousAmount ? Number(payment.previousAmount) : null;
  const cardChargeNum = payment.cardCharge ? Number(payment.cardCharge) : 0;
  const totalCollected = amountNum - discountNum + cardChargeNum;

  const category =
    payment.categoryLabel ?? payment.package?.name ?? "General Fitness";
  const period =
    payment.periodLabel ??
    derivePeriod(payment.startDate, payment.expiryDate, payment.package?.durationDays);

  // Brand colours
  const brand = isYFS
    ? { bg: "#fffbeb", headerBg: "#f59e0b", headerText: "#fff", accent: "#b45309", border: "#fcd34d", mutedBorder: "#fde68a" }
    : { bg: "#ffffff", headerBg: "#111827", headerText: "#fff", accent: "#f97316", border: "#1f2937", mutedBorder: "#e5e7eb" };

  return (
    <>
      {/* ── Toolbar ── */}
      <div className="no-print flex items-center gap-3 px-6 py-4 bg-white border-b border-gray-100 shadow-sm flex-shrink-0">
        <Link
          href={searchParams.from === "member" ? `/members/${payment.member.id}` : "/payments"}
          className="flex items-center gap-2 px-4 py-2 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-500 hover:border-gray-300 transition-colors"
        >
          ← {searchParams.from === "member" ? "Back to Member" : "Back"}
        </Link>
        {/* Edit and Reassign hidden on voided receipts — view/print/share only */}
        {session.user.role === "ADMIN" && !payment.isVoided && (
          <EditReceiptButton
            paymentId={payment.id}
            employees={allEmployees}
            current={{
              memberName:    toTitleCase(payment.member.fullName),
              memberPhone:   payment.member.phone ?? "",
              date:          format(paymentDate, "yyyy-MM-dd"),
              amount:        amountNum,
              discount:      discountNum,
              pendingAmount: pendingNum,
              paymentMode:   payment.paymentMode,
              paymentType:   payment.paymentType,
              categoryLabel: category,
              periodLabel:   period ?? "",
              startDate:     payment.startDate ? format(new Date(payment.startDate), "yyyy-MM-dd") : "",
              expiryDate:    payment.expiryDate ? format(new Date(payment.expiryDate), "yyyy-MM-dd") : "",
              notes:         payment.notes ?? "",
              transactionRef: payment.transactionRef ?? "",
              company:       payment.company,
              soldById:      payment.soldBy?.id ?? null,
              soldById2:     payment.soldBy2?.id ?? null,
              soldByPct:     payment.soldByPct ?? 100,
            }}
          />
        )}
        {session.user.role === "ADMIN" && !payment.isVoided && (
          <ReassignMemberButton
            paymentId={payment.id}
            currentMember={{
              id:       payment.member.id,
              name:     toTitleCase(payment.member.fullName),
              memberId: payment.member.memberId,
              phone:    payment.member.phone ?? "",
            }}
          />
        )}
        {session.user.role === "ADMIN" && !payment.isVoided && (
          <VoidReceiptButton paymentId={payment.id} />
        )}
        {session.user.role === "ADMIN" && !payment.isVoided && (
          <AssignCommissionButton
            paymentId={payment.id}
            paymentAmount={amountNum}
            memberName={payment.member.fullName}
            packageName={category}
            trainers={activeTrainers}
            existing={existingCommissions.map((c) => ({
              id:               c.id,
              trainerId:        c.trainerId,
              trainerName:      c.trainer.fullName,
              commissionPct:    Number(c.commissionPct),
              commissionAmount: Number(c.commissionAmount),
            }))}
          />
        )}
        <SendPDFButton
          phone={payment.member.phone}
          memberName={payment.member.fullName}
          receiptNo={payment.receiptNumber}
        />
        <span className="text-xs text-gray-400 ml-auto font-mono">
          Receipt #{payment.receiptNumber ?? "—"} · {companyShort}
          {payment.isVoided && (
            <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-lg border border-red-300 align-middle">
              VOIDED
            </span>
          )}
        </span>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          @page { margin: 12mm; }
        }
      `}</style>

      {/* ── Receipt card ── */}
      <div className="flex-1 overflow-y-auto">
      <div className="p-6 print:p-0 print:m-0 bg-gray-50 min-h-full">
        <div
          id="receipt-card"
          className="mx-auto print:shadow-none"
          style={{
            maxWidth: "420px",
            background: brand.bg,
            border: `1.5px solid ${brand.border}`,
            borderRadius: "14px",
            overflow: "hidden",
            fontFamily: "'Segoe UI', system-ui, sans-serif",
            boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
          }}
        >
          {/* ── VOID banner (shown when receipt is voided) ── */}
          {payment.isVoided && (
            <div
              style={{
                background: "#dc2626",
                color: "#fff",
                padding: "10px 24px",
                textAlign: "center",
              }}
            >
              <p style={{ fontWeight: 900, fontSize: "14px", letterSpacing: "0.18em", textTransform: "uppercase", margin: "0 0 3px" }}>
                ⊘ Voided Receipt
              </p>
              <p style={{ fontSize: "11px", margin: 0, opacity: 0.85, lineHeight: 1.5 }}>
                {payment.voidedAt
                  ? `Voided on ${format(new Date(payment.voidedAt), "dd/MM/yyyy")}`
                  : ""}
                {payment.voidedBy?.name ? ` by ${payment.voidedBy.name}` : ""}
                {payment.voidReason ? ` · ${payment.voidReason}` : ""}
              </p>
            </div>
          )}

          {/* ── Header ── */}
          <div style={{ background: brand.headerBg, padding: "20px 24px 18px" }}>
            <p style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.18em", color: isYFS ? "#fef3c7" : "#6b7280", textTransform: "uppercase", margin: "0 0 5px" }}>
              {isYFS ? "★  Member Receipt  ★" : "Member Receipt"}
            </p>
            <h1 style={{ fontSize: "22px", fontWeight: 900, letterSpacing: "0.07em", color: brand.accent, margin: 0 }}>
              {companyName}
            </h1>
            <p style={{ fontSize: "11px", color: isYFS ? "#fef3c7" : "#9ca3af", margin: "7px 0 0", lineHeight: 1.6 }}>
              Old No. 54 &amp; 55, New No. 107 &amp; 109, Kutchery Road,<br />
              Mylapore, Chennai 600 004 &nbsp;·&nbsp; Ph: 044 2462 2040/41
            </p>
          </div>

          {/* ── Receipt # / Date row ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "0", borderBottom: `1px solid ${brand.mutedBorder}` }}>
            {[
              { label: "Receipt No", val: `#${payment.receiptNumber ?? "—"}`, large: true },
              { label: "App No", val: payment.member.memberId, large: true },
              { label: "Date", val: format(paymentDate, "dd/MM/yyyy"), large: false },
              { label: "Day", val: format(paymentDate, "EEE"), large: false },
            ].map(({ label: l, val, large }, i) => (
              <div
                key={i}
                style={{
                  padding: "12px 14px",
                  borderRight: i < 3 ? `1px solid ${brand.mutedBorder}` : undefined,
                  background: brand.bg,
                }}
              >
                <p style={label}>{l}</p>
                <p style={{ ...value, fontSize: large ? "14px" : "12px", fontWeight: large ? 800 : 600 }}>{val}</p>
              </div>
            ))}
          </div>

          {/* ── Member ── */}
          <div style={{ padding: "14px 24px", borderBottom: `1px solid ${brand.mutedBorder}`, background: brand.bg }}>
            <p style={label}>Received with thanks from</p>
            <p style={{ fontSize: "18px", fontWeight: 800, color: "#111827", margin: "2px 0 0", letterSpacing: "0.01em" }}>
              {toTitleCase(payment.member.fullName)}
            </p>
            <p style={{ fontSize: "12px", color: "#6b7280", margin: "3px 0 0" }}>
              {payment.member.phone}
            </p>
          </div>

          {/* ── Amount ── */}
          <div
            style={{
              padding: "16px 24px",
              borderBottom: `1px solid ${brand.mutedBorder}`,
              background: isYFS ? "#fef9ee" : "#fafafa",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div>
                <p style={label}>{cardChargeNum > 0 ? "Total Collected" : "Amount Paid"}</p>
                <p style={{ fontSize: "28px", fontWeight: 900, color: brand.accent, margin: "2px 0 0", letterSpacing: "-0.5px" }}>
                  ₹{formatIndian(cardChargeNum > 0 ? totalCollected : amountNum)}
                </p>
                <p style={{ fontSize: "11px", color: "#9ca3af", fontStyle: "italic", margin: "4px 0 0" }}>
                  {amountToWords(cardChargeNum > 0 ? totalCollected : amountNum)} Rupees only
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={label}>Mode</p>
                {payment.splitPaymentMode && payment.splitAmount ? (
                  <>
                    <p style={{ ...value, fontSize: "11px" }}>
                      {PAYMENT_MODE_LABELS[payment.paymentMode] ?? payment.paymentMode}{" "}
                      <span style={{ color: "#6b7280", fontWeight: 500 }}>₹{formatIndian(amountNum - Number(payment.splitAmount))}</span>
                    </p>
                    <p style={{ ...value, fontSize: "11px" }}>
                      {PAYMENT_MODE_LABELS[payment.splitPaymentMode] ?? payment.splitPaymentMode}{" "}
                      <span style={{ color: "#6b7280", fontWeight: 500 }}>₹{formatIndian(Number(payment.splitAmount))}</span>
                    </p>
                  </>
                ) : (
                  <p style={{ ...value, fontSize: "12px" }}>
                    {PAYMENT_MODE_LABELS[payment.paymentMode] ?? payment.paymentMode}
                  </p>
                )}
                <p style={{ ...label, marginTop: "8px" }}>Type</p>
                <p style={{ ...value, fontSize: "12px" }}>
                  {PAYMENT_TYPE_LABELS[payment.paymentType] ?? payment.paymentType}
                </p>
              </div>
            </div>

            {/* Breakdown: card charge + discount + pending + prev receipt */}
            {(cardChargeNum > 0 || discountNum > 0 || pendingNum > 0 || payment.previousReceiptNo) && (
              <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: `1px dashed ${brand.mutedBorder}`, display: "flex", flexDirection: "column", gap: "4px" }}>
                {cardChargeNum > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "11px", color: "#6b7280" }}>Base Amount</span>
                    <span style={{ fontSize: "11px", fontWeight: 600, color: "#374151" }}>₹{formatIndian(amountNum)}</span>
                  </div>
                )}
                {discountNum > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "11px", color: "#6b7280" }}>Discount</span>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#059669" }}>− ₹{formatIndian(discountNum)}</span>
                  </div>
                )}
                {cardChargeNum > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "11px", color: "#6b7280" }}>Card Charge</span>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#7c3aed" }}>+ ₹{formatIndian(cardChargeNum)}</span>
                  </div>
                )}
                {pendingNum > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "11px", color: "#6b7280" }}>Balance Pending</span>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#dc2626" }}>₹{formatIndian(pendingNum)}</span>
                  </div>
                )}
                {payment.previousReceiptNo && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "11px", color: "#6b7280" }}>Previous Receipt</span>
                    <span style={{ fontSize: "11px", fontWeight: 600, color: "#374151" }}>
                      #{payment.previousReceiptNo}{prevAmountNum !== null ? ` — ₹${formatIndian(prevAmountNum)}` : ""}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Membership period ── */}
          <div style={{ padding: "14px 24px", borderBottom: `1px solid ${brand.mutedBorder}`, background: brand.bg }}>
            <p style={{ ...label, marginBottom: "10px" }}>Membership Details</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "0" }}>
              {[
                { l: "Category", v: category },
                { l: "Period", v: period ?? "—" },
                { l: "From", v: fmtDate(payment.startDate) },
                { l: "To", v: fmtDate(payment.expiryDate) },
              ].map(({ l: lbl, v }, i) => (
                <div key={i} style={{ paddingRight: i < 3 ? "12px" : 0 }}>
                  <p style={label}>{lbl}</p>
                  <p style={{ ...value, fontSize: "12px" }}>{v}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Notes ── */}
          {payment.notes && (
            <div style={{ padding: "10px 24px", borderBottom: `1px solid ${brand.mutedBorder}`, background: brand.bg }}>
              <p style={{ fontSize: "11px", color: "#9ca3af", fontStyle: "italic", margin: 0 }}>{payment.notes}</p>
            </div>
          )}

          {/* ── Terms & Conditions (printed footer) ── */}
          <div style={{ padding: "12px 24px", borderBottom: `1px solid ${brand.mutedBorder}`, background: brand.bg }}>
            <p style={{ fontSize: "8px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#9ca3af", marginBottom: "6px" }}>
              Terms &amp; Conditions
            </p>
            <ol style={{ margin: 0, paddingLeft: "14px", fontSize: "8px", color: "#6b7280", lineHeight: "1.65", display: "flex", flexDirection: "column", gap: "2px" }}>
              <li>Membership is non-transferrable. All fees are payable in advance. <strong style={{ color: "#374151" }}>No refunds under any circumstances.</strong></li>
              <li>Periods of absence cannot be compensated or refunded. Membership must be renewed within 3 months of expiry.</li>
              <li>Usage of facilities, equipment and exercise routines is <strong style={{ color: "#374151" }}>entirely at the member's own risk.</strong> Management is not liable for loss of property or injuries.</li>
              <li>Management reserves the right of admission and may revoke membership for misconduct or repeated delinquency.</li>
              <li>Smoking, alcohol and eatables are strictly prohibited within the facilities.</li>
              <li>Fees are subject to change without notice. By accepting this receipt, the member agrees to the full Terms of Use available at the front desk or at <span style={{ color: "#f97316" }}>yosfitnessstudio.in</span></li>
            </ol>
          </div>

          {/* ── Footer ── */}
          <div
            style={{
              padding: "14px 24px",
              background: brand.headerBg,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <p style={{ fontSize: "11px", fontStyle: "italic", color: isYFS ? "#fef3c7" : "#6b7280", margin: 0 }}>
              Thank you for choosing {companyShort}!
            </p>
            <p style={{ fontSize: "10px", fontWeight: 700, color: isYFS ? brand.accent : "#f97316", margin: 0, letterSpacing: "0.05em" }}>
              {companyName}
            </p>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
