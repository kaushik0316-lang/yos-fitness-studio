"use client";

import { useState } from "react";
import { Users, Loader2, Check, X, Shield, Eye, EyeOff, Wrench, Hash, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { UserRole } from "@prisma/client";

type User = { id: string; name: string; email: string; role: UserRole; isActive: boolean };

type Props = { users: User[] };

const ROLE_COLORS: Record<string, string> = {
  ADMIN:      "bg-orange-100 text-orange-700",
  FRONT_DESK: "bg-blue-100 text-blue-700",
  TRAINER:    "bg-green-100 text-green-700",
  ACCOUNTANT: "bg-purple-100 text-purple-700",
};

export function SettingsClient({ users }: Props) {
  const [activeTab, setActiveTab] = useState<"users" | "security" | "data">("users");
  const [backfilling, setBackfilling] = useState(false);
  const [backfillResult, setBackfillResult] = useState<{ fixed: number; results: string[] } | null>(null);
  const [purgingShifts, setPurgingShifts] = useState(false);
  const [purgeResult, setPurgeResult] = useState<{ deleted: number; daysReverted: number; message: string } | null>(null);

  async function purgeShortShifts() {
    if (!confirm("This will permanently delete all recorded shifts under 15 minutes and revert those days to Absent. Continue?")) return;
    setPurgingShifts(true);
    setPurgeResult(null);
    try {
      const res = await fetch("/api/admin/purge-short-shifts", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setPurgeResult(data);
      toast({ title: data.deleted > 0 ? `Done! ${data.deleted} short shifts deleted.` : "No short shifts found." });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setPurgingShifts(false);
    }
  }

  async function backfillReceiptNumbers() {
    setBackfilling(true);
    setBackfillResult(null);
    try {
      const res = await fetch("/api/admin/fix-receipt-numbers", { method: "PATCH" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setBackfillResult(data);
      toast({ title: data.fixed > 0 ? `Done! ${data.fixed} receipts numbered.` : "Nothing to fix — all payments already have receipt numbers." });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setBackfilling(false);
    }
  }
  // Password change state
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);

  async function changePassword() {
    setPwError("");
    setPwSuccess(false);
    if (!pwForm.current || !pwForm.next || !pwForm.confirm) {
      setPwError("All fields are required."); return;
    }
    if (pwForm.next.length < 8) {
      setPwError("New password must be at least 8 characters."); return;
    }
    if (pwForm.next !== pwForm.confirm) {
      setPwError("New passwords don't match."); return;
    }
    setPwSaving(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.next }),
      });
      const data = await res.json();
      if (!res.ok) { setPwError(data.error ?? "Something went wrong."); return; }
      setPwSuccess(true);
      setPwForm({ current: "", next: "", confirm: "" });
      toast({ title: "Password changed successfully!" });
    } catch {
      setPwError("Network error. Please try again.");
    } finally {
      setPwSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {[
          { key: "users",    label: `Users (${users.length})`, icon: Users  },
          { key: "security", label: "Security",                 icon: Shield },
          { key: "data",     label: "Data Tools",               icon: Wrench },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as any)}
            className={cn("flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
              activeTab === t.key ? "bg-white shadow-sm text-gray-900" : "text-gray-500"
            )}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Security tab */}
      {activeTab === "security" && (
        <div className="max-w-md space-y-4">
          <div className="rounded-xl border overflow-hidden" style={{ background: "#161616", borderColor: "rgba(255,255,255,0.08)" }}>
            <div className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="rounded-xl p-2" style={{ background: "rgba(249,115,22,0.12)" }}>
                <Shield className="h-4 w-4 text-orange-400" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Change Password</h3>
                <p className="text-xs text-gray-500">Use a strong, unique password</p>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {pwError && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm text-red-400"
                  style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
                  <X className="h-4 w-4 flex-shrink-0" />
                  {pwError}
                </div>
              )}
              {pwSuccess && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm text-green-400"
                  style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)" }}>
                  <Check className="h-4 w-4 flex-shrink-0" />
                  Password changed successfully!
                </div>
              )}

              {(["current", "next", "confirm"] as const).map((field) => {
                const labels = { current: "Current Password", next: "New Password", confirm: "Confirm New Password" };
                return (
                  <div key={field} className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                      {labels[field]}
                    </label>
                    <div className="relative">
                      <input
                        type={showPw[field] ? "text" : "password"}
                        value={pwForm[field]}
                        onChange={(e) => setPwForm(p => ({ ...p, [field]: e.target.value }))}
                        placeholder="••••••••"
                        className="w-full rounded-xl pr-10 pl-4 py-2.5 text-sm text-white placeholder:text-gray-700 focus:outline-none transition-all"
                        style={{ background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.08)" }}
                        onFocus={e => { e.currentTarget.style.border = "1.5px solid rgba(249,115,22,0.5)"; }}
                        onBlur={e => { e.currentTarget.style.border = "1.5px solid rgba(255,255,255,0.08)"; }}
                      />
                      <button type="button"
                        onClick={() => setShowPw(p => ({ ...p, [field]: !p[field] }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors">
                        {showPw[field] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                );
              })}

              <button
                onClick={changePassword}
                disabled={pwSaving}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white transition-all mt-2 disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #f97316, #ea580c)", boxShadow: "0 4px 16px rgba(249,115,22,0.3)" }}
              >
                {pwSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                {pwSaving ? "Updating..." : "Update Password"}
              </button>
            </div>
          </div>

          <p className="text-xs text-gray-600 px-1">
            Use at least 8 characters. Avoid using this password anywhere else.
          </p>
        </div>
      )}

      {/* Data Tools tab */}
      {activeTab === "data" && (
        <div className="max-w-lg space-y-4">
          {/* Backfill receipt numbers */}
          <div className="rounded-xl overflow-hidden" style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="rounded-xl p-2" style={{ background: "rgba(249,115,22,0.12)" }}>
                <Hash className="h-4 w-4 text-orange-400" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Backfill Receipt Numbers</h3>
                <p className="text-xs text-gray-500">Assign receipt numbers to imported payments that have none</p>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-gray-400 leading-relaxed">
                Imported payments from the old system don't have receipt numbers. This will assign new sequential numbers to all payments showing <span className="text-white font-mono">—</span> in the receipt column.
              </p>
              <button
                onClick={backfillReceiptNumbers}
                disabled={backfilling}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #f97316, #ea580c)", boxShadow: "0 4px 16px rgba(249,115,22,0.3)" }}
              >
                {backfilling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Hash className="h-4 w-4" />}
                {backfilling ? "Assigning numbers..." : "Assign Receipt Numbers"}
              </button>

              {backfillResult && (
                <div className="rounded-xl p-4 space-y-2" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
                  <p className="text-sm font-bold text-green-400">
                    {backfillResult.fixed > 0 ? `✓ ${backfillResult.fixed} payments updated` : "✓ All payments already have receipt numbers"}
                  </p>
                  {backfillResult.results.length > 0 && (
                    <div className="max-h-48 overflow-y-auto space-y-1 mt-2">
                      {backfillResult.results.map((r, i) => (
                        <p key={i} className="text-xs text-gray-400 font-mono">{r}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          {/* Purge short shifts */}
          <div className="rounded-xl overflow-hidden" style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="rounded-xl p-2" style={{ background: "rgba(239,68,68,0.12)" }}>
                <Trash2 className="h-4 w-4 text-red-400" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Delete Shifts Under 15 Minutes</h3>
                <p className="text-xs text-gray-500">Remove all historical shifts that lasted less than 15 minutes</p>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-gray-400 leading-relaxed">
                Permanently deletes all past shifts where check-in to check-out was under 15 minutes. Days with no remaining valid shifts will be marked <span className="text-white font-medium">Absent</span>.
              </p>
              <button
                onClick={purgeShortShifts}
                disabled={purgingShifts}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60"
                style={{ background: "rgba(239,68,68,0.7)", boxShadow: "0 4px 16px rgba(239,68,68,0.2)" }}
              >
                {purgingShifts ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {purgingShifts ? "Deleting..." : "Delete Short Shifts"}
              </button>

              {purgeResult && (
                <div className="rounded-xl p-4" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
                  <p className="text-sm font-bold text-green-400">✓ {purgeResult.message}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Users tab */}
      {activeTab === "users" && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Email</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Role</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id} className={cn("hover:bg-gray-50", !u.isActive && "opacity-50")}>
                  <td className="px-4 py-3 font-medium text-gray-900">{u.name}</td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", ROLE_COLORS[u.role] ?? "bg-gray-100 text-gray-600")}>
                      {u.role.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {u.isActive
                      ? <span className="text-xs text-green-600 font-medium">Active</span>
                      : <span className="text-xs text-gray-400">Inactive</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
