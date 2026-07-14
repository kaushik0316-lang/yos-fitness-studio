"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { ArrowLeft, CreditCard, Dumbbell, Receipt } from "lucide-react";

type Payment = {
  id: string;
  date: string;
  amount: number;
  discount: number;
  pendingAmount: number;
  paymentMode: string;
  splitPaymentMode: string | null;
  splitAmount: number | null;
  receiptNumber: number | null;
  notes: string | null;
  package: { name: string } | null;
  membership: { startDate: string; expiryDate: string } | null;
};

function fmt(mode: string) {
  return { CASH: "Cash", UPI: "UPI", CARD: "Card", BANK_TRANSFER: "Bank Transfer", CHEQUE: "Cheque", FREE: "Free" }[mode] ?? mode;
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function fmtPeriod(s: string, e: string) {
  return `${fmtDate(s)} → ${fmtDate(e)}`;
}

export default function MyPaymentsPage() {
  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [memberName, setMemberName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const pin = sessionStorage.getItem("member_pin");
    if (!pin) { setError("Session expired. Please log in again."); return; }

    fetch("/api/member/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(data.error); return; }
        setPayments(data.payments);
        setMemberName(data.member?.fullName ?? "");
      })
      .catch(() => setError("Network error. Please try again."));
  }, []);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0a0a0a" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: "#1c1c1c" }}>
        <Link href="/member-portal"
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
          style={{ background: "#1c1c1c" }}>
          <ArrowLeft className="h-4 w-4 text-gray-400" />
        </Link>
        <div className="flex items-center gap-2">
          <div className="rounded-lg p-1.5" style={{ background: "#22c55e" }}>
            <Dumbbell className="h-4 w-4 text-white" />
          </div>
          <span className="text-white font-bold text-sm uppercase tracking-wide">Yos Fitness</span>
        </div>
      </div>

      <div className="flex-1 w-full max-w-md mx-auto px-4 py-5 flex flex-col gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white uppercase tracking-wide">My Payments</h1>
          {memberName && <p className="text-gray-500 text-sm mt-0.5">{memberName}</p>}
        </div>

        {error && (
          <div className="rounded-2xl p-4 text-sm text-red-400" style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.15)" }}>
            {error}
            {error.includes("log in") && (
              <Link href="/member-portal" className="block mt-2 font-bold text-red-300 underline">Go to login →</Link>
            )}
          </div>
        )}

        {payments === null && !error && (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: "#1c1c1c" }} />
            ))}
          </div>
        )}

        {payments?.length === 0 && (
          <div className="text-center py-12 text-gray-600 text-sm">No payment records found.</div>
        )}

        {payments && payments.length > 0 && (
          <div className="flex flex-col gap-3">
            {payments.map((p) => {
              const paid = Number(p.amount) - Number(p.discount);
              const hasSplit = p.splitPaymentMode && p.splitAmount;
              const hasPending = Number(p.pendingAmount) > 0;

              return (
                <div key={p.id} className="rounded-2xl p-4" style={{ background: "#1c1c1c" }}>
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: "rgba(34,197,94,0.12)" }}>
                        <Receipt className="h-4 w-4 text-green-400" />
                      </div>
                      <div>
                        <p className="text-white font-bold text-sm leading-tight">
                          {p.package?.name ?? p.notes ?? "Payment"}
                        </p>
                        <p className="text-gray-600 text-[11px] mt-0.5">{fmtDate(p.date)}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-green-400 font-extrabold text-base leading-tight">
                        ₹{paid.toLocaleString("en-IN")}
                      </p>
                      {p.discount > 0 && (
                        <p className="text-gray-600 text-[10px] line-through">₹{Number(p.amount).toLocaleString("en-IN")}</p>
                      )}
                    </div>
                  </div>

                  {/* Period */}
                  {p.membership && (
                    <p className="text-[11px] text-gray-600 mb-2 pl-[46px]">
                      {fmtPeriod(p.membership.startDate, p.membership.expiryDate)}
                    </p>
                  )}

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5 pl-[46px]">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: "rgba(255,255,255,0.05)", color: "#9ca3af" }}>
                      <CreditCard className="inline h-2.5 w-2.5 mr-1" />
                      {fmt(p.paymentMode)}
                      {hasSplit && ` + ${fmt(p.splitPaymentMode!)} (₹${Number(p.splitAmount).toLocaleString("en-IN")})`}
                    </span>
                    {hasPending && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: "rgba(251,146,60,0.12)", color: "#fb923c" }}>
                        Pending ₹{Number(p.pendingAmount).toLocaleString("en-IN")}
                      </span>
                    )}
                    {p.receiptNumber && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: "rgba(255,255,255,0.04)", color: "#6b7280" }}>
                        #{p.receiptNumber}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
