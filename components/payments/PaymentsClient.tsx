"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { CreditCard, IndianRupee, TrendingUp, Search, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from "lucide-react";
import { RecordPaymentDialog } from "@/components/payments/RecordPaymentDialog";
import { formatDate, formatCurrency, cn } from "@/lib/utils";
import { toTitleCase } from "@/lib/utils/titleCase";
import type { Company, UserRole } from "@prisma/client";

type Payment = {
  id: string; date: Date; amount: any; discount: any; pendingAmount: any;
  paymentMode: string; paymentType: string | null; company: Company;
  transactionRef: string | null; notes: string | null;
  receiptNumber: number | null;
  startDate: Date | null; expiryDate: Date | null;
  isVoided: boolean;
  member: { id: string; memberId: string; fullName: string; phone: string };
  package: { name: string } | null;
  collectedBy: { name: string };
  soldBy: { fullName: string; employeeId: string } | null;
};

type Stats = { company: Company; _sum: { amount: any }; _count: number }[];

type Trainer = { id: string; fullName: string };

type Props = {
  payments: Payment[]; total: number; totalAmount: number;
  page: number; pageSize: number;
  todayStats: Stats; monthStats: Stats;
  selectedMonthStats?: Stats | null; selectedMonthLabel?: string;
  filteredStats?: Stats | null; filteredLabel?: string;
  packages: any[];
  trainers?: Trainer[];
  members: { id: string; memberId: string; fullName: string }[];
  userRole: UserRole; userId: string;
  dateFilter?: string; currentSort: string;
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
  CASH: "Cash", UPI: "UPI", CARD: "Card",
  BANK_TRANSFER: "Bank", CHEQUE: "Cheque", FREE: "Free",
};
const MODE_ICONS: Record<string, string> = {
  CASH: "💵", UPI: "📱", CARD: "💳", BANK_TRANSFER: "🏦", CHEQUE: "📄", FREE: "🎁",
};

const TYPE_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  ADMISSION: { bg: "rgba(16,185,129,0.12)", color: "#34d399", label: "Admission" },
  RENEWAL:   { bg: "rgba(59,130,246,0.12)", color: "#60a5fa", label: "Renewal"   },
  BALANCE:   { bg: "rgba(245,158,11,0.12)", color: "#fbbf24", label: "Balance"   },
};

const COMPANY_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  YOS_FITNESS:        { bg: "rgba(249,115,22,0.12)",  color: "#fb923c", label: "Yos Fitness" },
  YOS_FITNESS_STUDIO: { bg: "rgba(99,102,241,0.12)",  color: "#818cf8", label: "Yos Studio"  },
};

const selectStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.1)",
  color: "#d1d5db",
  borderRadius: "0.75rem",
  padding: "0.5rem 0.75rem",
  fontSize: "0.8125rem",
  cursor: "pointer",
  outline: "none",
};

const DATE_FILTERS = [
  { label: "Today",      value: "today" },
  { label: "This Week",  value: "week"  },
  { label: "This Month", value: "month" },
];

function SortIcon({ col, current }: { col: string; current: string }) {
  if (current === `${col}_desc`) return <ArrowDown className="h-3 w-3 ml-1 inline text-orange-400" />;
  if (current === `${col}_asc`)  return <ArrowUp   className="h-3 w-3 ml-1 inline text-orange-400" />;
  return <ArrowUpDown className="h-3 w-3 ml-1 inline text-gray-700" />;
}

