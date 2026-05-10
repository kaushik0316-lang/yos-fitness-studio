"use client";

import { useState } from "react";
import { Zap, AlertTriangle, RotateCcw, MessageSquare, CheckCircle2, XCircle, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

type AutomationLog = {
  id: string; type: string; status: string;
  membersProcessed: number; messagesSent: number;
  errorMessage: string | null; createdAt: Date;
};

type MessageStat = { status: string; _count: number };

type Props = {
  logs: AutomationLog[];
  inactiveCount: number;
  expiringCount: number;
  messageStats: MessageStat[];
};

const STATUS_COLORS: Record<string, string> = {
  SUCCESS: "bg-green-100 text-green-700",
  FAILED:  "bg-red-100 text-red-700",
  PARTIAL: "bg-yellow-100 text-yellow-700",
};

export function AutomationClient({ logs, inactiveCount, expiringCount, messageStats }: Props) {
  const [running, setRunning] = useState(false);

  async function triggerCron() {
    setRunning(true);
    try {
      const res = await fetch("/api/cron", {
        method: "POST",
        headers: { "x-cron-secret": "" }, // No secret in manual trigger from UI — admin already authenticated
      });
      // If secret is empty, server returns 401 — that's expected for UI trigger
      // In production, schedule via external cron with the secret
      if (res.status === 401) {
        toast({
          title: "Configure CRON_SECRET",
          description: "Add CRON_SECRET to .env and use it in the header to trigger automation.",
          variant: "destructive",
        });
      } else {
        const data = await res.json();
        toast({ title: "Automation triggered!", description: `Processed ${data.results?.inactiveCheck?.processed ?? 0} inactive checks` });
      }
    } catch {
      toast({ title: "Error triggering automation", variant: "destructive" });
    } finally {
      setRunning(false);
    }
  }

  const sentCount   = messageStats.find((s) => s.status === "SENT")?._count ?? 0;
  const failedCount = messageStats.find((s) => s.status === "FAILED")?._count ?? 0;

  return (
    <div className="space-y-6">
      {/* Status cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <p className="text-xs font-medium text-orange-700">Members Inactive 4+ Days</p>
          </div>
          <p className="text-3xl font-bold text-orange-700">{inactiveCount}</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <RotateCcw className="h-4 w-4 text-yellow-600" />
            <p className="text-xs font-medium text-yellow-700">Expiring in 7 Days</p>
          </div>
          <p className="text-3xl font-bold text-yellow-700">{expiringCount}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <p className="text-xs font-medium text-green-700">Messages Sent (30d)</p>
          </div>
          <p className="text-3xl font-bold text-green-700">{sentCount}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="h-4 w-4 text-red-600" />
            <p className="text-xs font-medium text-red-700">Failed (30d)</p>
          </div>
          <p className="text-3xl font-bold text-red-700">{failedCount}</p>
        </div>
      </div>

      {/* Cron setup info */}
      <div className="bg-white rounded-xl border p-5">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
          <Zap className="h-4 w-4 text-yellow-500" />
          Automation Setup
        </h3>
        <div className="bg-gray-50 rounded-lg p-4 space-y-3 text-sm text-gray-600">
          <p className="font-medium text-gray-800">To run automation daily, choose one of these methods:</p>
          <div className="space-y-2">
            <p><span className="font-semibold">Option A — Vercel Cron:</span> Add to <code className="bg-gray-200 px-1 rounded">vercel.json</code>:</p>
            <pre className="bg-gray-200 rounded p-3 text-xs overflow-x-auto">{`{
  "crons": [{ "path": "/api/cron", "schedule": "0 8 * * *" }]
}`}</pre>
            <p className="text-xs text-gray-400">Vercel automatically adds the CRON_SECRET header for you.</p>
          </div>
          <div className="space-y-2">
            <p><span className="font-semibold">Option B — GitHub Actions / crontab:</span></p>
            <pre className="bg-gray-200 rounded p-3 text-xs overflow-x-auto">{`curl -X POST https://your-domain.com/api/cron \\
  -H "x-cron-secret: YOUR_CRON_SECRET"`}</pre>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={triggerCron} disabled={running}>
            {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Manual Trigger (needs CRON_SECRET)
          </Button>
        </div>
      </div>

      {/* Automation logs */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 text-sm">Automation Run Logs</h3>
        </div>
        <div className="divide-y max-h-[50vh] overflow-y-auto">
          {logs.length === 0 ? (
            <div className="text-center py-12 text-gray-400">No automation runs yet. Set up a cron job to get started.</div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", STATUS_COLORS[log.status] ?? "bg-gray-100 text-gray-600")}>
                      {log.status}
                    </span>
                    <span className="text-sm font-medium text-gray-700">{log.type.replace(/_/g, " ")}</span>
                  </div>
                  {log.errorMessage && (
                    <p className="text-xs text-red-500 mt-0.5">{log.errorMessage}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-600">{log.membersProcessed} processed · {log.messagesSent} sent</p>
                  <p className="text-xs text-gray-400">{formatDateTime(log.createdAt)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
