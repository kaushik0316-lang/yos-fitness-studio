"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { addTrainerCommission, deleteTrainerCommission } from "@/lib/actions/commissions";
import { toast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { toTitleCase } from "@/lib/utils/titleCase";

const PACKAGE_TYPES = [
  { value: "PERSONAL_TRAINING", label: "Personal Training" },
  { value: "SEMI_PRIVATE",      label: "Semi Private" },
  { value: "HIT",               label: "HIT" },
  { value: "OTHER",             label: "Other" },
];

const PACKAGE_COLORS: Record<string, { bg: string; color: string }> = {
  PERSONAL_TRAINING: { bg: "rgba(249,115,22,0.12)", color: "#fb923c" },
  SEMI_PRIVATE:      { bg: "rgba(96,165,250,0.12)",  color: "#60a5fa" },
  HIT:               { bg: "rgba(74,222,128,0.12)",  color: "#4ade80" },
  OTHER:             { bg: "rgba(156,163,175,0.10)", color: "#9ca3af" },
};

type Trainer = { id: string; employeeId: string; fullName: string; salesCommissionPct: number | null };

type Commission = {
  id: string; trainerId: string; clientName: string; packageType: string;
  totalAmount: any; commissionPct: any; commissionAmount: any;
  month: number; year: number; notes: string | null;
  startDate?: string | null; expiryDate?: string | null;
};

type SalesEntry = { trainerId: string; salesTotal: number };

const inputCls = "w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500 text-white";
const labelCls = "block text-xs font-medium text-gray-500 mb-1";

function isActive(expiryDate?: string | null) {
  if (!expiryDate) return null;
  return new Date(expiryDate) >= new Date();
}

function fmtDate(iso?: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" });
}

export function CommissionsTab({
  trainers, commissions, salesEntries, month, year,
}: {
  trainers: Trainer[];
  commissions: Commission[];
  salesEntries: SalesEntry[];
  month: number;
  year: number;
}) {
  const [isPending, startTransition] = useTransition();
  const [showAdd, setShowAdd] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [form, setForm] = useState({
    trainerId: trainers[0]?.id ?? "",
    clientName: "",
    packageType: "PERSONAL_TRAINING",
    totalAmount: "",
    commissionPct: "",
    notes: "",
  });

  const pct = parseFloat(form.commissionPct) || 0;
  const total = parseFloat(form.totalAmount) || 0;
  const previewAmount = Math.round(total * pct) / 100;

  function toggleExpanded(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleAdd() {
    if (!form.trainerId || !form.clientName || !total || !pct) {
      toast({ title: "Fill all required fields", variant: "destructive" });
      return;
    }
    startTransition(async () => {
      try {
        await addTrainerCommission({
          trainerId: form.trainerId,
          clientName: form.clientName,
          packageType: form.packageType,
          totalAmount: total,
          commissionPct: pct,
          month, year,
          notes: form.notes || undefined,
        });
        toast({ title: "Commission added" });
        setForm(f => ({ ...f, clientName: "", totalAmount: "", commissionPct: "", notes: "" }));
        setShowAdd(false);
      } catch (e: any) {
        toast({ title: "Error", description: e.message, variant: "destructive" });
      }
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this commission entry?")) return;
    startTransition(async () => {
      try {
        await deleteTrainerCommission(id);
        toast({ title: "Deleted" });
      } catch (e: any) {
        toast({ title: "Error", description: e.message, variant: "destructive" });
      }
    });
  }

  // Group commissions by trainer
  const byTrainer: Record<string, Commission[]> = {};
  for (const c of commissions) {
    if (!byTrainer[c.trainerId]) byTrainer[c.trainerId] = [];
    byTrainer[c.trainerId].push(c);
  }

  const salesMap = Object.fromEntries(salesEntries.map(e => [e.trainerId, e.salesTotal]));

  const activeTrainers = trainers.filter(t => byTrainer[t.id]?.length > 0 || (t.salesCommissionPct && salesMap[t.id] > 0));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          PT, Semi-Private & HIT commissions for this month · auto-added to Sales & PT on regenerate
        </p>
        <button
          onClick={() => setShowAdd(v => !v)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all"
          style={{ background: "linear-gradient(135deg, #f97316, #ea580c)" }}
        >
          <Plus className="h-4 w-4" /> Add Entry
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="rounded-2xl p-5 space-y-4" style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.08)" }}>
          <p className="text-sm font-bold text-white">New Commission Entry</p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Trainer *</label>
              <select value={form.trainerId} onChange={e => setForm(f => ({ ...f, trainerId: e.target.value }))} className={inputCls}
                style={{ background: "#0f0f0f", border: "1px solid rgba(255,255,255,0.08)" }}>
                {trainers.map(t => (
                  <option key={t.id} value={t.id}>{toTitleCase(t.fullName)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Package Type *</label>
              <select value={form.packageType} onChange={e => setForm(f => ({ ...f, packageType: e.target.value }))} className={inputCls}
                style={{ background: "#0f0f0f", border: "1px solid rgba(255,255,255,0.08)" }}>
                {PACKAGE_TYPES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>Client Name *</label>
            <input value={form.clientName} onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))}
              placeholder="e.g. Rahul Kumar" className={inputCls}
              style={{ background: "#0f0f0f", border: "1px solid rgba(255,255,255,0.08)" }} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Package Amount (₹) *</label>
              <input type="number" value={form.totalAmount} onChange={e => setForm(f => ({ ...f, totalAmount: e.target.value }))}
                placeholder="10000" className={inputCls}
                style={{ background: "#0f0f0f", border: "1px solid rgba(255,255,255,0.08)" }} />
            </div>
            <div>
              <label className={labelCls}>Commission % *</label>
              <input type="number" value={form.commissionPct} onChange={e => setForm(f => ({ ...f, commissionPct: e.target.value }))}
                placeholder="20" min="0" max="100" className={inputCls}
                style={{ background: "#0f0f0f", border: "1px solid rgba(255,255,255,0.08)" }} />
            </div>
            <div>
              <label className={labelCls}>Trainer Gets</label>
              <div className="rounded-lg px-3 py-2 text-sm font-bold"
                style={{ background: "rgba(249,115,22,0.1)", color: "#fb923c", border: "1px solid rgba(249,115,22,0.2)" }}>
                {previewAmount > 0 ? formatCurrency(previewAmount) : "—"}
              </div>
            </div>
          </div>

          <div>
            <label className={labelCls}>Notes</label>
            <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Optional notes" className={inputCls}
              style={{ background: "#0f0f0f", border: "1px solid rgba(255,255,255,0.08)" }} />
          </div>

          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-400"
              style={{ background: "rgba(255,255,255,0.06)" }}>
              Cancel
            </button>
            <button onClick={handleAdd} disabled={isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-60"
              style={{ background: "linear-gradient(135deg,#f97316,#ea580c)" }}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add Commission
            </button>
          </div>
        </div>
      )}

      {/* Per-trainer breakdown */}
      {trainers.length === 0 ? (
        <div className="rounded-2xl p-8 text-center text-gray-600 text-sm" style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)" }}>
          No trainers found.
        </div>
      ) : (
        <div className="space-y-3">
          {trainers.map(trainer => {
            const entries = byTrainer[trainer.id] ?? [];
            const salesTotal = salesMap[trainer.id] ?? 0;
            const salesCommission = trainer.salesCommissionPct && salesTotal > 0
              ? Math.round(salesTotal * Number(trainer.salesCommissionPct)) / 100
              : 0;
            const ptTotal = entries.reduce((s, e) => s + Number(e.commissionAmount), 0);
            const grandTotal = ptTotal + salesCommission;
            const isExpanded = expanded.has(trainer.id);

            return (
              <div key={trainer.id} className="rounded-2xl overflow-hidden"
                style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)" }}>
                {/* Trainer header */}
                <button
                  className="w-full flex items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-white/[0.02]"
                  onClick={() => toggleExpanded(trainer.id)}
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: "rgba(249,115,22,0.15)", color: "#fb923c" }}>
                    {trainer.fullName.split(" ").map(n => n[0]).join("").slice(0,2).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-white">{toTitleCase(trainer.fullName)}</p>
                    <p className="text-[10px] text-gray-600">{trainer.employeeId}</p>
                  </div>
                  {/* Summary chips */}
                  <div className="flex items-center gap-2">
                    {entries.length > 0 && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(249,115,22,0.12)", color: "#fb923c" }}>
                        {entries.length} PT/pkg
                      </span>
                    )}
                    {salesCommission > 0 && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(96,165,250,0.12)", color: "#60a5fa" }}>
                        {trainer.salesCommissionPct}% sales
                      </span>
                    )}
                    {grandTotal > 0 ? (
                      <span className="text-sm font-bold" style={{ color: "#4ade80" }}>{formatCurrency(grandTotal)}</span>
                    ) : (
                      <span className="text-xs text-gray-700">—</span>
                    )}
                  </div>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-600 flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-gray-600 flex-shrink-0" />}
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                    {/* Sales commission row */}
                    {trainer.salesCommissionPct != null && (
                      <div className="px-5 py-3 flex items-center gap-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-white">Sales Commission</p>
                          <p className="text-[10px] text-gray-600">
                            {formatCurrency(salesTotal)} total sales × {Number(trainer.salesCommissionPct)}%
                          </p>
                        </div>
                        <span className="text-sm font-bold" style={{ color: "#60a5fa" }}>
                          {salesCommission > 0 ? `+${formatCurrency(salesCommission)}` : "—"}
                        </span>
                      </div>
                    )}

                    {/* PT/package entries */}
                    {entries.length === 0 && !trainer.salesCommissionPct ? (
                      <div className="px-5 py-4 text-xs text-gray-700">No commission entries this month.</div>
                    ) : entries.length === 0 ? null : (
                      entries.map(entry => {
                        const pkgColor = PACKAGE_COLORS[entry.packageType] ?? PACKAGE_COLORS.OTHER;
                        return (
                          <div key={entry.id} className="px-5 py-3 flex items-center gap-3"
                            style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md flex-shrink-0"
                              style={{ background: pkgColor.bg, color: pkgColor.color }}>
                              {PACKAGE_TYPES.find(p => p.value === entry.packageType)?.label ?? entry.packageType}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-xs font-semibold text-white truncate">{entry.clientName}</p>
                                {(() => {
                                  const active = isActive(entry.expiryDate);
                                  if (active === null) return null;
                                  return (
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                                      active ? "bg-emerald-500/15 text-emerald-400" : "bg-gray-500/15 text-gray-500"
                                    }`}>{active ? "Active" : "Expired"}</span>
                                  );
                                })()}
                              </div>
                              <p className="text-[10px] text-gray-600">
                                {formatCurrency(Number(entry.totalAmount))} × {Number(entry.commissionPct)}%
                                {entry.startDate && <> · {fmtDate(entry.startDate)} → {fmtDate(entry.expiryDate)}</>}
                                {entry.notes && <> · {entry.notes}</>}
                              </p>
                            </div>
                            <span className="text-sm font-bold flex-shrink-0" style={{ color: "#fb923c" }}>
                              +{formatCurrency(Number(entry.commissionAmount))}
                            </span>
                            <button onClick={() => handleDelete(entry.id)} disabled={isPending}
                              className="p-1.5 rounded-lg text-gray-700 hover:text-red-400 transition-colors flex-shrink-0"
                              style={{ background: "rgba(255,255,255,0.04)" }}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        );
                      })
                    )}

                    {/* Grand total */}
                    {grandTotal > 0 && (
                      <div className="px-5 py-3 flex items-center justify-between"
                        style={{ background: "rgba(255,255,255,0.02)" }}>
                        <span className="text-xs font-bold text-gray-400">Total Sales & PT</span>
                        <span className="text-base font-extrabold" style={{ color: "#4ade80" }}>
                          {formatCurrency(grandTotal)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
