"use client";

import { TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type Props = { yosFitness: number; yosStudio: number; total: number };

export function CollectionsWidget({ yosFitness, yosStudio, total }: Props) {
  const yfPct = total > 0 ? Math.round((yosFitness / total) * 100) : 0;
  const yfsPct = total > 0 ? 100 - yfPct : 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="bg-indigo-50 rounded-xl p-2">
              <TrendingUp className="h-4 w-4 text-indigo-600" />
            </div>
            <h3 className="font-bold text-gray-900 text-base">Monthly Collections</h3>
          </div>
          <p className="text-xs text-gray-400 ml-10">Revenue breakdown by gym</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-gray-400 uppercase tracking-wide">Total</p>
          <p className="text-2xl font-extrabold text-gray-900">{formatCurrency(total)}</p>
        </div>
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="h-3 rounded-full overflow-hidden bg-gray-100 mb-5 flex">
          <div className="bg-orange-500 h-full transition-all duration-700 rounded-l-full" style={{ width: `${yfPct}%` }} />
          <div className="bg-indigo-500 h-full transition-all duration-700 rounded-r-full flex-1" />
        </div>
      )}

      {/* Legend */}
      <div className="space-y-3">
        {[
          { label: "Yos Fitness", value: yosFitness, color: "bg-orange-500", pct: yfPct },
          { label: "Yos Studio", value: yosStudio, color: "bg-indigo-500", pct: yfsPct },
        ].map((row) => (
          <div key={row.label} className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${row.color} flex-shrink-0`} />
            <span className="text-sm text-gray-700 flex-1">{row.label}</span>
            <span className="text-xs text-gray-400 w-10 text-right">{row.pct}%</span>
            <span className="text-sm font-bold text-gray-900 w-28 text-right">{formatCurrency(row.value)}</span>
          </div>
        ))}
        <div className="border-t pt-3 flex items-center">
          <span className="text-sm font-semibold text-gray-700 flex-1">Total this month</span>
          <span className="text-sm font-extrabold text-gray-900">{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  );
}
