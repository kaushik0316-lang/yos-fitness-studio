import Link from "next/link";
import { AlertTriangle, ChevronRight, Clock } from "lucide-react";
import { daysAgo, formatDate } from "@/lib/utils";
import { Company } from "@prisma/client";

type InactiveMember = {
  id: string; memberId: string; fullName: string; phone: string;
  lastAttendanceDate: Date | null; expiryDate: Date | null;
  primaryCompany: Company; trainer: { fullName: string } | null;
};

type Props = { members: InactiveMember[] };

export function InactiveMembersAlert({ members }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="bg-orange-50 rounded-xl p-1.5">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm">Inactive Members</h3>
            <p className="text-[11px] text-gray-400">4+ days without check-in</p>
          </div>
          {members.length > 0 && (
            <span className="ml-1 bg-orange-100 text-orange-700 text-xs font-bold rounded-full px-2 py-0.5">
              {members.length}
            </span>
          )}
        </div>
        <Link href="/members?inactive=true" className="text-xs text-orange-500 hover:text-orange-700 font-semibold flex items-center gap-0.5">
          All <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      {/* List */}
      {members.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2 text-gray-300">
          <AlertTriangle className="h-8 w-8" />
          <p className="text-sm text-gray-400 font-medium">No inactive members</p>
          <p className="text-xs text-gray-400">Great retention! 🎉</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {members.slice(0, 6).map((m) => {
            const absent = m.lastAttendanceDate ? daysAgo(m.lastAttendanceDate) : null;
            const severity = absent === null || absent >= 14 ? "text-red-600 bg-red-50"
              : absent >= 7 ? "text-red-500 bg-red-50"
              : "text-orange-600 bg-orange-50";

            return (
              <Link key={m.id} href={`/members/${m.id}`}
                className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 flex-shrink-0">
                    {m.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{m.fullName}</p>
                    <p className="text-xs text-gray-400">{m.memberId}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                  <span className={`text-xs font-bold px-2 py-1 rounded-lg ${severity}`}>
                    {absent === null ? "Never" : `${absent}d`}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
