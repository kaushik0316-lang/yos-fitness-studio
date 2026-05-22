"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Plus, CreditCard, IndianRupee, TrendingUp } from "lucide-react";
import { RecordPaymentDialog } from "@/components/payments/RecordPaymentDialog";
import { formatDate, formatCurrency, cn } from "@/lib/utils";
import type { Company, UserRole } from "@prisma/client";

type Payment = {
  id: string; date: Date; amount: any; discount: any; pendingAmount: any;
  paymentMode: string; company: Company; transactionRef: string | null; notes: string | null;
  receiptNumber: number | null; paymentType: string | null;
  startDate: Date | null; expiryDate: Date | null;
  member: { id: string; memberId: string; fullName: string; phone: string };
  package: { name: string } | null;
  collectedBy: { name: string };
  soldBy: { fullName: string; employeeId: string } | null;
};

type Stats = { company: Company; _sum: { amount: any }; _count: number }[];

type Props = {
  payments: Payment[]; total: number; page: number; pageSize: number;
  todayStats: Stats; monthStats: Stats; packages: any[];
  members: { id: string; memberId: string; fullName: string }[];
  userRole: UserRole; userId: string;
  dateFilter?: string;
};

const MODE_STYLES: Record<string, { bg: string; color: string }> = {
  CASH:          { bg: "rgba(34,197,94,0.12)",   color: "#4ade80" },
  UPI:           { bg: "rgba(59,130,246,0.12)",   color: "#60a5fa" },
  CARD:          { bg: "rgba(139,92,246,0.12)",   color: "#a78bfa" },
  BANK_TRANSFER: { bg: "rgba(99,102,241,0.12)",   color: "#818cf8" },
  CHEQUE:        { bg: "rgba(245,158,11,0.12)",   color: "#fbbf24" },
  FREE:          { bg: "rgba(107,114,128,0.12)",  color: "#9ca3af" },
};
const MODE_LABELS: Record<string, string> = {
  CASH: "💵 Cash", UPI: "📱 UPI", CARD: "💳 Card",
  BANK_TRANSFER: "🏦 Bank", CHEQUE: "📄 Cheque", FREE: "🎁 Free",
};

const COMPANY_STYLES: Record<string, { bg: string; color: string }> = {
  YOS_FITNESS:        { bg: "rgba(249,115,22,0.12)",  color: "#fb923c" },
  YOS_FITNESS_STUDIO: { bg: "rgba(99,102,241,0.12)",  color: "#818cf8" },
};

const selectStyle = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.1)",
  color: "#d1d5db",
  borderRadius: "0.75rem",
  padding: "0.625rem 0.875rem",
  fontSize: "0.875rem",
  cursor: "pointer",
  outline: "none",
};

