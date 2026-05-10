import Link from "next/link";
import { Users, UserX, RotateCcw, AlertTriangle, CalendarCheck, IndianRupee, TrendingUp, Building2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { DashboardStats } from "@/types";

type Props = { stats: DashboardStats };

const cards = (stats: DashboardStats) => [
  {
    label: "Active Members",
    value: stats.activeMembers,
    sub: "enrolled right now",
    icon: Users,
    accent: "from-emerald-500 to-emerald-600",
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    href: "/members?status=ACTIVE",
  },
  {
    label: "Expired",
    value: stats.expiredMembers,
    sub: "need renewal",
    icon: UserX,
    accent: "from-red-500 to-red-600",
    iconBg: "bg-red-50",
    iconColor: "text-red-600",
    href: "/members?status=EXPIRED",
  },
  {
    label: "Renewals Due",
    value: stats.renewalsDueThisWeek,
    sub: "this week",
    icon: RotateCcw,
    accent: "from-amber-500 to-amber-600",
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
    href: "/renewals",
  },
  {
    label: "Inactive",
    value: stats.inactiveMembers4Plus,
    sub: "4+ days absent",
    icon: AlertTriangle,
    accent: "from-orange-500 to-orange-600",
    iconBg: "bg-orange-50",
    iconColor: "text-orange-600",
    href: "/members?inactive=true",
  },
  {
    label: "Today's Check-ins",
    value: stats.todayAttendance,
    sub: "members present",
    icon: CalendarCheck,
    accent: "from-blue-500 to-blue-600",
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
    href: "/attendance",
  },
  {
    label: "Today's Revenue",
    value: formatCurrency(stats.todayCollections),
    sub: "collected today",
    icon: IndianRupee,
    accent: "from-violet-500 to-violet-600",
    iconBg: "bg-violet-50",
    iconColor: "text-violet-600",
    href: "/payments",
  },
  {
    label: "Monthly Revenue",
    value: formatCurrency(stats.monthlyCollections),
    sub: "this month",
    icon: TrendingUp,
    accent: "from-indigo-500 to-indigo-600",
    iconBg: "bg-indigo-50",
    iconColor: "text-indigo-600",
    href: "/reports",
  },
  {
    label: "Staff Present",
    value: stats.employeePresentToday,
    sub: "clocked in today",
    icon: Building2,
    accent: "from-teal-500 to-teal-600",
    iconBg: "bg-teal-50",
    iconColor: "text-teal-600",
    href: "/employee-attendance",
  },
];

export function DashboardStats({ stats }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards(stats).map((card) => (
        <Link
          key={card.label}
          href={card.href}
          className="group bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-gray-100/80 hover:-translate-y-0.5 transition-all duration-200 overflow-hidden relative"
        >
          {/* Coloured top strip */}
          <div className={`absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r ${card.accent}`} />

          <div className="flex items-start justify-between mt-1">
            <div className="flex-1 min-w-0 pr-2">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest truncate">{card.label}</p>
              <p className="text-3xl font-extrabold text-gray-900 mt-1.5 leading-none group-hover:text-orange-500 transition-colors">
                {card.value}
              </p>
              <p className="text-xs text-gray-400 mt-1.5">{card.sub}</p>
            </div>
            <div className={`${card.iconBg} rounded-xl p-3 flex-shrink-0`}>
              <card.icon className={`h-5 w-5 ${card.iconColor}`} />
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
