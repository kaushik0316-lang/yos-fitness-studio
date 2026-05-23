"use client";

import Link from "next/link";
import { AlertTriangle, ChevronRight, Clock } from "lucide-react";
import { daysAgo, formatDate } from "@/lib/utils";

type InactiveMember = {
  id: string; memberId: string; fullName: string; phone: string;
  lastAttendanceDate: Date | null; expiryDate: Date | null;
  trainer: { fullName: string } | null;
};

type Props = { members: InactiveMember[] };

export function InactiveMembersAlert({ members }: Props) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-2.5">
          <div className="rounded-xl p-1.5" style={{ background: "rgba(249,115,22,0.12)" }}>
            <AlertTriangle className="h-4 w-4 text-orange-400" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">Inactive Members</h3>
            <p className="text-[11px] text-gray-600">4+ days without check-in</p>
          </div>
          {members.length > 0 && (
            <span className="ml-1 text-xs font-bold rounded-full px-2 py-0.5" style={{ background: "rgba(249,115,22,0.15)", color: "#fb923c" }}>
              {members.length}
            </span>
          )}
        </div>
        <Link href="/members?inactive=true" className="text-xs text-orange-400 hover:text-orange-300 font-semibold flex items-center gap-0.5 transition-colors">
          All <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      {members.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2">
          <AlertTriangle className="h-8 w-8 text-gray-700" />
          <p className="text-sm text-gray-500 font-medium">No inactive members</p>
          <p className="text-xs text-gray-600">Great retention.</p>
        </div>
      ) : (
        <div>
          {members.slice(0, 6).map((m) => {
            const absent = m.lastAttendanceDate ? daysAgo(m.lastAttendanceDate) : null;
            const severity = absent === null || absent >= 14
              ? "text-red-400 bg-red-500/10"
              : absent >= 7
              ? "text-red-400 bg-red-500/10"
              : "text-orange-400 bg-orange-500/10";

            return (
              <Link key={m.id} href={`/members/${m.id}`}
                className="flex items-center justify-between px-5 py-3 transition-colors"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                onMouseLeave={e => (e.currentTarget.style.background = "")}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: "rgba(255,255,255,0.08)", color: "#9ca3af" }}>
                    {m.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{m.fullName}</p>
                    <p className="text-xs text-gray-600">{m.memberId}</p>
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
