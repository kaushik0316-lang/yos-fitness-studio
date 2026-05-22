"use client";

import { Search, Calendar } from "lucide-react";
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
  const today = format(new Date(), "EEE, d MMM yyyy");

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (search.trim()) {
      router.push(`/members?search=${encodeURIComponent(search.trim())}`);
      setSearch("");
    }
  }

  return (
    <header
      className="h-16 flex items-center px-6 gap-4 sticky top-0 z-30 flex-shrink-0"
      style={{
        background: "#111111",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Title */}
      <div className="flex-1 min-w-0">
        <h1 className="text-xl font-bold text-white leading-tight truncate">{title}</h1>
        {subtitle && (
          <p className="text-xs text-gray-500 leading-tight">{subtitle}</p>
        )}
      </div>

      {/* Date chip */}
      <div
        className="hidden md:flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium flex-shrink-0"
        style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.08)",
          color: "#9ca3af",
        }}
      >
        <Calendar className="h-3.5 w-3.5 text-orange-400" />
        {today}
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="relative hidden md:block flex-shrink-0">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-600 pointer-events-none" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search member..."
          className="pl-9 pr-4 py-2 text-sm rounded-xl focus:outline-none transition-colors w-56 text-white placeholder:text-gray-600"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1.5px solid rgba(255,255,255,0.08)",
          }}
          onFocus={(e) => { e.currentTarget.style.border = "1.5px solid rgba(249,115,22,0.5)"; }}
          onBlur={(e) => { e.currentTarget.style.border = "1.5px solid rgba(255,255,255,0.08)"; }}
        />
      </form>
    </header>
  );
}
