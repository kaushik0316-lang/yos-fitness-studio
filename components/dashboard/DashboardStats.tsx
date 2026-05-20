import Link from "next/link";
import {
  Users, UserX, RotateCcw, AlertTriangle,
  CalendarCheck, IndianRupee, TrendingUp, Building2, ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { DashboardStats } from "@/types";

type Props = { stats: DashboardStats };

function HeroCard({
  label, value, sub, icon: Icon, href,
  borderColor, bgColor, iconColor, iconBg, valueColor,
}: {
  label: string; value: string | number; sub: string;
  icon: LucideIcon;
  href: string; borderColor: string; bgColor: string;
  iconColor: string; iconBg: string; valueColor: string;
}) {
  return (
    <Link href={href}
      className="group relative overflow-hidden rounded-2xl border border-gray-100 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
      style={{ background: bgColor }}
    >
      {/* Left accent bar */}
      <div className="absolute inset-y-0 left-0 w-1 rounded-l-2xl" style={{ background: borderColor }} />

      <div className="pl-6 pr-5 py-6 flex items-start justify-between">
        <div className="flex-1 min-w-0 pr-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">{label}</p>
          <p className="text-5xl font-black mt-2 leading-none transition-colors duration-200"
            style={{ color: valueColor }}
          >
            {value}
          </p>
          <p className="text-xs text-gray-500 mt-2 font-medium">{sub}</p>
        </div>
        <div className="flex flex-col items-end justify-between h-full gap-4">
          <div className="rounded-2xl p-3.5" style={{ background: iconBg }}>
            <Icon className="h-6 w-6" style={{ color: iconColor }} />
          </div>
          <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all duration-200" />
        </div>
      </div>
    </Link>
  );
}

function StatCard({
  label, value, sub, icon: Icon, href,
  borderColor, iconColor, iconBg,
}: {
  label: string; value: string | number; sub: string;
  icon: LucideIcon;
  href: string; borderColor: string; iconColor: string; iconBg: string;
}) {
  return (
    <Link href={href}
      className="group relative overflow-hidden bg-white rounded-2xl border border-gray-100 hover:shadow-lg hover:border-gray-200 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
    >
      {/* Left accent bar */}
      <div className="absolute inset-y-0 left-0 w-[3px] rounded-l-2xl" style={{ background: borderColor }} />

      <div className="pl-5 pr-4 py-4 flex items-center gap-4">
        <div className="rounded-xl p-2.5 flex-shrink-0" style={{ background: iconBg }}>
          <Icon className="h-4 w-4" style={{ color: iconColor }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 truncate">{label}</p>
          <p className="text-2xl font-extrabold text-gray-900 mt-0.5 leading-none group-hover:text-orange-500 transition-colors duration-200">
            {value}
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>
        </div>
      </div>
    </Link>
  );
}

function RevenueCard({
  label, value, sub, icon: Icon, href, borderColor, iconColor, iconBg, isEmpty,
}: {
  label: string; value: string; sub: string; isEmpty: boolean;
  icon: LucideIcon;
  href: string; borderColor: string; iconColor: string; iconBg: string;
}) {
  return (
    <Link href={href}
      className="group relative overflow-hidden bg-white rounded-2xl border border-gray-100 hover:shadow-lg hover:border-gray-200 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
    >
      <div className="absolute inset-y-0 left-0 w-[3px] rounded-l-2xl" style={{ background: borderColor }} />
      <div className="pl-5 pr-5 py-5 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</p>
          <p className={`text-3xl font-black mt-1.5 leading-none transition-colors duration-200 ${isEmpty ? "text-gray-300" : "text-gray-900 group-hover:text-orange-500"}`}>
            {value}
          </p>
          <p className="text-xs text-gray-400 mt-1.5">{isEmpty ? "No payments recorded yet" : sub}</p>
        </div>
        <div className="rounded-2xl p-3" style={{ background: iconBg }}>
          <Icon className="h-5 w-5" style={{ color: isEmpty ? "#d1d5db" : iconColor }} />
        </div>
      </div>
    </Link>
  );
}

export function DashboardStats({ stats }: Props) {
  return (
    <div className="space-y-4">

      {/* ── Row 1: Hero cards — Active + Expired ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <HeroCard
          label="Active Members"
          value={stats.activeMembers}
          sub="enrolled right now"
          icon={Users}
          href="/members?status=ACTIVE"
          borderColor="#10b981"
          bgColor="#f0fdf4"
          iconColor="#059669"
          iconBg="#d1fae5"
          valueColor="#065f46"
        />
        <HeroCard
          label="Expired Members"
          value={stats.expiredMembers}
          sub="need renewal — last 90 days"
          icon={UserX}
          href="/members?status=EXPIRED"
          borderColor="#ef4444"
          bgColor="#fff5f5"
          iconColor="#dc2626"
          iconBg="#fee2e2"
          valueColor="#991b1b"
        />
      </div>

      {/* ── Row 2: Operational stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Renewals Due"
          value={stats.renewalsDueThisWeek}
          sub="expiring this week"
          icon={RotateCcw}
          href="/renewals"
          borderColor="#f59e0b"
          iconColor="#d97706"
          iconBg="#fef3c7"
        />
        <StatCard
          label="Inactive"
          value={stats.inactiveMembers4Plus}
          sub="4+ days absent"
          icon={AlertTriangle}
          href="/members?inactive=true"
          borderColor="#f97316"
          iconColor="#ea580c"
          iconBg="#ffedd5"
        />
        <StatCard
          label="Today's Check-ins"
          value={stats.todayAttendance}
          sub="members present"
          icon={CalendarCheck}
          href="/attendance"
          borderColor="#3b82f6"
          iconColor="#2563eb"
          iconBg="#dbeafe"
        />
        <StatCard
          label="Staff Present"
          value={stats.employeePresentToday}
          sub="clocked in today"
          icon={Building2}
          href="/employee-attendance"
          borderColor="#14b8a6"
          iconColor="#0d9488"
          iconBg="#ccfbf1"
        />
      </div>

      {/* ── Row 3: Revenue ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RevenueCard
          label="Today's Revenue"
          value={formatCurrency(stats.todayCollections)}
          sub="collected today"
          isEmpty={stats.todayCollections === 0}
          icon={IndianRupee}
          href="/payments?dateFilter=today"
          borderColor="#8b5cf6"
          iconColor="#7c3aed"
          iconBg="#ede9fe"
        />
        <RevenueCard
          label="Monthly Revenue"
          value={formatCurrency(stats.monthlyCollections)}
          sub="collected this month"
          isEmpty={stats.monthlyCollections === 0}
          icon={TrendingUp}
          href="/payments?dateFilter=month"
          borderColor="#6366f1"
          iconColor="#4f46e5"
          iconBg="#e0e7ff"
        />
      </div>

    </div>
  );
}
