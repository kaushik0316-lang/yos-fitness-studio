import Link from "next/link";
import { RotateCcw, ChevronRight, Phone } from "lucide-react";
import { formatDate, daysUntil } from "@/lib/utils";
import { cn } from "@/lib/utils";

type ExpiringMember = {
  id: string; memberId: string; fullName: string; phone: string;
  expiryDate: Date | null;
};

type Props = { members: ExpiringMember[] };

export function RenewalsDueWidget({ members }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="bg-amber-50 rounded-xl p-1.5">
            <RotateCcw className="h-4 w-4 text-amber-500" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm">Renewals Due</h3>
            <p className="text-[11px] text-gray-400">Expiring within 7 days</p>
          </div>
          {members.length > 0 && (
            <span className="ml-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full px-2 py-0.5">
              {members.length}
            </span>
          )}
        </div>
        <Link href="/renewals" className="text-xs text-orange-500 hover:text-orange-700 font-semibold flex items-center gap-0.5">
          All <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      {/* List */}
      {members.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2 text-gray-300">
          <RotateCcw className="h-8 w-8" />
          <p className="text-sm text-gray-400 font-medium">All clear this week</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {members.map((m) => {
            const days = m.expiryDate ? daysUntil(m.expiryDate) : 0;
            const urgencyColor = days <= 1 ? "text-red-600 bg-red-50"
              : days <= 3 ? "text-orange-600 bg-orange-50"
              : "text-amber-600 bg-amber-50";

            return (
              <div key={m.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                <Link href={`/members/${m.id}`} className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 flex-shrink-0">
                    {m.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate hover:text-orange-600 transition-colors">{m.fullName}</p>
                    <p className="text-xs text-gray-400">{formatDate(m.expiryDate)}</p>
                  </div>
                </Link>
                <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                  <a href={`tel:${m.phone}`} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
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
