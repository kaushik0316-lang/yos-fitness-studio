"use client";

import { useState } from "react";
import { MessageSquare, Edit, CheckCircle2, XCircle, Clock, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { UserRole } from "@prisma/client";
import { toast } from "@/hooks/use-toast";

type Template = {
  id: string; name: string; trigger: string; body: string; isActive: boolean;
};

type MessageLog = {
  id: string; message: string; channel: string; status: string;
  sentAt: Date | null; createdAt: Date; trigger: string | null; isManual: boolean;
  member: { memberId: string; fullName: string };
  template: { name: string } | null;
};

const STATUS_COLORS: Record<string, string> = {
  SENT:        "bg-green-100 text-green-700",
  FAILED:      "bg-red-100 text-red-700",
  QUEUED:      "bg-yellow-100 text-yellow-700",
  MANUAL_SEND: "bg-blue-100 text-blue-700",
  CANCELLED:   "bg-gray-100 text-gray-600",
};

type Props = { templates: Template[]; recentLogs: MessageLog[]; userRole: UserRole };

export function MessagesClient({ templates, recentLogs, userRole }: Props) {
  const [activeTab, setActiveTab] = useState<"templates" | "logs">("logs");
  const [editingId, setEditingId] = useState<string | null>(null);

  function copyMessage(msg: string) {
    navigator.clipboard.writeText(msg);
    toast({ title: "Copied to clipboard!" });
  }

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveTab("logs")}
          className={cn("px-4 py-1.5 rounded-md text-sm font-medium transition-colors", activeTab === "logs" ? "bg-white shadow-sm text-gray-900" : "text-gray-500")}
        >
          Message Logs ({recentLogs.length})
        </button>
        <button
          onClick={() => setActiveTab("templates")}
          className={cn("px-4 py-1.5 rounded-md text-sm font-medium transition-colors", activeTab === "templates" ? "bg-white shadow-sm text-gray-900" : "text-gray-500")}
        >
          Templates ({templates.length})
        </button>
      </div>

      {/* Message logs */}
      {activeTab === "logs" && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="divide-y max-h-[70vh] overflow-y-auto">
            {recentLogs.length === 0 ? (
              <div className="text-center py-12 text-gray-400">No messages sent yet.</div>
            ) : (
              recentLogs.map((log) => (
                <div key={log.id} className="px-4 py-3 hover:bg-gray-50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm text-gray-900">{log.member.fullName}</span>
                        <span className="text-xs text-gray-400">{log.member.memberId}</span>
                        {log.trigger && (
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                            {log.trigger.replace(/_/g, " ")}
                          </span>
                        )}
                        <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", STATUS_COLORS[log.status] ?? "bg-gray-100 text-gray-600")}>
                          {log.status}
                        </span>
                        <span className="text-xs text-gray-400">{log.channel}</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{log.message}</p>
                      <p className="text-xs text-gray-400 mt-1">{formatDateTime(log.createdAt)}</p>
                    </div>
                    <button
                      onClick={() => copyMessage(log.message)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 flex-shrink-0"
                      title="Copy message"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Templates */}
      {activeTab === "templates" && (
        <div className="space-y-3">
          {templates.map((t) => (
            <div key={t.id} className="bg-white rounded-xl border p-5">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{t.name}</h3>
                    {!t.isActive && (
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Inactive</span>
                    )}
                  </div>
                  <span className="text-xs text-orange-600 font-medium">
                    Trigger: {t.trigger.replace(/_/g, " ")}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyMessage(t.body)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                    title="Copy template"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 font-mono whitespace-pre-wrap">
                {t.body}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Variables: {"{{name}}"}, {"{{days_absent}}"}, {"{{expiry_date}}"}, {"{{package_name}}"}, {"{{trainer_name}}"}, {"{{gym_name}}"}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
