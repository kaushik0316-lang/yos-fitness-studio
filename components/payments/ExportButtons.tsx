"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];

const selectStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.1)",
  color: "#d1d5db",
  borderRadius: "0.75rem",
  padding: "0.4rem 0.65rem",
  fontSize: "0.8125rem",
  cursor: "pointer",
  outline: "none",
};

export function ExportButtons() {
  const now = new Date();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const monthStr = `${year}-${String(month).padStart(2, "0")}`;

  function pushStatMonth(newMonth: number, newYear: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("statMonth", `${newYear}-${String(newMonth).padStart(2, "0")}`);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  function handleMonthChange(val: number) {
    setMonth(val);
    pushStatMonth(val, year);
  }

  function handleYearChange(val: number) {
    setYear(val);
    pushStatMonth(month, val);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Export CSV:</span>

      <select value={month} onChange={(e) => handleMonthChange(Number(e.target.value))} style={selectStyle}>
        {MONTHS.map((name, i) => (
          <option key={name} value={i + 1}>{name}</option>
        ))}
      </select>

      <select value={year} onChange={(e) => handleYearChange(Number(e.target.value))} style={selectStyle}>
        {YEARS.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>

      <button
        onClick={() => { window.location.href = `/api/export/payments?company=YOS_FITNESS&month=${monthStr}`; }}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors"
        style={{ background: "rgba(249,115,22,0.12)", color: "#fb923c", border: "1px solid rgba(249,115,22,0.25)" }}
      >
        <Download size={12} />
        Yos Fitness
      </button>

      <button
        onClick={() => { window.location.href = `/api/export/payments?company=YOS_FITNESS_STUDIO&month=${monthStr}`; }}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors"
        style={{ background: "rgba(99,102,241,0.12)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.25)" }}
      >
        <Download size={12} />
        Yos Studio
      </button>
    </div>
  );
}
