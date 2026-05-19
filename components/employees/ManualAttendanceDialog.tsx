"use client";

import { useState } from "react";
import { Loader2, Save, Clock, Trash2 } from "lucide-react";
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
  date: string;        // "YYYY-MM-DD"
  displayDate: string; // e.g. "Mon, 18 May"
  currentStatus: AttendanceStatus | null;
  existingShifts: Shift[];
  isAdmin?: boolean;
  onClose: () => void;
};

const STATUS_OPTIONS: { value: AttendanceStatus; label: string; color: string }[] = [
  { value: "PRESENT",    label: "Present",    color: "bg-green-500 text-white" },
  { value: "ABSENT",     label: "Absent",     color: "bg-red-500 text-white" },
  { value: "HALF_DAY",   label: "Half Day",   color: "bg-yellow-400 text-white" },
  { value: "WEEKLY_OFF", label: "Weekly Off", color: "bg-gray-200 text-gray-700" },
  { value: "LEAVE",      label: "Leave",      color: "bg-blue-400 text-white" },
  { value: "PAID_LEAVE", label: "Paid Leave", color: "bg-indigo-400 text-white" },
];

function fmtTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

// Convert ISO string → "HH:MM" in IST for a time input default value
function isoToISTInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
  const h = String(ist.getUTCHours()).padStart(2, "0");
  const m = String(ist.getUTCMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

export function ManualAttendanceDialog({
  employeeId, employeeName, date, displayDate,
  currentStatus, existingShifts, isAdmin, onClose,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [deletingShiftId, setDeletingShiftId] = useState<string | null>(null);
  const [status, setStatus] = useState<AttendanceStatus>(currentStatus ?? "PRESENT");

  // Which shift the admin is editing; null = "new shift"
  const [editingShiftIndex, setEditingShiftIndex] = useState<number>(
    existingShifts[0]?.shiftIndex ?? 1
  );
  const [checkIn, setCheckIn]   = useState(isoToISTInput(existingShifts[0]?.checkInTime ?? null));
  const [checkOut, setCheckOut] = useState(isoToISTInput(existingShifts[0]?.checkOutTime ?? null));
  const [notes, setNotes]       = useState("");

  const hasKioskShifts = existingShifts.length > 0;
  const nextShiftIndex = existingShifts.length > 0
    ? Math.max(...existingShifts.map((s) => s.shiftIndex)) + 1
    : 1;

  function selectShift(shiftIndex: number | "new") {
    if (shiftIndex === "new") {
      const newIdx = nextShiftIndex;
      setEditingShiftIndex(newIdx);
      setCheckIn("");
      setCheckOut("");
    } else {
      setEditingShiftIndex(shiftIndex);
      const s = existingShifts.find((s) => s.shiftIndex === shiftIndex);
      setCheckIn(isoToISTInput(s?.checkInTime ?? null));
      setCheckOut(isoToISTInput(s?.checkOutTime ?? null));
    }
  }

  async function handleSave() {
    setLoading(true);
    try {
      await manualMarkAttendanceWithTime({
        employeeId,
        date,
        status,
        checkInTime:  checkIn  || undefined,
        checkOutTime: checkOut || undefined,
        notes: notes || undefined,
        shiftIndex: editingShiftIndex,
      });
      toast({ title: "Saved!", description: `Attendance updated for ${displayDate}.` });
      onClose();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteShift(shiftId: string, shiftIndex: number) {
    if (!confirm(`Delete Shift ${shiftIndex}? This cannot be undone.`)) return;
    setDeletingShiftId(shiftId);
    try {
      await deleteAttendanceShift(shiftId);
      toast({ title: "Shift deleted", description: `Shift ${shiftIndex} removed.` });
      onClose();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setDeletingShiftId(null);
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
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStatus(opt.value)}
                  className={cn(
                    "py-1.5 rounded-lg text-xs font-semibold transition-all border-2",
                    status === opt.value
                      ? `${opt.color} border-transparent`
                      : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Existing kiosk shifts + shift selector */}
          {hasKioskShifts && (
            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
              <p className="text-xs font-medium text-gray-500 flex items-center gap-1">
                <Clock className="h-3 w-3" /> Kiosk-recorded times
              </p>
              <div className="space-y-1">
                {existingShifts.map((s) => (
                  <div key={s.shiftIndex} className="flex items-center gap-3 text-xs">
                    {existingShifts.length > 1 && (
                      <span className="text-gray-400 w-10 font-medium">Shift {s.shiftIndex}</span>
                    )}
                    <span className="text-green-600 font-medium">▲ {fmtTime(s.checkInTime)}</span>
                    {s.checkOutTime
                      ? <span className="text-red-500 font-medium">▼ {fmtTime(s.checkOutTime)}</span>
                      : <span className="text-amber-500 italic">Still in</span>
                    }
                  </div>
                ))}
              </div>
              {/* Shift picker */}
              <div>
                <p className="text-[10px] text-gray-400 mb-1.5">Edit times for:</p>
                <div className="flex flex-wrap gap-1.5">
                  {existingShifts.map((s) => (
                    <div key={s.shiftIndex} className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => selectShift(s.shiftIndex)}
                        className={cn(
                          "px-2.5 py-1 rounded-l-md text-xs font-semibold border transition-all",
                          editingShiftIndex === s.shiftIndex
                            ? "bg-orange-500 text-white border-orange-500"
                            : "bg-white text-gray-600 border-gray-300 hover:border-orange-400"
                        )}
                      >
                        Shift {s.shiftIndex}
                      </button>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleDeleteShift(s.id, s.shiftIndex)}
                          disabled={deletingShiftId === s.id}
                          title={`Delete Shift ${s.shiftIndex}`}
                          className="px-1.5 py-1 rounded-r-md text-xs border border-l-0 border-gray-300 bg-white text-red-400 hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-all disabled:opacity-40"
                        >
                          {deletingShiftId === s.id
                            ? <Loader2 className="h-3 w-3 animate-spin" />
                            : <Trash2 className="h-3 w-3" />}
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => selectShift("new")}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-xs font-semibold border transition-all",
                      editingShiftIndex === nextShiftIndex
                        ? "bg-orange-500 text-white border-orange-500"
                        : "bg-white text-gray-600 border-gray-300 hover:border-orange-400"
                    )}
                  >
                    + New shift
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Manual time entry */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Check-in time</label>
              <input
                type="time"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Check-out time</label>
              <input
                type="time"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes <span className="font-normal text-gray-400">(optional)</span></label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Manual entry — forgot to check in"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
            />
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
