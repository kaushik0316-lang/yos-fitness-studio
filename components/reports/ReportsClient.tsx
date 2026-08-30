"use client";

import { useRouter } from "next/navigation";
import { toTitleCase } from "@/lib/utils/titleCase";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Users, TrendingUp, RotateCcw, UserPlus, Zap } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid,
} from "recharts";
import { formatCurrency, getMonthName } from "@/lib/utils";
import type { UserRole, Company, MemberStatus } from "@prisma/client";

const COLORS = ["#f97316", "#6366f1", "#22c55e", "#eab308", "#ec4899", "#14b8a6"];
const CARD = { background: "#161616", border: "1px solid rgba(255,255,255,0.06)" };
const CHART_STYLE = {
  background: "rgba(22,22,22,0.95)", border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: 8, fontSize: 12, color: "#e5e7eb",
};

type Props = {
  month: number; year: number;
  collectionsByMode: { mode: string; amount: number; count: number }[];
  collectionsByCompany: { company: Company; amount: number; count: number }[];
  memberStatusCounts: { status: MemberStatus; count: number }[];
  attendanceTrend: { date: string; count: number }[];
  monthlyCollectionsTrend: { label: string; yosFitness: number; yosStudio: number; total: number }[];
  topPackages: { name: string; count: number; revenue: number }[];
  newMembersThisMonth: number; renewalsThisMonth: number;
  lastMonthTotal: number; lastMonthNewMembers: number; lastMonthRenewals: number;
  winBackCount: number;
  totalDiscountsThisMonth: number;
  renewalsDueCount: number;
  avgPaymentAmount: number;
  userRole: UserRole;
};

