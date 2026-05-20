"use client";

import { format } from "date-fns";
import { Users, RotateCcw, IndianRupee, Building2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type Props = {
  userName: string;
  userRole: string;
  activeMembers: number;
  renewalsDue: number;
  todayRevenue: number;
  staffPresent: number;
};

export function DashboardHero({
  userName, userRole,
  activeMembers, renewalsDue, todayRevenue, staffPresent,
}: Props) {
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const today = format(new Date(), "EEEE, d MMM yyyy");
  const firstName = userName.split(" ")[0];

  const pills = [
    { label: "Active members", value: activeMembers.toLocaleString("en-IN"), icon: Users,         color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "Renewals due",   value: renewalsDue.toString(),                icon: RotateCcw,     color: "text-amber-400",   bg: "bg-amber-500/10"  },
    { label: "Today's revenue",value: formatCurrency(todayRevenue),          icon: IndianRupee,   color: "text-orange-400",  bg: "bg-orange-500/10" },
    { label: "Staff present",  value: staffPresent.toString(),               icon: Building2,     color: "text-blue-400",    bg: "bg-blue-500/10"   },
  ];

  return (
    <div className="relative overflow-hidden rounded-2xl p-6 md:p-8"
      style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f172a 100%)" }}
    >
      {/* Dot-grid texture */}
      <div className="absolute inset-0 opacity-[0.04]"
        style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "22px 22px" }}
      />
      {/* Orange glow top-right */}
      <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full opacity-20"
        style={{ background: "radial-gradient(circle, #f97316, transparent 70%)" }}
      />
      {/* Subtle bottom line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-500/30 to-transparent" />

      <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">

        {/* Left — greeting */}
        <div>
          <p className="text-gray-400 text-sm font-medium tracking-wide">{greeting}</p>
          <h1 className="text-4xl md:text-5xl font-black text-white mt-1 tracking-tight leading-none">
            {firstName} <span className="text-orange-400">👋</span>
          </h1>
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className="bg-orange-500/20 border border-orange-500/30 text-orange-300 px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-widest">
              {userRole.replace(/_/g, " ")}
            </span>
            <span className="text-gray-500 text-xs">·</span>
            <span className="text-gray-400 text-xs font-medium">Yos Fitness Studio</span>
            <span className="text-gray-500 text-xs">·</span>
            <span className="text-gray-400 text-xs">{today}</span>
          </div>
        </div>

        {/* Right — quick-glance stats */}
        <div className="grid grid-cols-2 gap-2.5 flex-shrink-0">
          {pills.map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label}
              className={`${bg} rounded-xl px-4 py-3 flex items-center gap-3 border border-white/5 backdrop-blur-sm`}
            >
              <div className="bg-white/5 rounded-lg p-1.5 flex-shrink-0">
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-white font-bold text-sm leading-none truncate">{value}</p>
                <p className="text-gray-400 text-[10px] mt-0.5 font-medium leading-tight">{label}</p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
