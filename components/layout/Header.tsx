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
    <header className="h-16 border-b bg-white flex items-center px-6 gap-4 sticky top-0 z-30">
      {/* Title */}
      <div className="flex-1 min-w-0">
        <h1 className="text-xl font-bold text-gray-900 leading-tight truncate">{title}</h1>
        {subtitle && (
          <p className="text-xs text-gray-400 leading-tight">{subtitle}</p>
        )}
      </div>

      {/* Date chip */}
      <div className="hidden md:flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-500 font-medium flex-shrink-0">
        <Calendar className="h-3.5 w-3.5 text-orange-400" />
        {today}
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="relative hidden md:block flex-shrink-0">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search member..."
          className="pl-9 pr-4 py-2 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-orange-400 transition-colors w-56 bg-white"
        />
      </form>
    </header>
  );
}