export function ReportsClient({
  month, year, collectionsByMode, collectionsByCompany, memberStatusCounts,
  attendanceTrend, monthlyCollectionsTrend, topPackages,
  newMembersThisMonth, renewalsThisMonth,
  lastMonthTotal, lastMonthNewMembers, lastMonthRenewals, winBackCount,
  totalDiscountsThisMonth, renewalsDueCount, avgPaymentAmount,
}: Props) {
  const router = useRouter();
  const [upsell, setUpsell] = useState<{ memberId: string; fullName: string; phone: string; packageName: string | null; checkIns: number }[]>([]);
  useEffect(() => {
    fetch("/api/members/upsell").then(r => r.json()).then(d => { if (Array.isArray(d)) setUpsell(d); });
  }, []);

  function prevMonth() {
    const d = new Date(year, month - 2, 1);
    router.push(`/reports?month=${d.getMonth() + 1}&year=${d.getFullYear()}`);
  }
  function nextMonth() {
    const d = new Date(year, month, 1);
    router.push(`/reports?month=${d.getMonth() + 1}&year=${d.getFullYear()}`);
  }

  const totalCollections = collectionsByCompany.reduce((s, c) => s + c.amount, 0);
  const totalMembers = memberStatusCounts.reduce((s, c) => s + c.count, 0);

  function delta(current: number, prev: number) {
    if (prev === 0) return null;
    const pct = Math.round(((current - prev) / prev) * 100);
    return { pct, up: current >= prev };
  }

  const revDelta      = delta(totalCollections, lastMonthTotal);
  const membersDelta  = delta(newMembersThisMonth, lastMonthNewMembers);
  const renewalsDelta = delta(renewalsThisMonth, lastMonthRenewals);

  const kpiCards = [
    { label: "Total Collections", value: formatCurrency(totalCollections), icon: TrendingUp, accent: "#10b981", iconBg: "rgba(16,185,129,0.12)" },
    { label: "Total Members",     value: totalMembers,                     icon: Users,      accent: "#3b82f6", iconBg: "rgba(59,130,246,0.12)" },
    { label: "New Members",       value: newMembersThisMonth,              icon: UserPlus,   accent: "#a855f7", iconBg: "rgba(168,85,247,0.12)" },
    { label: "Renewals",          value: renewalsThisMonth,                icon: RotateCcw,  accent: "#f97316", iconBg: "rgba(249,115,22,0.12)" },
  ];

  return (
    <div className="space-y-6">
      {/* Month nav */}
      <div className="flex items-center gap-2">
        <button onClick={prevMonth} className="p-1.5 rounded-lg text-gray-500 hover:text-white transition-colors"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="font-semibold text-white min-w-[140px] text-center">
          {getMonthName(month)} {year}
        </span>
        <button onClick={nextMonth} className="p-1.5 rounded-lg text-gray-500 hover:text-white transition-colors"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpiCards.map((k) => (
          <div key={k.label} className="relative overflow-hidden rounded-2xl p-5" style={CARD}>
            <div className="absolute inset-x-0 top-0 h-[3px] rounded-t-2xl" style={{ background: k.accent }} />
            <div className="flex items-start justify-between mt-1">
              <div>
                <p className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">{k.label}</p>
                <p className="text-2xl font-bold text-white mt-1">{k.value}</p>
              </div>
              <div className="rounded-xl p-2.5" style={{ background: k.iconBg }}>
                <k.icon className="h-5 w-5" style={{ color: k.accent }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── vs Last Month comparison ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "Revenue vs Last Month",    current: formatCurrency(totalCollections), prev: formatCurrency(lastMonthTotal),    d: revDelta      },
          { label: "New Members vs Last Month", current: String(newMembersThisMonth),      prev: String(lastMonthNewMembers),       d: membersDelta  },
          { label: "Renewals vs Last Month",    current: String(renewalsThisMonth),        prev: String(lastMonthRenewals),         d: renewalsDelta },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl p-4 flex items-center gap-4" style={CARD}>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest truncate">{item.label}</p>
              <div className="flex items-end gap-2 mt-1">
                <p className="text-xl font-extrabold text-white">{item.current}</p>
                {item.d && (
                  <p className="text-xs font-bold mb-0.5" style={{ color: item.d.up ? "#4ade80" : "#f87171" }}>
                    {item.d.up ? "▲" : "▼"} {Math.abs(item.d.pct)}%
                  </p>
                )}
              </div>
              <p className="text-[11px] text-gray-600 mt-0.5">Last month: {item.prev}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Forecast + Discount row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Revenue forecast */}
        <div className="rounded-2xl p-4" style={CARD}>
          <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Next 30 Days — Expected Revenue</p>
          <p className="text-2xl font-extrabold text-white mt-1" style={{ fontVariantNumeric: "tabular-nums" }}>
            {formatCurrency(Math.round(renewalsDueCount * avgPaymentAmount * 0.65))}
          </p>
          <p className="text-xs text-gray-600 mt-1">
            {renewalsDueCount} memberships expiring · avg {formatCurrency(Math.round(avgPaymentAmount))} · 65% renewal rate
          </p>
        </div>
        {/* Discount leakage */}
        {totalDiscountsThisMonth > 0 && (
          <div className="rounded-2xl p-4" style={{ ...CARD, borderLeft: "3px solid #f59e0b" }}>
            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Discounts Given This Month</p>
            <p className="text-2xl font-extrabold mt-1" style={{ color: "#f59e0b", fontVariantNumeric: "tabular-nums" }}>
              {formatCurrency(totalDiscountsThisMonth)}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              {totalCollections > 0 ? `${Math.round((totalDiscountsThisMonth / (totalCollections + totalDiscountsThisMonth)) * 100)}% of gross revenue waived` : "Review discount approvals"}
            </p>
          </div>
        )}
      </div>

      {/* ── Win-back alert ── */}
      {winBackCount > 0 && (
        <div className="rounded-2xl px-5 py-4 flex items-center justify-between gap-4"
          style={{ background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.25)" }}>
          <div>
            <p className="text-sm font-bold text-purple-300">{winBackCount} members haven't renewed in 31–90 days</p>
            <p className="text-xs text-gray-500 mt-0.5">They're the easiest to get back — one message often does it.</p>
          </div>
          <a href="/renewals" className="flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold text-white transition-colors"
            style={{ background: "rgba(168,85,247,0.3)", border: "1px solid rgba(168,85,247,0.4)" }}>
            View Win Back →
          </a>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 6-month revenue trend */}
        <div className="rounded-2xl p-5" style={CARD}>
          <h3 className="font-semibold text-white mb-4">Revenue — Last 6 Months</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyCollectionsTrend} margin={{ left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6b7280" }} />
              <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={CHART_STYLE} />
              <Legend wrapperStyle={{ fontSize: 12, color: "#9ca3af" }} />
              <Bar dataKey="yosFitness" name="Yos Fitness" fill="#f97316" radius={[3, 3, 0, 0]} />
              <Bar dataKey="yosStudio"  name="Yos Studio"  fill="#6366f1" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Member status pie */}
        <div className="rounded-2xl p-5" style={CARD}>
          <h3 className="font-semibold text-white mb-4">Member Status Breakdown</h3>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie data={memberStatusCounts} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2} dataKey="count" nameKey="status">
                  {memberStatusCounts.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={CHART_STYLE} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {memberStatusCounts.map((s, i) => (
                <div key={s.status} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-gray-500">{s.status}</span>
                  </div>
                  <span className="font-semibold text-white">{s.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Collections by mode */}
        <div className="rounded-2xl p-5" style={CARD}>
          <h3 className="font-semibold text-white mb-4">Collections by Payment Mode</h3>
          {collectionsByMode.length === 0 ? (
            <p className="text-sm text-gray-600">No payments this month.</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={collectionsByMode} layout="vertical" margin={{ left: 20, right: 20 }}>
                <XAxis type="number" tick={{ fontSize: 11, fill: "#6b7280" }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="mode" tick={{ fontSize: 11, fill: "#6b7280" }} width={80} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={CHART_STYLE} />
                <Bar dataKey="amount" fill="#f97316" radius={[0, 4, 4, 0]} name="Amount" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Attendance trend */}
        <div className="rounded-2xl p-5" style={CARD}>
          <h3 className="font-semibold text-white mb-4">Daily Attendance This Month</h3>
          {attendanceTrend.length === 0 ? (
            <p className="text-sm text-gray-600">No attendance data.</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={attendanceTrend} margin={{ left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#6b7280" }} interval={3} />
                <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} />
                <Tooltip contentStyle={CHART_STYLE} />
                <Line type="monotone" dataKey="count" stroke="#f97316" strokeWidth={2} dot={false} name="Check-ins" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Upsell candidates ── */}
      {upsell.length > 0 && (
        <div className="rounded-2xl p-5" style={CARD}>
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-4 w-4" style={{ color: "#f59e0b" }} />
            <h3 className="font-semibold text-white">PT Upsell Candidates</h3>
            <span className="ml-auto text-xs text-gray-600">Active members, 12+ check-ins/30d, no PT package</span>
          </div>
          <div className="space-y-2">
            {upsell.map((m, i) => (
              <div key={m.memberId} className="flex items-center justify-between p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.04)" }}>
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center" style={{ background: "rgba(245,158,11,0.15)", color: "#fbbf24" }}>{i + 1}</span>
                  <div>
                    <p className="text-sm font-medium text-white">{m.fullName}</p>
                    <p className="text-xs text-gray-600">{m.packageName ?? "No package"} · {m.memberId}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-bold" style={{ color: "#f59e0b" }}>{m.checkIns} visits</span>
                  <a href={`https://wa.me/91${m.phone.replace(/\D/g, "").slice(-10)}?text=${encodeURIComponent(`Hi ${toTitleCase(m.fullName)}! We noticed you've been crushing it at Yos 💪 Would you be interested in Personal Training for faster results? Reply here and we'll tell you more!`)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                    style={{ background: "rgba(37,211,102,0.12)", color: "#25d366", border: "1px solid rgba(37,211,102,0.2)" }}>
                    WhatsApp
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top packages */}
      {topPackages.length > 0 && (
        <div className="rounded-2xl p-5" style={CARD}>
          <h3 className="font-semibold text-white mb-4">Top Packages This Month</h3>
          <div className="space-y-2">
            {topPackages.map((p, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg"
                style={{ background: "rgba(255,255,255,0.04)" }}>
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center"
                    style={{ background: "rgba(249,115,22,0.15)", color: "#fb923c" }}>{i + 1}</span>
                  <p className="text-sm font-medium text-white">{p.name}</p>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <span className="text-gray-500">{p.count} sold</span>
                  <span className="font-semibold text-white">{formatCurrency(p.revenue)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
