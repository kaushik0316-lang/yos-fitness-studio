"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, ArrowRightLeft, Loader2, TrendingUp, IndianRupee, ShoppingBag, Users } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toTitleCase } from "@/lib/utils/titleCase";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

type Payment = {
  id: string; date: string;
  amount: string | number; discount: string | number;
  soldByPct: number | null;
  categoryLabel: string | null;
  member: { fullName: string; memberId: string };
  soldBy:  { id: string; fullName: string } | null;
  soldBy2: { id: string; fullName: string } | null;
};

// One entry per seller per payment
type SaleEntry = {
  paymentId: string;
  date: string;
  fullNet: number;
  creditedAmount: number;
  categoryLabel: string | null;
  member: { fullName: string; memberId: string };
  seller: { id: string; fullName: string };
  isSplit: boolean;
  splitRole: "primary" | "secondary";
};

type Employee = { id: string; fullName: string };

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// Stable avatar colors per trainer
const AVATAR_COLORS = [
  { bg: "rgba(249,115,22,0.15)", color: "#fb923c" },
  { bg: "rgba(139,92,246,0.15)", color: "#a78bfa" },
  { bg: "rgba(20,184,166,0.15)", color: "#2dd4bf" },
  { bg: "rgba(236,72,153,0.15)", color: "#f472b6" },
  { bg: "rgba(59,130,246,0.15)", color: "#60a5fa" },
  { bg: "rgba(234,179,8,0.15)",  color: "#facc15" },
];

