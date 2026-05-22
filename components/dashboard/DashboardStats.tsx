import Link from "next/link";
import {
  Users, UserX, RotateCcw, AlertTriangle,
  CalendarCheck, IndianRupee, TrendingUp, Building2, ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { DashboardStats } from "@/types";

type Props = { stats: DashboardStats };

const CARD_BG = "#161616";
const CARD_BORDER = "rgba(255,255,255,0.06)";

function HeroCard({
  label, value, sub, icon: Icon, href,
  accentColor, iconColor, iconBg, valueColor,
}: {
  label: string; value: string | number; sub: string;
  icon: LucideIcon;
  href: string; accentColor: string; iconColor: string; iconBg: string; valueColor: string;
}) {
  return (
    <Link href={href}
      className="group relative overflow-hidden rounded-2xl hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
      style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}
    >
      <div className="absolute inset-y-0 left-0 w-1 rounded-l-2xl" style={{ background: accentColor }} />
      <div className="pl-6 pr-5 py-6 flex items-start justify-between">
        <div className="flex-1 min-w-0 pr-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500">{label}</p>
          <p className="text-5xl font-black mt-2 leading-none" style={{ color: valueColor }}>{value}</p>
          <p className="text-xs text-gray-600 mt-2 font-medium">{sub}</p>
        </div>
        <div className="flex flex-col items-end justify-between h-full gap-4">
          <div className="rounded-2xl p-3.5" style={{ background: iconBg }}>
            <Icon className="h-6 w-6" style={{ color: iconColor }} />
          </div>
          <ArrowRight className="h-4 w-4 text-gray-600 group-hover:text-gray-400 group-hover:translate-x-0.5 transition-all duration-200" />
        </div>
      </div>
    </Link>
  );
}

function StatCard({
  label, value, sub, icon: Icon, href,
  accentColor, iconColor, iconBg,
}: {
  label: string; value: string | number; sub: string;
  icon: LucideIcon;
  href: string; accentColor: string; iconColor: string; iconBg: string;
}) {
  return (
    <Link href={href}
      className="group relative overflow-hidden rounded-2xl hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
      style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}
    >
      <div className="absolute inset-y-0 left-0 w-[3px] rounded-l-2xl" style={{ background: accentColor }} />
      <div className="pl-5 pr-4 py-4 flex items-center gap-4">
        <div className="rounded-xl p-2.5 flex-shrink-0" style={{ background: iconBg }}>
          <Icon className="h-4 w-4" style={{ color: iconColor }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 truncate">{label}</p>
          <p className="text-2xl font-extrabold text-white mt-0.5 leading-none group-hover:text-orange-400 transition-colors duration-200">
            {value}
          </p>
          <p className="text-[11px] text-gray-600 mt-0.5">{sub}</p>
        </div>
      </div>
    </Link>
  );
}

function RevenueCard({
  label, value, sub, icon: Icon, href, accentColor, iconColor, iconBg, isEmpty,
}: {
  label: string; value: string; sub: string; isEmpty: boolean;
  icon: LucideIcon;
  href: string; accentColor: string; iconColor: string; iconBg: string;
}) {
  return (
    <Link href={href}
      className="group relative overflow-hidden rounded-2xl hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
      style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}
    >
      <div className="absolute inset-y-0 left-0 w-[3px] rounded-l-2xl" style={{ background: accentColor }} />
      <div className="pl-5 pr-5 py-5 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{label}</p>
          <p className={`text-3xl font-black mt-1.5 leading-none transition-colors duration-200 ${isEmpty ? "text-gray-700" : "text-white group-hover:text-orange-400"}`}>
            {value}
          </p>
          <p className="text-xs text-gray-600 mt-1.5">{isEmpty ? "No payments recorded yet" : sub}</p>
        </div>
        <div className="rounded-2xl p-3" style={{ background: iconBg }}>
          <Icon className="h-5 w-5" style={{ color: isEmpty ? "#374151" : iconColor }} />
        </div>
      </div>
    </Link>
  );
}

export function DashboardStats({ stats }: Props) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <HeroCard
          label="Active Members" value={stats.activeMembers} sub="enrolled right now"
          icon={Users} href="/members?status=ACTIVE"
          accentColor="#10b981" iconColor="#10b981" iconBg="rgba(16,185,129,0.12)" valueColor="#34d399"
        />
        <HeroCard
          label="Expired Members" value={stats.expiredMembers} sub="need renewal — last 90 days"
          icon={UserX} href="/members?status=EXPIRED"
          accentColor="#ef4444" iconColor="#ef4444" iconBg="rgba(239,68,68,0.12)" valueColor="#f87171"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Renewals Due" value={stats.renewalsDueThisWeek} sub="expiring this week"
          icon={RotateCcw} href="/renewals"
          accentColor="#f59e0b" iconColor="#f59e0b" iconBg="rgba(245,158,11,0.12)" />
        <StatCard label="Inactive" value={stats.inactiveMembers4Plus} sub="4+ days absent"
          icon={AlertTriangle} href="/members?inactive=true"
          accentColor="#f97316" iconColor="#f97316" iconBg="rgba(249,115,22,0.12)" />
        <StatCard label="Today's Check-ins" value={stats.todayAttendance} sub="members present"
          icon={CalendarCheck} href="/attendance"
          accentColor="#3b82f6" iconColor="#3b82f6" iconBg="rgba(59,130,246,0.12)" />
        <StatCard label="Staff Present" value={stats.employeePresentToday} sub="clocked in today"
          icon={Building2} href="/employee-attendance"
          accentColor="#14b8a6" iconColor="#14b8a6" iconBg="rgba(20,184,166,0.12)" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RevenueCard label="Today's Revenue" value={formatCurrency(stats.todayCollections)}
          sub="collected today" isEmpty={stats.todayCollections === 0}
          icon={IndianRupee} href="/payments?dateFilter=today"
          accentColor="#8b5cf6" iconColor="#8b5cf6" iconBg="rgba(139,92,246,0.12)" />
        <RevenueCard label="Monthly Revenue" value={formatCurrency(stats.monthlyCollections)}
          sub="collected this month" isEmpty={stats.monthlyCollections === 0}
          icon={TrendingUp} href="/payments?dateFilter=month"
          accentColor="#6366f1" iconColor="#6366f1" iconBg="rgba(99,102,241,0.12)" />
      </div>
    </div>
  );
}