export function PaymentsClient({ payments, total, page, pageSize, todayStats, monthStats, packages, members, userRole, userId, dateFilter }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [showRecord, setShowRecord] = useState(false);

  function updateQuery(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "" || value === "ALL") params.delete(key);
    else params.set(key, value);
    if (key !== "page") params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  const todayYF  = Number(todayStats.find((s) => s.company === "YOS_FITNESS")?._sum.amount ?? 0);
  const todayYFS = Number(todayStats.find((s) => s.company === "YOS_FITNESS_STUDIO")?._sum.amount ?? 0);
  const monthYF  = Number(monthStats.find((s) => s.company === "YOS_FITNESS")?._sum.amount ?? 0);
  const monthYFS = Number(monthStats.find((s) => s.company === "YOS_FITNESS_STUDIO")?._sum.amount ?? 0);
  const totalPages = Math.ceil(total / pageSize);

  const statCards = [
    { label: "Today · Yos Fitness",  value: todayYF,  icon: IndianRupee, accent: "#f97316", iconBg: "rgba(249,115,22,0.12)" },
    { label: "Today · Yos Studio",   value: todayYFS, icon: IndianRupee, accent: "#6366f1", iconBg: "rgba(99,102,241,0.12)" },
    { label: "Month · Yos Fitness",  value: monthYF,  icon: TrendingUp,  accent: "#f97316", iconBg: "rgba(249,115,22,0.12)" },
    { label: "Month · Yos Studio",   value: monthYFS, icon: TrendingUp,  accent: "#6366f1", iconBg: "rgba(99,102,241,0.12)" },
  ];

  return (
    <div className="space-y-5">
      {/* ── Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className="relative overflow-hidden rounded-2xl p-5"
            style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="absolute inset-x-0 top-0 h-[3px] rounded-t-2xl" style={{ background: s.accent }} />
            <div className="flex items-start justify-between mt-1">
              <div>
                <p className="text-[11px] font-bold text-gray-600 uppercase tracking-widest truncate">{s.label}</p>
                <p className="text-2xl font-extrabold text-white mt-1.5">{formatCurrency(s.value)}</p>
              </div>
              <div className="rounded-xl p-2.5" style={{ background: s.iconBg }}>
                <s.icon className="h-4 w-4" style={{ color: s.accent }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div className="rounded-2xl px-5 py-4 flex flex-wrap items-center gap-3"
        style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)" }}>
        <select defaultValue={searchParams.get("company") ?? "ALL"} onChange={(e) => updateQuery("company", e.target.value)} style={selectStyle}>
          <option value="ALL">Both Companies</option>
          <option value="YOS_FITNESS">Yos Fitness</option>
          <option value="YOS_FITNESS_STUDIO">Yos Studio</option>
        </select>
        <select defaultValue={searchParams.get("mode") ?? "ALL"} onChange={(e) => updateQuery("mode", e.target.value)} style={selectStyle}>
          <option value="ALL">All Modes</option>
          <option value="CASH">Cash</option>
          <option value="UPI">UPI</option>
          <option value="CARD">Card</option>
          <option value="BANK_TRANSFER">Bank Transfer</option>
          <option value="FREE">Free</option>
        </select>
        {dateFilter && (
          <span className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold"
            style={{ background: "rgba(249,115,22,0.12)", color: "#fb923c", border: "1px solid rgba(249,115,22,0.25)" }}>
            {dateFilter === "today" ? "📅 Today only" : "📅 This month"}
            <button onClick={() => updateQuery("dateFilter", "")} className="ml-0.5 hover:opacity-70">✕</button>
          </span>
        )}
        <div className="ml-auto" />
      </div>

      {/* ── Table ── */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
                {["Receipt #", "Date", "Member", "Amount", "Mode", "Valid Until", "Company", "Sold By"].map((h) => (
                  <th key={h} className="text-left px-5 py-3.5 text-[11px] font-bold text-gray-600 uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                      <CreditCard className="h-12 w-12 text-gray-700" />
                      <p className="text-sm text-gray-500 font-medium">No payments found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                payments.map((p, idx) => {
                  const mode = MODE_STYLES[p.paymentMode] ?? { bg: "rgba(255,255,255,0.06)", color: "#9ca3af" };
                  const co = COMPANY_STYLES[p.company] ?? { bg: "rgba(255,255,255,0.06)", color: "#9ca3af" };
                  return (
                    <tr key={p.id} className="transition-colors hover:bg-white/[0.015]"
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: idx % 2 === 0 ? "#161616" : "#181818" }}>
                      <td className="px-5 py-4">
                        {p.receiptNumber
                          ? <Link href={`/payments/${p.id}/receipt`} className="font-mono text-sm font-bold text-orange-400 hover:underline">#{p.receiptNumber}</Link>
                          : <span className="text-gray-700 text-sm">—</span>}
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-500 whitespace-nowrap">{formatDate(p.date)}</td>
                      <td className="px-5 py-4">
                        <Link href={`/members/${p.member.id}`} className="font-semibold text-white hover:text-orange-400 transition-colors">
                          {p.member.fullName}
                        </Link>
                        <p className="text-xs text-gray-600 mt-0.5">{p.member.memberId}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-bold text-white">{formatCurrency(Number(p.amount))}</p>
                        {Number(p.discount) > 0 && (
                          <p className="text-xs text-emerald-500">−{formatCurrency(Number(p.discount))} off</p>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-semibold" style={{ background: mode.bg, color: mode.color }}>
                          {MODE_LABELS[p.paymentMode] ?? p.paymentMode}
                        </span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        {p.expiryDate ? (
                          <div>
                            <p className="text-sm font-semibold text-gray-300">{formatDate(p.expiryDate)}</p>
                            {p.startDate && <p className="text-[11px] text-gray-600 mt-0.5">from {formatDate(p.startDate)}</p>}
                          </div>
                        ) : <span className="text-gray-700 text-sm">—</span>}
                      </td>
                      <td className="px-5 py-4">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-semibold" style={{ background: co.bg, color: co.color }}>
                          {p.company === "YOS_FITNESS" ? "Yos Fitness" : "Yos Studio"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm">
                        {p.soldBy
                          ? <span className="font-semibold text-orange-400">{p.soldBy.fullName}</span>
                          : <span className="text-gray-600 text-xs">Common</span>}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4"
            style={{ borderTop: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.01)" }}>
            <p className="text-xs text-gray-600">{total} total payments</p>
            <div className="flex items-center gap-1">
              <button onClick={() => updateQuery("page", String(page - 1))} disabled={page <= 1}
                className="w-8 h-8 rounded-xl text-xs font-bold text-gray-500 hover:text-white disabled:opacity-30"
                style={{ background: "rgba(255,255,255,0.06)" }}>‹</button>
              {(() => {
                const win = 2, start = Math.max(1, page - win), end = Math.min(totalPages, page + win);
                const pages: (number | "…")[] = [];
                if (start > 1) { pages.push(1); if (start > 2) pages.push("…"); }
                for (let i = start; i <= end; i++) pages.push(i);
                if (end < totalPages) { if (end < totalPages - 1) pages.push("…"); pages.push(totalPages); }
                return pages.map((p, i) => p === "…"
                  ? <span key={`e${i}`} className="w-8 text-center text-xs text-gray-600">…</span>
                  : <button key={p} onClick={() => updateQuery("page", String(p))}
                      className="w-8 h-8 rounded-xl text-xs font-semibold transition-colors"
                      style={p === page ? { background: "#f97316", color: "#fff" } : { background: "rgba(255,255,255,0.06)", color: "#6b7280" }}>{p}</button>
                );
              })()}
              <button onClick={() => updateQuery("page", String(page + 1))} disabled={page >= totalPages}
                className="w-8 h-8 rounded-xl text-xs font-bold text-gray-500 hover:text-white disabled:opacity-30"
                style={{ background: "rgba(255,255,255,0.06)" }}>›</button>
            </div>
          </div>
        )}
      </div>

      <RecordPaymentDialog
        open={showRecord} onClose={() => setShowRecord(false)}
        member={{ id: "", memberId: "", fullName: "Select member…" }}
        packages={packages} userId={userId}
      />
    </div>
  );
}
