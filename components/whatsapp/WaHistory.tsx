"use client";

import { MessageCircle } from "lucide-react";
import { WA_TYPE_LABELS, WaType } from "@/lib/utils/waTypes";

type Log = {
  id: string;
  waType: string | null;
  sentByName: string | null;
  sentAt: Date | null;
  createdAt: Date;
};

const TYPE_COLORS: Record<string, string> = {
  BIRTHDAY: "#ec4899",
  RENEWAL:  "#f97316",
  WELCOME:  "#22c55e",
  PAYMENT:  "#818cf8",
  ENQUIRY:  "#38bdf8",
  TERMS:    "#a3e635",
  GENERAL:  "#9ca3af",
};

function fmt(d: Date | null) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export function WaHistory({ logs }: { logs: Log[] }) {
  if (logs.length === 0) {
    return (
      <div className="py-6 text-center text-gray-500 text-sm">
        No WhatsApp messages logged yet. Click a WA button and confirm "Yes, sent" to start tracking.
      </div>
    );
  }

  return (
    <div className="divide-y" style={{ borderColor: "#f3f4f6" }}>
      {logs.map((log) => {
        const type = log.waType ?? "GENERAL";
        const color = TYPE_COLORS[type] ?? "#9ca3af";
        const label = WA_TYPE_LABELS[type as WaType] ?? type;
        return (
          <div key={log.id} className="flex items-center gap-3 py-3 px-1">
            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: `${color}18` }}>
              <MessageCircle className="h-3.5 w-3.5" style={{ color }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800">{label}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {fmt(log.sentAt ?? log.createdAt)}
                {log.sentByName ? ` · ${log.sentByName}` : ""}
              </p>
            </div>
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0"
              style={{ background: `${color}15`, color }}
            >
              Sent
            </span>
          </div>
        );
      })}
    </div>
  );
}
