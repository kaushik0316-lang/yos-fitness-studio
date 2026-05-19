"use client";

import { Download } from "lucide-react";

interface ExportButtonsProps {
  currentMonth: string; // "2026-05"
  currentMonthLabel: string; // "May 2026"
}

export function ExportButtons({ currentMonth, currentMonthLabel }: ExportButtonsProps) {
  const btnClass =
    "border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors";

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-400 mr-1">{currentMonthLabel}</span>
      <button
        className={btnClass}
        onClick={() => {
          window.location.href = `/api/export/payments?company=YOS_FITNESS&month=${currentMonth}`;
        }}
      >
        <Download size={14} />
        Yos Fitness
      </button>
      <button
        className={btnClass}
        onClick={() => {
          window.location.href = `/api/export/payments?company=YOS_FITNESS_STUDIO&month=${currentMonth}`;
        }}
      >
        <Download size={14} />
        Yos Studio
      </button>
    </div>
  );
}
