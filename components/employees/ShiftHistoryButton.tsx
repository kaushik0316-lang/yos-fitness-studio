"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, Loader2, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { addShiftHistory, getShiftHistory } from "@/lib/actions/employees";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

type Shift = { start: string; end: string };
type HistoryRecord = {
  id: string;
  shifts: unknown;
  shiftDays: unknown;
  monthlySalary: unknown;
  effectiveFrom: Date;
  notes: string | null;
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function fmtShifts(shifts: unknown): string {
  if (!Array.isArray(shifts)) return "—";
  return (shifts as Shift[]).map(s => `${s.start}–${s.end}`).join(", ");
}

function fmtDays(days: unknown): string {
  if (!Array.isArray(days)) return "Mon–Sat";
  return (days as number[]).map(d => DAY_LABELS[d]).join(", ");
}

type Props = {
  employeeId: string;
  employeeName: string;
  currentShifts: Shift[] | null;
  currentShiftDays: number[] | null;
  currentSalary: number | null;
};

export function ShiftHistoryButton({ employeeId, employeeName, currentShifts, currentShiftDays, currentSalary }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<HistoryRecord[] | null>(null);
  const [loading, setLoading] = useState(false);

  // Form state
  const [shiftStart, setShiftStart] = useState("");
  const [shiftEnd, setShiftEnd] = useState("");
  const [salary, setSalary] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedDays, setSelectedDays] = useState<number[]>(currentShiftDays ?? [1,2,3,4,5,6]);
  const [notes, setNotes] = useState("");

  function toggleDay(d: number) {
    setSelectedDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort());
  }

  async function loadHistory() {
    const records = await getShiftHistory(employeeId);
    setHistory(records as any);
  }

  async function handleSave() {
    if (!shiftStart || !shiftEnd || !salary || !effectiveFrom) {
      toast({ title: "Fill all required fields", variant: "destructive" });
      return;
    }
    if (selectedDays.length === 0) {
      toast({ title: "Select at least one shift day", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await addShiftHistory({
        employeeId,
        shifts: [{ start: shiftStart, end: shiftEnd }],
        shiftDays: selectedDays,
        monthlySalary: Number(salary),
        effectiveFrom,
        notes: notes || undefined,
      });
      toast({ title: "Shift history recorded" });
      setShowAdd(false);
      setShiftStart(""); setShiftEnd(""); setSalary(""); setNotes("");
      await loadHistory();
      router.refresh();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handleOpen() {
    setOpen(true);
    await loadHistory();
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="p-1.5 rounded-lg text-gray-600 hover:text-orange-400 transition-colors"
        style={{ background: "rgba(255,255,255,0.04)" }}
        title="Shift & Salary History"
      >
        <Clock className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl w-[420px] max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/08">
              <div>
                <p className="font-bold text-white text-sm">Shift & Salary History</p>
                <p className="text-xs text-gray-500 mt-0.5">{employeeName}</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-600 hover:text-white text-lg leading-none">×</button>
            </div>

            <div className="p-5 space-y-4">
              {/* Current values */}
              <div className="rounded-xl p-3 space-y-1" style={{ background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.15)" }}>
                <p className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">Current (Live)</p>
                <p className="text-sm text-white font-semibold">{fmtShifts(currentShifts)}</p>
                <p className="text-xs text-gray-400">{fmtDays(currentShiftDays)} · ₹{(currentSalary ?? 0).toLocaleString("en-IN")}/mo</p>
              </div>

              {/* History list */}
              {history && history.length > 0 && (
                <div>
                  <button
                    className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-white transition-colors w-full text-left mb-2"
                    onClick={() => setShowHistory(h => !h)}
                  >
                    {showHistory ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    History ({history.length} record{history.length !== 1 ? "s" : ""})
                  </button>
                  {showHistory && (
                    <div className="space-y-2">
                      {history.map((rec, i) => (
                        <div key={rec.id} className="rounded-lg px-3 py-2.5 space-y-0.5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-bold text-white">{fmtShifts(rec.shifts)}</p>
                            <span className="text-[10px] text-orange-400 font-semibold">
                              from {format(new Date(rec.effectiveFrom), "d MMM yyyy")}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-400">{fmtDays(rec.shiftDays)} · ₹{Number(rec.monthlySalary).toLocaleString("en-IN")}/mo</p>
                          {rec.notes && <p className="text-[10px] text-gray-600 italic">{rec.notes}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {history && history.length === 0 && (
                <p className="text-xs text-gray-600 text-center py-2">No history records yet</p>
              )}

              {/* Add new period */}
              {!showAdd ? (
                <button
                  onClick={() => setShowAdd(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white transition-colors"
                  style={{ background: "rgba(249,115,22,0.15)", border: "1px solid rgba(249,115,22,0.3)" }}
                >
                  <Plus className="h-4 w-4" /> Record New Shift Period
                </button>
              ) : (
                <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <p className="text-xs font-bold text-white">New Shift Period</p>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-medium text-gray-500 mb-1">Start Time *</label>
                      <input type="time" value={shiftStart} onChange={e => setShiftStart(e.target.value)}
                        className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:ring-1 focus:ring-orange-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-gray-500 mb-1">End Time *</label>
                      <input type="time" value={shiftEnd} onChange={e => setShiftEnd(e.target.value)}
                        className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:ring-1 focus:ring-orange-500 outline-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-medium text-gray-500 mb-1.5">Shift Days *</label>
                    <div className="flex gap-1">
                      {[1,2,3,4,5,6,0].map(d => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => toggleDay(d)}
                          className="flex-1 py-1 rounded text-[10px] font-bold transition-colors"
                          style={selectedDays.includes(d)
                            ? { background: "rgba(249,115,22,0.3)", color: "#fb923c", border: "1px solid rgba(249,115,22,0.5)" }
                            : { background: "rgba(255,255,255,0.05)", color: "#6b7280", border: "1px solid transparent" }
                          }
                        >
                          {DAY_LABELS[d].slice(0,2)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-medium text-gray-500 mb-1">Monthly Salary (₹) *</label>
                      <input type="number" value={salary} onChange={e => setSalary(e.target.value)}
                        placeholder="e.g. 12000"
                        className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:ring-1 focus:ring-orange-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-gray-500 mb-1">Effective From *</label>
                      <input type="date" value={effectiveFrom} onChange={e => setEffectiveFrom(e.target.value)}
                        className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:ring-1 focus:ring-orange-500 outline-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-medium text-gray-500 mb-1">Notes (optional)</label>
                    <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
                      placeholder="e.g. Shift change approved by management"
                      className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:ring-1 focus:ring-orange-500 outline-none" />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button onClick={() => setShowAdd(false)} disabled={loading}
                      className="flex-1 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white transition-colors border border-white/10">
                      Cancel
                    </button>
                    <button onClick={handleSave} disabled={loading}
                      className="flex-1 py-2 rounded-xl text-xs font-bold text-white transition-colors"
                      style={{ background: "#f97316" }}>
                      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mx-auto" /> : "Save Period"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
