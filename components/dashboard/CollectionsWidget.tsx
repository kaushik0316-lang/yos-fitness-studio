"use client";

import { TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type Props = { yosFitness: number; yosStudio: number; total: number };

export function CollectionsWidget({ yosFitness, yosStudio, total }: Props) {
  const yfPct = total > 0 ? Math.round((yosFitness / total) * 100) : 0;
  const yfsPct = total > 0 ? 100 - yfPct : 0;

  return (
    <div className="rounded-2xl p-6" style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="rounded-xl p-2" style={{ background: "rgba(99,102,241,0.12)" }}>
              <TrendingUp className="h-4 w-4 text-indigo-400" />
            </div>
            <h3 className="font-bold text-white text-base">Monthly Collections</h3>
          </div>
          <p className="text-xs text-gray-600 ml-10">Revenue breakdown by gym</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-gray-500 uppercase tracking-wide">Total</p>
          <p className="text-2xl font-extrabold text-white">{formatCurrency(total)}</p>
        </div>
      </div>

      {total > 0 && (
        <div className="h-3 rounded-full overflow-hidden mb-5 flex" style={{ background: "rgba(255,255,255,0.06)" }}>
          <div className="bg-orange-500 h-full transition-all duration-700 rounded-l-full" style={{ width: `${yfPct}%` }} />
          <div className="bg-indigo-500 h-full transition-all duration-700 rounded-r-full flex-1" />
        </div>
      )}

      <div className="space-y-3">
        {[
          { label: "Yos Fitness", value: yosFitness, color: "bg-orange-500", pct: yfPct },
          { label: "Yos Studio",  value: yosStudio,  color: "bg-indigo-500", pct: yfsPct },
        ].map((row) => (
          <div key={row.label} className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${row.color} flex-shrink-0`} />
            <span className="text-sm text-gray-400 flex-1">{row.label}</span>
            <span className="text-xs text-gray-600 w-10 text-right">{row.pct}%</span>
            <span className="text-sm font-bold text-white w-28 text-right">{formatCurrency(row.value)}</span>
          </div>
        ))}
        <div className="pt-3 flex items-center" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <span className="text-sm font-semibold text-gray-400 flex-1">Total this month</span>
          <span className="text-sm font-extrabold text-white">{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  );
}