export function PaymentsClient({
  payments, total, totalAmount, page, pageSize,
  todayStats, monthStats, selectedMonthStats, selectedMonthLabel,
  filteredStats, filteredLabel,
  packages, trainers = [], members,
  userRole, userId, dateFilter, currentSort,
}: Props) {
  const router   = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [showRecord, setShowRecord] = useState(false);
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function updateQuery(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    for (const [key, value] of Object.entries(updates)) {
      if (!value || value === "ALL") params.delete(key);
      else params.set(key, value);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  function toggleSort(col: string) {
    const next = currentSort === `${col}_desc` ? `${col}_asc` : `${col}_desc`;
    updateQuery({ sort: next });
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (search.trim()) params.set("search", search.trim());
      else params.delete("search");
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const todayYF  = Number(todayStats.find((s) => s.company === "YOS_FITNESS")?._sum.amount ?? 0);
  const todayYFS = Number(todayStats.find((s) => s.company === "YOS_FITNESS_STUDIO")?._sum.amount ?? 0);
  const monthYF  = Number(monthStats.find((s) => s.company === "YOS_FITNESS")?._sum.amount ?? 0);
  const monthYFS = Number(monthStats.find((s) => s.company === "YOS_FITNESS_STUDIO")?._sum.amount ?? 0);
  const filtYF   = filteredStats ? Number(filteredStats.find((s) => s.company === "YOS_FITNESS")?._sum.amount ?? 0) : null;
  const filtYFS  = filteredStats ? Number(filteredStats.find((s) => s.company === "YOS_FITNESS_STUDIO")?._sum.amount ?? 0) : null;
  const selMonthYF    = Number(selectedMonthStats?.find((s) => s.company === "YOS_FITNESS")?._sum.amount ?? 0);
  const selMonthYFS   = Number(selectedMonthStats?.find((s) => s.company === "YOS_FITNESS_STUDIO")?._sum.amount ?? 0);
  const selMonthTotal = selMonthYF + selMonthYFS;
  // Label for month cards: use selectedMonthLabel if a specific month was chosen, else "Month"
  const monthCardLabel = selectedMonthLabel ?? "Month";
  const totalPages = Math.ceil(total / pageSize);
  const from = (page - 1) * pageSize + 1;
  const to   = Math.min(page * pageSize, total);

  return (
    <div className="space-y-4">
      {/* ── Stats strip ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {(filteredStats && filteredLabel ? [
          { label: `${filteredLabel} · Yos Fitness`, value: filtYF  ?? 0, accent: "#f97316", icon: IndianRupee },
          { label: `${filteredLabel} · Yos Studio`,  value: filtYFS ?? 0, accent: "#6366f1", icon: IndianRupee },
          { label: `${monthCardLabel} · Yos Fitness`, value: selMonthYF,  accent: "#f97316", icon: TrendingUp  },
          { label: `${monthCardLabel} · Yos Studio`,  value: selMonthYFS, accent: "#6366f1", icon: TrendingUp  },
        ] : [
          { label: "Today · Yos Fitness",             value: todayYF,     accent: "#f97316", icon: IndianRupee },
          { label: "Today · Yos Studio",              value: todayYFS,    accent: "#6366f1", icon: IndianRupee },
          { label: `${monthCardLabel} · Yos Fitness`, value: selMonthYF,  accent: "#f97316", icon: TrendingUp  },
          { label: `${monthCardLabel} · Yos Studio`,  value: selMonthYFS, accent: "#6366f1", icon: TrendingUp  },
        ]).map((s) => (
          <div key={s.label} className="relative overflow-hidden rounded-2xl px-4 py-3 flex items-center gap-3"
            style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="absolute inset-y-0 left-0 w-[3px] rounded-l-2xl" style={{ background: s.accent }} />
            <div className="rounded-xl p-2" style={{ background: `${s.accent}18` }}>
              <s.icon className="h-3.5 w-3.5" style={{ color: s.accent }} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest truncate">{s.label}</p>
              <p className="text-lg font-extrabold text-white leading-tight">{formatCurrency(s.value)}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Selected month combined total ── */}
      <div className="relative overflow-hidden rounded-2xl px-5 py-3.5 flex items-center justify-between gap-4"
        style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="absolute inset-y-0 left-0 w-[3px] rounded-l-2xl" style={{ background: "linear-gradient(to bottom, #f97316, #6366f1)" }} />
        <div className="flex items-center gap-3 min-w-0">
          <div className="rounded-xl p-2 shrink-0" style={{ background: "rgba(255,255,255,0.06)" }}>
            <CreditCard className="h-3.5 w-3.5 text-gray-400" />
          </div>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest truncate">
            {monthCardLabel} · Total
          </p>
        </div>
        <p className="text-xl font-extrabold text-white shrink-0">{formatCurrency(selMonthTotal)}</p>
      </div>

      {/* ── Toolbar ── */}
      <div className="rounded-2xl px-4 py-3 space-y-3"
        style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)" }}>
        {/* Row 1: Search + dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search member, receipt #, phone…"
              data-no-capitalize
              className="w-full pl-9 pr-4 py-2 rounded-xl text-sm outline-none"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#f9fafb" }}
            />
          </div>
          <select defaultValue={searchParams.get("company") ?? "ALL"} onChange={(e) => updateQuery({ company: e.target.value })} style={selectStyle}>
            <option value="ALL">Both Companies</option>
            <option value="YOS_FITNESS">Yos Fitness</option>
            <option value="YOS_FITNESS_STUDIO">Yos Studio</option>
          </select>
          <select defaultValue={searchParams.get("mode") ?? "ALL"} onChange={(e) => updateQuery({ mode: e.target.value })} style={selectStyle}>
            <option value="ALL">All Modes</option>
            <option value="CASH">Cash</option>
            <option value="UPI">UPI</option>
            <option value="CARD">Card</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
            <option value="CHEQUE">Cheque</option>
            <option value="FREE">Free</option>
          </select>
          <select defaultValue={searchParams.get("paymentType") ?? "ALL"} onChange={(e) => updateQuery({ paymentType: e.target.value })} style={selectStyle}>
            <option value="ALL">All Types</option>
            <option value="ADMISSION">Admission</option>
            <option value="RENEWAL">Renewal</option>
            <option value="BALANCE">Balance</option>
          </select>
        </div>

        {/* Row 2: Date chips */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Date:</span>
          {DATE_FILTERS.map((f) => (
            <button key={f.value}
              onClick={() => updateQuery({ dateFilter: dateFilter === f.value ? "" : f.value })}
              className="px-3 py-1 rounded-lg text-xs font-semibold transition-colors"
              style={dateFilter === f.value
                ? { background: "rgba(249,115,22,0.2)", color: "#fb923c", border: "1px solid rgba(249,115,22,0.4)" }
                : { background: "rgba(255,255,255,0.04)", color: "#6b7280", border: "1px solid rgba(255,255,255,0.08)" }}>
              {f.label}
            </button>
          ))}
          {(searchParams.get("dateFilter") || currentSort !== "date_desc" || searchParams.get("company") || searchParams.get("mode") || searchParams.get("paymentType") || search) && (
            <button onClick={() => { setSearch(""); router.push(pathname); }}
              className="px-3 py-1 rounded-lg text-xs font-semibold transition-colors ml-auto"
              style={{ background: "rgba(239,68,68,0.08)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}>
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
                {/* Sortable: Receipt # */}
                <th className="text-left px-3 sm:px-5 py-3 text-[11px] font-bold text-gray-600 uppercase tracking-widest cursor-pointer hover:text-gray-400 whitespace-nowrap"
                  onClick={() => toggleSort("receipt")}>
                  Receipt # <SortIcon col="receipt" current={currentSort} />
                </th>
                {/* Sortable: Date */}
                <th className="text-left px-3 sm:px-5 py-3 text-[11px] font-bold text-gray-600 uppercase tracking-widest cursor-pointer hover:text-gray-400 whitespace-nowrap"
                  onClick={() => toggleSort("date")}>
                  Date <SortIcon col="date" current={currentSort} />
                </th>
                <th className="text-left px-3 sm:px-5 py-3 text-[11px] font-bold text-gray-600 uppercase tracking-widest">Member</th>
                {/* Sortable: Amount */}
                <th className="text-left px-3 sm:px-5 py-3 text-[11px] font-bold text-gray-600 uppercase tracking-widest cursor-pointer hover:text-gray-400 whitespace-nowrap"
                  onClick={() => toggleSort("amount")}>
                  Amount <SortIcon col="amount" current={currentSort} />
                </th>
                <th className="text-left px-3 sm:px-5 py-3 text-[11px] font-bold text-gray-600 uppercase tracking-widest">Mode</th>
                <th className="hidden md:table-cell text-left px-3 sm:px-5 py-3 text-[11px] font-bold text-gray-600 uppercase tracking-widest">Type</th>
                <th className="hidden lg:table-cell text-left px-3 sm:px-5 py-3 text-[11px] font-bold text-gray-600 uppercase tracking-widest whitespace-nowrap">Valid Until</th>
                <th className="hidden lg:table-cell text-left px-3 sm:px-5 py-3 text-[11px] font-bold text-gray-600 uppercase tracking-widest">Company</th>
                <th className="hidden md:table-cell text-left px-3 sm:px-5 py-3 text-[11px] font-bold text-gray-600 uppercase tracking-widest">Sold By</th>
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
                  const mode    = MODE_STYLES[p.paymentMode] ?? { bg: "rgba(255,255,255,0.06)", color: "#9ca3af" };
                  const co      = COMPANY_STYLES[p.company]  ?? { bg: "rgba(255,255,255,0.06)", color: "#9ca3af", label: p.company };
                  const type    = p.paymentType ? TYPE_STYLES[p.paymentType] : null;
                  const pending = Number(p.pendingAmount ?? 0);
                  const hasPending = pending > 0;

                  return (
                    <tr key={p.id}
                      onClick={() => p.receiptNumber && router.push(`/payments/${p.id}/receipt`)}
                      className={cn("transition-colors group", p.receiptNumber ? "cursor-pointer hover:bg-white/[0.025]" : "")}
                      style={{
                        borderBottom: "1px solid rgba(255,255,255,0.04)",
                        background: p.isVoided
                          ? (idx % 2 === 0 ? "#161616" : "#181818")
                          : hasPending
                            ? (idx % 2 === 0 ? "rgba(239,68,68,0.04)" : "rgba(239,68,68,0.06)")
                            : (idx % 2 === 0 ? "#161616" : "#181818"),
                        opacity: p.isVoided ? 0.55 : 1,
                      }}>
                      {/* Receipt # */}
                      <td className="px-3 sm:px-5 py-3.5">
                        {p.receiptNumber
                          ? <span className="flex items-center gap-1.5">
                              <span className={cn("font-mono text-sm font-bold", p.isVoided ? "text-gray-600 line-through" : "text-orange-400 group-hover:underline")}>
                                #{p.receiptNumber}
                              </span>
                              {p.isVoided && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold border"
                                  style={{ background: "rgba(239,68,68,0.15)", color: "#f87171", borderColor: "rgba(239,68,68,0.25)" }}>
                                  VOID
                                </span>
                              )}
                            </span>
                          : <span className="text-gray-700 text-sm">—</span>}
                      </td>
                      {/* Date */}
                      <td className="px-3 sm:px-5 py-3.5 text-sm text-gray-500 whitespace-nowrap">{formatDate(p.date)}</td>
                      {/* Member */}
                      <td className="px-3 sm:px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <Link href={`/members/${p.member.id}`} className="font-semibold text-white hover:text-orange-400 transition-colors">
                          {toTitleCase(p.member.fullName)}
                        </Link>
                        <p className="text-xs text-gray-600 mt-0.5">{p.member.memberId}</p>
                      </td>
                      {/* Amount */}
                      <td className="px-3 sm:px-5 py-3.5">
                        <p className={cn("font-bold", p.isVoided ? "text-gray-600 line-through" : "text-white")}>
                          {formatCurrency(Number(p.amount))}
                        </p>
                        {Number(p.discount) > 0 && (
                          <p className={cn("text-xs", p.isVoided ? "text-gray-700 line-through" : "text-emerald-500")}>
                            −{formatCurrency(Number(p.discount))}
                          </p>
                        )}
                        {hasPending && !p.isVoided && (
                          <p className="text-xs font-semibold text-red-400">⚠ ₹{Number(pending).toLocaleString("en-IN")} due</p>
                        )}
                      </td>
                      {/* Mode */}
                      <td className="px-3 sm:px-5 py-3.5">
                        <span className="px-2 py-1 rounded-lg text-xs font-semibold whitespace-nowrap" style={{ background: mode.bg, color: mode.color }}>
                          {MODE_ICONS[p.paymentMode]} {MODE_LABELS[p.paymentMode] ?? p.paymentMode}
                        </span>
                      </td>
                      {/* Type */}
                      <td className="hidden md:table-cell px-3 sm:px-5 py-3.5">
                        {type
                          ? <span className="px-2 py-1 rounded-lg text-xs font-semibold" style={{ background: type.bg, color: type.color }}>{type.label}</span>
                          : <span className="text-gray-700 text-xs">—</span>}
                      </td>
                      {/* Valid Until */}
                      <td className="hidden lg:table-cell px-3 sm:px-5 py-3.5 whitespace-nowrap">
                        {p.expiryDate ? (
                          <div>
                            <p className="text-sm font-semibold text-gray-300">{formatDate(p.expiryDate)}</p>
                            {p.startDate && <p className="text-[11px] text-gray-600 mt-0.5">from {formatDate(p.startDate)}</p>}
                          </div>
                        ) : <span className="text-gray-700 text-sm">—</span>}
                      </td>
                      {/* Company */}
                      <td className="hidden lg:table-cell px-3 sm:px-5 py-3.5">
                        <span className="px-2 py-1 rounded-lg text-xs font-semibold" style={{ background: co.bg, color: co.color }}>{co.label}</span>
                      </td>
                      {/* Sold By */}
                      <td className="hidden md:table-cell px-3 sm:px-5 py-3.5 text-sm">
                        {p.soldBy
                          ? <span className="font-semibold text-orange-400">{toTitleCase(p.soldBy.fullName)}</span>
                          : <span className="text-gray-600 text-xs">Common</span>}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Footer: count + pagination ── */}
        <div className="flex items-center justify-between px-3 sm:px-5 py-3 gap-4 flex-wrap"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.01)" }}>
          <p className="text-xs text-gray-500">
            {total === 0 ? "No results" : `Showing ${from}–${to} of ${total} payments · `}
            {total > 0 && <span className="text-orange-400 font-semibold">{formatCurrency(totalAmount)}</span>}
          </p>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button onClick={() => updateQuery({ page: String(page - 1) })} disabled={page <= 1}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-white disabled:opacity-30"
                style={{ background: "rgba(255,255,255,0.06)" }}>
                <ChevronLeft className="h-4 w-4" />
              </button>
              {(() => {
                const win = 2, start = Math.max(1, page - win), end = Math.min(totalPages, page + win);
                const pages: (number | "…")[] = [];
                if (start > 1) { pages.push(1); if (start > 2) pages.push("…"); }
                for (let i = start; i <= end; i++) pages.push(i);
                if (end < totalPages) { if (end < totalPages - 1) pages.push("…"); pages.push(totalPages); }
                return pages.map((pg, i) => pg === "…"
                  ? <span key={`e${i}`} className="w-7 text-center text-xs text-gray-600">…</span>
                  : <button key={pg} onClick={() => updateQuery({ page: String(pg) })}
                      className="w-7 h-7 rounded-lg text-xs font-semibold transition-colors"
                      style={pg === page ? { background: "#f97316", color: "#fff" } : { background: "rgba(255,255,255,0.06)", color: "#6b7280" }}>{pg}</button>
                );
              })()}
              <button onClick={() => updateQuery({ page: String(page + 1) })} disabled={page >= totalPages}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-white disabled:opacity-30"
                style={{ background: "rgba(255,255,255,0.06)" }}>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      <RecordPaymentDialog
        open={showRecord} onClose={() => setShowRecord(false)}
        member={{ id: "", memberId: "", fullName: "Select member…" }}
        packages={packages} trainers={trainers} userId={userId}
      />
    </div>
  );
}
