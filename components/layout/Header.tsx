"use client";

import { Search, Calendar, Menu } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

type Props = {
  title: string;
  subtitle?: string;
};

export function Header({ title, subtitle }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const today = format(new Date(), "EEE, d MMM");

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (search.trim()) {
      router.push(`/members?search=${encodeURIComponent(search.trim())}`);
      setSearch("");
    }
  }

  return (
    <header
      className="h-14 flex items-center px-5 gap-4 sticky top-0 z-30 flex-shrink-0 backdrop-blur-sm"
      style={{
        background: "rgba(13,13,13,0.92)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      {/* Title */}
      <div className="flex-1 min-w-0">
        <h1 className="text-base font-bold text-white leading-tight truncate">{title}</h1>
        {subtitle && (
          <p className="text-[11px] leading-tight" style={{ color: "#4b5563" }}>{subtitle}</p>
        )}
      </div>

      {/* Date chip */}
      <div
        className="hidden md:flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium flex-shrink-0"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.06)",
          color: "#6b7280",
        }}
      >
        <Calendar className="h-3 w-3" style={{ color: "#f97316" }} />
        {today}
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="relative hidden md:block flex-shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 pointer-events-none" style={{ color: "#4b5563" }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search member..."
          className="pl-8 pr-4 py-1.5 text-[13px] rounded-lg focus:outline-none transition-all w-48 text-white"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
          onFocus={e => { e.currentTarget.style.border = "1px solid rgba(249,115,22,0.4)"; e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
          onBlur={e => { e.currentTarget.style.border = "1px solid rgba(255,255,255,0.06)"; e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
        />
      </form>
    </header>
  );
}
