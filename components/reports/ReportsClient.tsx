"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Users, TrendingUp, RotateCcw, UserPlus } from "lucide-react";
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
  newMembersThisMonth: number; renewalsThisMonth: number; userRole: UserRole;
};

export function ReportsClient({
  month, year, collectionsByMode, collectionsByCompany, memberStatusCounts,
  attendanceTrend, monthlyCollectionsTrend, topPackages,
  newMembersThisMonth, renewalsThisMonth,
}: Props) {
  const router = useRouter();

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