function avatarColor(idx: number) {
  return AVATAR_COLORS[idx % AVATAR_COLORS.length];
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

export function SalesTab({ allEmployees, initMonth, initYear }: {
  allEmployees: Employee[];
  initMonth: number;
  initYear: number;
}) {
  const router = useRouter();
  const now = new Date();

  const [month, setMonth]           = useState(initMonth);
  const [year, setYear]             = useState(initYear);
  const [payments, setPayments]     = useState<Payment[]>([]);
  const [loading, setLoading]       = useState(true);
  const [targetEmp, setTargetEmp]   = useState<Record<string, string>>({});
  const [moving, setMoving]         = useState<string | null>(null);
  const [expanded, setExpanded]     = useState<Set<string>>(new Set());
  const [expandedRow, setExpandedRow] = useState<Set<string>>(new Set());
  const [filterEmp, setFilterEmp]   = useState<string>("all");

  const isCurrent = month === now.getMonth() + 1 && year === now.getFullYear();

  useEffect(() => {
    setLoading(true);
    setTargetEmp({});
    setExpandedRow(new Set());
    fetch(`/api/admin/sales?month=${month}&year=${year}`)
      .then((r) => r.json())
      .then((d) => {
        setPayments(d.payments ?? []);
        const ids = new Set<string>();
        for (const p of (d.payments ?? [])) {
          if (p.soldBy?.id) ids.add(p.soldBy.id);
        }
        setExpanded(ids);
      })
      .finally(() => setLoading(false));
  }, [month, year]);

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (isCurrent) return;
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  async function move(paymentId: string) {
    const newEmpId = targetEmp[paymentId];
    if (!newEmpId) return;
    setMoving(paymentId);
    try {
      const res = await fetch("/api/admin/sales", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId, soldById: newEmpId }),
      });
      if (!res.ok) throw new Error("Failed");
      setPayments((prev) => prev.filter((p) => p.id !== paymentId));
      setExpandedRow((prev) => { const n = new Set(prev); n.delete(paymentId); return n; });
      const empName = allEmployees.find((e) => e.id === newEmpId)?.fullName ?? "someone";
      toast({ title: `Sale moved to ${toTitleCase(empName)}` });
      router.refresh();
      const data = await fetch(`/api/admin/sales?month=${month}&year=${year}`).then((r) => r.json());
      setPayments(data.payments ?? []);
    } catch {
      toast({ title: "Error", description: "Could not move sale.", variant: "destructive" });
    } finally {
      setMoving(null);
    }
  }

  // Expand payments into per-seller entries
  const allEntries: SaleEntry[] = [];
  for (const p of payments) {
    const net = Number(p.amount) - Number(p.discount);
    const pct = p.soldByPct ?? 100;
    const isSplit = !!p.soldBy2;
    if (p.soldBy) {
      allEntries.push({
        paymentId: p.id, date: p.date, fullNet: net,
        creditedAmount: isSplit ? Math.round(net * pct / 100) : net,
        categoryLabel: p.categoryLabel,
        member: p.member, seller: p.soldBy,
        isSplit, splitRole: "primary",
      });
    }
    if (p.soldBy2) {
      allEntries.push({
        paymentId: p.id, date: p.date, fullNet: net,
        creditedAmount: Math.round(net * (100 - pct) / 100),
        categoryLabel: p.categoryLabel,
        member: p.member, seller: p.soldBy2,
        isSplit, splitRole: "secondary",
      });
    }
  }

  // Group entries by seller
  const grouped = new Map<string, { emp: Employee; entries: SaleEntry[]; idx: number }>();
  let empIdx = 0;
  for (const e of allEntries) {
    const key = e.seller.id;
    if (!grouped.has(key)) {
      grouped.set(key, { emp: e.seller, entries: [], idx: empIdx++ });
    }
    grouped.get(key)!.entries.push(e);
  }
  const groups = Array.from(grouped.entries()).sort(([, a], [, b]) => {
    const tA = a.entries.reduce((s, e) => s + e.creditedAmount, 0);
    const tB = b.entries.reduce((s, e) => s + e.creditedAmount, 0);
    return tB - tA;
  });

  // Grand total = sum of credited amounts (each rupee counted once across all sellers)
  // To avoid double-counting, sum unique payment nets + split secondary credits
  const grandTotal = allEntries
    .filter((e) => e.splitRole === "primary")
    .reduce((s, e) => s + e.fullNet, 0);
  const visibleGroups = filterEmp === "all" ? groups : groups.filter(([key]) => key === filterEmp);


  const navBtn = "p-2 rounded-xl transition-colors hover:bg-white/10";

  return (
    <div className="space-y-5">
      {/* Month nav */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 rounded-xl p-1" style={{ background: "rgba(255,255,255,0.05)" }}>
          <button onClick={prevMonth} className={navBtn} style={{ color: "#9ca3af" }}>
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-white font-bold text-sm min-w-[120px] text-center">
            {MONTH_NAMES[month - 1]} {year}
          </span>
          <button onClick={nextMonth} className={navBtn}
            style={{ color: isCurrent ? "#374151" : "#9ca3af" }} disabled={isCurrent}>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-7 w-7 animate-spin text-orange-400" />
        </div>
      ) : payments.length === 0 ? (
        <div className="rounded-2xl py-20 text-center" style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)" }}>
          <TrendingUp className="h-10 w-10 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No sales recorded for {MONTH_SHORT[month - 1]} {year}</p>
        </div>
      ) : (
        <>
          {/* Summary stat cards */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: IndianRupee, label: "Revenue", value: formatCurrency(grandTotal), color: "#f97316" },
              { icon: ShoppingBag,  label: "Sales",  value: String(new Set(allEntries.map(e => e.paymentId)).size), color: "#a78bfa" },
              { icon: Users,        label: "Sellers", value: String(groups.length),    color: "#2dd4bf" },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="rounded-2xl px-4 py-3 flex flex-col gap-1"
                style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${color}22` }}>
                    <Icon className="h-3.5 w-3.5" style={{ color }} />
                  </div>
                  <p className="text-xs text-gray-500">{label}</p>
                </div>
                <p className="text-lg font-bold text-white leading-tight">{value}</p>
              </div>
            ))}
          </div>

          {/* Trainer filter pills */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterEmp("all")}
              className="text-xs font-semibold px-3 py-1.5 rounded-full transition-all"
              style={filterEmp === "all"
                ? { background: "linear-gradient(135deg,#f97316,#ea580c)", color: "#fff" }
                : { background: "rgba(255,255,255,0.05)", color: "#6b7280" }}
            >
              All
            </button>
            {groups.map(([key, { emp, entries: ge, idx }]) => {
              const ac = avatarColor(idx);
              const active = filterEmp === key;
              return (
                <button key={key}
                  onClick={() => setFilterEmp(active ? "all" : key)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5"
                  style={active
                    ? { background: ac.bg, color: ac.color, border: `1px solid ${ac.color}44` }
                    : { background: "rgba(255,255,255,0.05)", color: "#6b7280", border: "1px solid transparent" }}
                >
                  {toTitleCase(emp.fullName.split(" ")[0])}
                  <span className="opacity-60">{ge.length}</span>
                </button>
              );
            })}
          </div>

          {/* Groups */}
          <div className="space-y-3">
            {visibleGroups.map(([key, { emp, entries: grpEntries, idx }]) => {
              const groupTotal = grpEntries.reduce((s, e) => s + e.creditedAmount, 0);
              const isOpen = expanded.has(key);
              const others = allEmployees.filter((e) => e.id !== emp?.id);
              const ac = avatarColor(idx);

              return (
                <div key={key} className="rounded-2xl overflow-hidden"
                  style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)", borderLeft: `3px solid ${ac.color}` }}>

                  {/* Group header */}
                  <button
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors"
                    onClick={() => setExpanded((prev) => {
                      const next = new Set(prev);
                      next.has(key) ? next.delete(key) : next.add(key);
                      return next;
                    })}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: ac.bg, color: ac.color }}>
                        {emp.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold text-white">{toTitleCase(emp.fullName)}</p>
                        <p className="text-xs text-gray-500">{grpEntries.length} sale{grpEntries.length !== 1 ? "s" : ""}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-white">{formatCurrency(groupTotal)}</span>
                      <ChevronLeft className={`h-4 w-4 text-gray-600 transition-transform ${isOpen ? "-rotate-90" : "rotate-180"}`} />
                    </div>
                  </button>

                  {/* Entries */}
                  {isOpen && (
                    <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                      {grpEntries.map((entry) => {
                        const entryKey = `${entry.paymentId}-${entry.splitRole}`;
                        const isMoving = moving === entry.paymentId;
                        const rowOpen = expandedRow.has(entryKey);
                        const selected = targetEmp[entry.paymentId] ?? "";

                        return (
                          <div key={entryKey} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                            <button
                              className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-white/[0.015] transition-colors"
                              onClick={() => setExpandedRow((prev) => {
                                const n = new Set(prev);
                                n.has(entryKey) ? n.delete(entryKey) : n.add(entryKey);
                                return n;
                              })}
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-white truncate">{toTitleCase(entry.member.fullName)}</p>
                                <p className="text-xs text-gray-500 flex items-center gap-1.5">
                                  {entry.member.memberId} · {fmt(entry.date)}{entry.categoryLabel ? ` · ${entry.categoryLabel}` : ""}
                                  {entry.isSplit && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                                      style={{ background: "rgba(249,115,22,0.15)", color: "#fb923c" }}>
                                      {entry.splitRole === "primary" ? "split" : "split"}
                                    </span>
                                  )}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <div className="text-right">
                                  <p className="font-bold text-sm text-white">{formatCurrency(entry.creditedAmount)}</p>
                                  {entry.isSplit && (
                                    <p className="text-[10px] text-gray-600">of {formatCurrency(entry.fullNet)}</p>
                                  )}
                                </div>
                                <ArrowRightLeft className={`h-3.5 w-3.5 transition-colors ${rowOpen ? "text-orange-400" : "text-gray-700"}`} />
                              </div>
                            </button>

                            {rowOpen && (
                              <div className="flex items-center gap-2 px-4 pb-3">
                                <select
                                  value={selected}
                                  onChange={(e) => setTargetEmp((prev) => ({ ...prev, [entry.paymentId]: e.target.value }))}
                                  className="flex-1 text-xs rounded-lg px-2.5 py-1.5 outline-none"
                                  style={{ background: "#222", border: "1px solid rgba(255,255,255,0.1)", color: selected ? "#f9fafb" : "#6b7280" }}
                                  disabled={isMoving}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <option value="">Move primary seller to…</option>
                                  {others.map((e) => (
                                    <option key={e.id} value={e.id}>{toTitleCase(e.fullName)}</option>
                                  ))}
                                </select>
                                <button
                                  onClick={(e) => { e.stopPropagation(); move(entry.paymentId); }}
                                  disabled={!selected || isMoving}
                                  className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg disabled:opacity-40 transition-all flex-shrink-0"
                                  style={{
                                    background: selected && !isMoving ? "linear-gradient(135deg,#f97316,#ea580c)" : "rgba(255,255,255,0.06)",
                                    color: selected && !isMoving ? "#fff" : "#6b7280",
                                  }}
                                >
                                  {isMoving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Move"}
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
