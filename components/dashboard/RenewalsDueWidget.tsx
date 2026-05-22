import Link from "next/link";
import { RotateCcw, ChevronRight, Phone } from "lucide-react";
import { formatDate, daysUntil } from "@/lib/utils";

type ExpiringMember = {
  id: string; memberId: string; fullName: string; phone: string;
  expiryDate: Date | null;
};

type Props = { members: ExpiringMember[] };

export function RenewalsDueWidget({ members }: Props) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-2.5">
          <div className="rounded-xl p-1.5" style={{ background: "rgba(245,158,11,0.12)" }}>
            <RotateCcw className="h-4 w-4 text-amber-400" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">Renewals Due</h3>
            <p className="text-[11px] text-gray-600">Expiring within 7 days</p>
          </div>
          {members.length > 0 && (
            <span className="ml-1 text-xs font-bold rounded-full px-2 py-0.5" style={{ background: "rgba(245,158,11,0.15)", color: "#fbbf24" }}>
              {members.length}
            </span>
          )}
        </div>
        <Link href="/renewals" className="text-xs text-orange-400 hover:text-orange-300 font-semibold flex items-center gap-0.5 transition-colors">
          All <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      {members.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2">
          <RotateCcw className="h-8 w-8 text-gray-700" />
          <p className="text-sm text-gray-500 font-medium">All clear this week</p>
        </div>
      ) : (
        <div>
          {members.map((m) => {
            const days = m.expiryDate ? daysUntil(m.expiryDate) : 0;
            const urgencyColor = days <= 1
              ? "text-red-400 bg-red-500/10"
              : days <= 3
              ? "text-orange-400 bg-orange-500/10"
              : "text-amber-400 bg-amber-500/10";

            return (
              <div key={m.id}
                className="flex items-center justify-between px-5 py-3 transition-colors"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                onMouseLeave={e => (e.currentTarget.style.background = "")}
              >
                <Link href={`/members/${m.id}`} className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: "rgba(255,255,255,0.08)", color: "#9ca3af" }}>
                    {m.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate hover:text-orange-400 transition-colors">{m.fullName}</p>
                    <p className="text-xs text-gray-600">{formatDate(m.expiryDate)}</p>
                  </div>
                </Link>
                <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                  <a href={`tel:${m.phone}`}
                    className="p-1.5 rounded-lg text-gray-600 hover:text-gray-300 transition-colors"
                    style={{ background: "rgba(255,255,255,0.05)" }}>
                    <Phone className="h-3.5 w-3.5" />
                  </a>
                  <span className={`text-xs font-bold px-2 py-1 rounded-lg ${urgencyColor}`}>
                    {days === 0 ? "Today!" : `${days}d`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
