"use client";

import { useState } from "react";
import { MessageCircle, ChevronDown, ChevronUp } from "lucide-react";
import { WA_TYPE_LABELS, WaType } from "@/lib/utils/waTypes";

type Log = {
  id: string;
  memberName: string;
  sentByName: string | null;
  sentAt: Date | string | null;
  createdAt: Date | string;
};

type Props = {
  logs: Log[];
  waType: WaType;
  accentColor?: string;
};

const TYPE_COLORS: Record<WaType, string> = {
  BIRTHDAY: "#ec4899",
  RENEWAL:  "#f97316",
  WELCOME:  "#22c55e",
  PAYMENT:  "#818cf8",
  ENQUIRY:  "#38bdf8",
  TERMS:    "#a3e635",
  GENERAL:  "#9ca3af",
};

function fmt(d: Date | string | null) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export function WaSentSummary({ logs, waType, accentColor }: Props) {
  const [open, setOpen] = useState(false);
  const color = accentColor ?? TYPE_COLORS[waType] ?? "#9ca3af";
  const label = WA_TYPE_LABELS[waType];

  if (logs.length === 0) return null;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}>
      {/* Header — always visible, click to toggle */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors"
      >
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}18` }}>
          <MessageCircle className="h-3.5 w-3.5" style={{ color }} />
        </div>
        <div className="flex-1 text-left">
          <span className="text-sm font-bold text-white">{label}s Sent</span>
          <span className="ml-2 text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ background: `${color}20`, color }}>
            {logs.length}
          </span>
        </div>
        {open
          ? <ChevronUp className="h-4 w-4 text-gray-500" />
          : <ChevronDown className="h-4 w-4 text-gray-500" />}
      </button>

      {/* Expanded log list */}
      {open && (
        <div className="border-t" style={{ borderColor: "#2a2a2a" }}>
          {logs.map((log, i) => (
            <div key={log.id}
              className="flex items-center gap-3 px-4 py-2.5"
              style={{ background: i % 2 === 0 ? "#111" : "#131313", borderBottom: "1px solid #1e1e1e" }}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{log.memberName}</p>
                {log.sentByName && (
                  <p className="text-[11px] text-gray-500 mt-0.5">sent by {log.sentByName}</p>
                )}
              </div>
              <p className="text-[11px] text-gray-500 flex-shrink-0">{fmt(log.sentAt ?? log.createdAt)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
