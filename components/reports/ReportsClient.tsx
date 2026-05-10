"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Users, TrendingUp, RotateCcw, UserPlus } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid,
} from "recharts";
import { formatCurrency, getMonthName, MEMBER_STATUS_COLORS, COMPANY_COLORS } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { UserRole, Company, MemberStatus } from "@prisma/client";

const COLORS = ["#f97316", "#6366f1", "#22c55e", "#eab308", "#ec4899", "#14b8a6"];

type Props = {
  month: number; year: number;
  collectionsByMode: { mode: string; amount: number; count: number }[];
  collectionsByCompany: { company: Company; amount: number; count: number }[];
  memberStatusCounts: { status: MemberStatus; count: number }[];
  attendanceTrend: { date: string; count: number }[];
  monthlyCollectionsTrend: { label: string; yosFitness: number; yosStudio: number; total: number }[];
  topPackages: { name: string; count: number; revenue: number }[];
  newMembersThisMonth: number;
  renewalsThisMonth: number;
  userRole: UserRole;
};

export function ReportsClient({
  month, year, collectionsByMode, collectionsByCompany, memberStatusCounts,
  attendanceTrend, monthlyCollectionsTrend, topPackages,
  newMembersThisMonth, renewalsThisMonth, userRole,
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

  return (
    <div className="space-y-6">
      {/* Month nav */}
      <div className="flex items-center gap-2">
        <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 border">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="font-semibold text-gray-900 min-w-[140px] text-center">
          {getMonthName(month)} {year}
        </span>
        <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 border">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Collections", value: formatCurrency(totalCollections), icon: TrendingUp, color: "text-green-600 bg-green-50" },
          { label: "Total Members", value: totalMembers, icon: Users, color: "text-blue-600 bg-blue-50" },
          { label: "New Members", value: newMembersThisMonth, icon: UserPlus, color: "text-purple-600 bg-purple-50" },
          { label: "Renewals", value: renewalsThisMonth, icon: RotateCcw, color: "text-orange-600 bg-orange-50" },
        ].map((k) => (
          <div key={k.label} className="bg-white rounded-xl border p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500">{k.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{k.value}</p>
              </div>
              <div className={cn("rounded-lg p-2", k.color)}>
                <k.icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 6-month revenue trend */}
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Revenue — Last 6 Months</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyCollectionsTrend} margin={{ left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="yosFitness" name="Yos Fitness" fill="#f97316" radius={[3, 3, 0, 0]} />
              <Bar dataKey="yosStudio"  name="Yos Studio"  fill="#6366f1" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Member status pie */}
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Member Status Breakdown</h3>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie data={memberStatusCounts} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2} dataKey="count" nameKey="status">
                  {memberStatusCounts.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {memberStatusCounts.map((s, i) => (
                <div key={s.status} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-gray-600">{s.status}</span>
                  </div>
                  <span className="font-semibold text-gray-900">{s.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Collections by mode */}
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Collections by Payment Mode</h3>
          {collectionsByMode.length === 0 ? (
            <p className="text-sm text-gray-400">No payments this month.</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={collectionsByMode} layout="vertical" margin={{ left: 20, right: 20 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="mode" tick={{ fontSize: 11 }} width={80} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="amount" fill="#f97316" radius={[0, 4, 4, 0]} name="Amount" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Attendance trend */}
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Daily Attendance This Month</h3>
          {attendanceTrend.length === 0 ? (
            <p className="text-sm text-gray-400">No attendance data.</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={attendanceTrend} margin={{ left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={3} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Line type="monotone" dataKey="count" stroke="#f97316" strokeWidth={2} dot={false} name="Check-ins" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Top packages */}
      {topPackages.length > 0 && (
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Top Packages This Month</h3>
          <div className="space-y-2">
            {topPackages.map((p, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                  <p className="text-sm font-medium text-gray-900">{p.name}</p>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <span className="text-gray-500">{p.count} sold</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(p.revenue)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
