"use client";

import { useState } from "react";
import { Loader2, Save, Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { manualMarkAttendanceWithTime, deleteAttendanceShift } from "@/lib/actions/attendance";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type AttendanceStatus = "PRESENT" | "ABSENT" | "HALF_DAY" | "WEEKLY_OFF" | "LEAVE" | "PAID_LEAVE";
type Shift = { id: string; shiftIndex: number; checkInTime: string; checkOutTime: string | null; deviceId?: string | null };

type Props = {
  employeeId: string;
  employeeName: string;
  date: string;
  displayDate: string;
  currentStatus: AttendanceStatus | null;
  existingShifts: Shift[];
  isAdmin?: boolean;
  onClose: () => void;
};

type ShiftRow = {
  existingId?: string;  // set if this came from the database
  shiftIndex: number;
  checkIn: string;
  checkOut: string;
};

const STATUS_OPTIONS: { value: AttendanceStatus; label: string; color: string }[] = [
  { value: "PRESENT",    label: "Present",    color: "bg-green-500 text-white" },
  { value: "ABSENT",     label: "Absent",     color: "bg-red-500 text-white" },
  { value: "HALF_DAY",   label: "Half Day",   color: "bg-yellow-400 text-white" },
  { value: "WEEKLY_OFF", label: "Weekly Off", color: "bg-gray-200 text-gray-700" },
  { value: "LEAVE",      label: "Leave",      color: "bg-blue-400 text-white" },
  { value: "PAID_LEAVE", label: "Paid Leave", color: "bg-indigo-400 text-white" },
];

function isoToISTInput(iso: string | null): string {
  if (!iso) return "";
  const ist = new Date(new Date(iso).getTime() + 5.5 * 60 * 60 * 1000);
  return `${String(ist.getUTCHours()).padStart(2, "0")}:${String(ist.getUTCMinutes()).padStart(2, "0")}`;
}

function buildInitialShifts(existing: Shift[]): ShiftRow[] {
  if (existing.length === 0) {
    return [{ shiftIndex: 1, checkIn: "", checkOut: "" }];
  }
  return existing.map((s) => ({
    existingId: s.id,
    shiftIndex: s.shiftIndex,
    checkIn: isoToISTInput(s.checkInTime),
    checkOut: isoToISTInput(s.checkOutTime),
  }));
}

export function ManualAttendanceDialog({
  employeeId, employeeName, date, displayDate,
  currentStatus, existingShifts, isAdmin, onClose,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<AttendanceStatus>(currentStatus ?? "PRESENT");
  const [shifts, setShifts] = useState<ShiftRow[]>(() => buildInitialShifts(existingShifts));
  const [notes, setNotes] = useState("");

  function updateShift(idx: number, field: "checkIn" | "checkOut", value: string) {
    setShifts((prev) => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  }

  function addShift() {
    const maxIndex = Math.max(...shifts.map((s) => s.shiftIndex), 0);
    setShifts((prev) => [...prev, { shiftIndex: maxIndex + 1, checkIn: "", checkOut: "" }]);
  }

  async function removeShift(idx: number) {
    const row = shifts[idx];
    if (row.existingId) {
      if (!confirm(`Delete Shift ${row.shiftIndex}? This cannot be undone.`)) return;
      try {
        await deleteAttendanceShift(row.existingId);
        toast({ title: "Shift deleted" });
        setShifts((prev) => {
          const next = prev.filter((_, i) => i !== idx);
          // If nothing left, keep one empty row
          return next.length === 0 ? [{ shiftIndex: 1, checkIn: "", checkOut: "" }] : next;
        });
      } catch (e: any) {
        toast({ title: "Error", description: e.message, variant: "destructive" });
      }
    } else {
      setShifts((prev) => {
        const next = prev.filter((_, i) => i !== idx);
        return next.length === 0 ? [{ shiftIndex: 1, checkIn: "", checkOut: "" }] : next;
      });
    }
  }

  async function handleSave() {
    setLoading(true);
    try {
      // Save each shift that has at least a check-in time
      const toSave = shifts.filter((s) => s.checkIn);
      if (toSave.length === 0) {
        // Just save the status + notes with no times
        await manualMarkAttendanceWithTime({ employeeId, date, status, notes: notes || undefined });
      } else {
        for (const s of toSave) {
          await manualMarkAttendanceWithTime({
            employeeId, date, status,
            checkInTime: s.checkIn || undefined,
            checkOutTime: s.checkOut || undefined,
            notes: notes || undefined,
            shiftIndex: s.shiftIndex,
          });
        }
      }
      toast({ title: "Saved!", description: `Attendance updated for ${displayDate}.` });
      onClose();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">
            {employeeName}
            <span className="text-gray-400 font-normal ml-2 text-sm">· {displayDate}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Status */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Status</label>
            <div className="grid grid-cols-3 gap-1.5">
              {STATUS_OPTIONS.map((opt) => (
                <button key={opt.value} type="button" onClick={() => setStatus(opt.value)}
                  className={cn("py-1.5 rounded-lg text-xs font-semibold transition-all border-2",
                    status === opt.value
                      ? `${opt.color} border-transparent`
                      : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
                  )}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Shifts */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-gray-600">
                {shifts.length > 1 ? "Shifts" : "Shift times"}
              </label>
              <button type="button" onClick={addShift}
                className="flex items-center gap-1 text-xs font-semibold text-orange-500 hover:text-orange-600 transition-colors">
                <Plus className="h-3.5 w-3.5" /> Add shift
              </button>
            </div>

            {shifts.map((s, idx) => (
              <div key={idx} className="flex items-center gap-2">
                {shifts.length > 1 && (
                  <span className="text-[10px] font-bold text-gray-400 w-10 flex-shrink-0">S{s.shiftIndex}</span>
                )}
                <input type="time" value={s.checkIn} onChange={(e) => updateShift(idx, "checkIn", e.target.value)}
                  className="flex-1 border rounded-lg px-2 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none" />
                <span className="text-gray-400 text-xs">→</span>
                <input type="time" value={s.checkOut} onChange={(e) => updateShift(idx, "checkOut", e.target.value)}
                  className="flex-1 border rounded-lg px-2 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none" />
                {(shifts.length > 1 || s.existingId) && (
                  <button type="button" onClick={() => removeShift(idx)}
                    className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors flex-shrink-0">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Notes <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Manual entry — forgot to check in"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none" />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
