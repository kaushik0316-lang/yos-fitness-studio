"use client";

import { useState } from "react";
import { Download } from "lucide-react";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];

export function ExportButtons() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-12
  const [year, setYear] = useState(now.getFullYear());

  const monthStr = `${year}-${String(month).padStart(2, "0")}`;

  const selectClass =
    "text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-orange-400 transition-colors bg-white text-gray-700 font-medium cursor-pointer";

  const btnClass =
    "border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={month}
        onChange={(e) => setMonth(Number(e.target.value))}
        className={selectClass}
      >
        {MONTHS.map((name, i) => (
          <option key={name} value={i + 1}>{name}</option>
        ))}
      </select>

      <select
        value={year}
        onChange={(e) => setYear(Number(e.target.value))}
        className={selectClass}
      >
        {YEARS.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>

      <button
        className={btnClass}
        onClick={() => {
          window.location.href = `/api/export/payments?company=YOS_FITNESS&month=${monthStr}`;
        }}
      >
        <Download size={14} />
        Yos Fitness
      </button>

      <button
        className={btnClass}
        onClick={() => {
          window.location.href = `/api/export/payments?company=YOS_FITNESS_STUDIO&month=${monthStr}`;
        }}
      >
        <Download size={14} />
        Yos Studio
      </button>
    </div>
  );
}
