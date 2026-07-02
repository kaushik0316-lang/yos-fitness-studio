"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Eye, EyeOff, UserCheck, UserX, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { toTitleCase } from "@/lib/utils/titleCase";
import { setEmployeeActive } from "@/lib/actions/employees";
import { toast } from "@/hooks/use-toast";
import { AddEmployeeDialog } from "./AddEmployeeDialog";
import { EditEmployeeDialog } from "./EditEmployeeDialog";
import { SalesDialog } from "./SalesDialog";
import { useRouter } from "next/navigation";

type Shift = { start: string; end: string };
type Employee = {
  id: string; employeeId: string; fullName: string; role: string;
  phone: string; salaryType: string; monthlySalary: number | null;
  perDaySalary: number | null; pin: string | null; shiftEndTime: string | null;
  shifts: Shift[] | null; shiftDays: number[] | null; notes: string | null; isActive: boolean; joinDate: Date;
};

const ROLE_LABELS: Record<string, string> = {
  FRONT_DESK: "Front Desk", TRAINER: "Trainer", CLEANER: "Cleaner",
  MANAGER: "Manager", ADMIN: "Admin",
};

const ROLE_COLORS: Record<string, string> = {
  FRONT_DESK: "bg-blue-500/15 text-blue-400",
  TRAINER:    "bg-orange-500/15 text-orange-400",
  CLEANER:    "bg-gray-500/15 text-gray-400",
  MANAGER:    "bg-purple-500/15 text-purple-400",
  ADMIN:      "bg-red-500/15 text-red-400",
};

export function StaffTab({ employees, salesMap = {}, month, year }: {
  employees: Employee[];
  salesMap?: Record<string, number>;
  month?: number;
  year?: number;
}) {
  const router = useRouter();
  const now = new Date();
  const m = month ?? (now.getMonth() + 1);
  const y = year  ?? now.getFullYear();

  const [addOpen, setAddOpen] = useState(false);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [salesEmployee, setSalesEmployee] = useState<Employee | null>(null);
  const [revealedPins, setRevealedPins] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  function togglePin(id: string) {
    setRevealedPins((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleToggleActive(emp: Employee) {
    if (!confirm(`${emp.isActive ? "Deactivate" : "Reactivate"} ${emp.fullName}?`)) return;
    startTransition(async () => {
      try {
        await setEmployeeActive(emp.id, !emp.isActive);
        toast({ title: emp.isActive ? "Deactivated" : "Reactivated", description: `${emp.fullName} is now ${emp.isActive ? "inactive" : "active"}.` });
        router.refresh();
      } catch (e: any) {
        toast({ title: "Error", description: e.message, variant: "destructive" });
      }
    });
  }

  const active   = employees.filter((e) => e.isActive);
  const inactive = employees.filter((e) => !e.isActive);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {active.length} active staff · each uses their PIN at the{" "}
          <span className="font-medium text-gray-400">Staff Dashboard → yosfitnessstudio.in/checkin</span>
        </p>
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all"
          style={{ background: "linear-gradient(135deg, #f97316, #ea580c)" }}
        >
          <Plus className="h-4 w-4" /> Add Staff
        </button>
      </div>

      {/* Active staff */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
          <UserCheck className="h-4 w-4 text-emerald-500" />
          <span className="text-sm font-semibold text-gray-300">Active Staff ({active.length})</span>
        </div>
        {active.length === 0 ? (
          <div className="p-8 text-center text-gray-600 text-sm">No active staff. Add your first staff member.</div>
        ) : (
          <div>
            {active.map((emp, idx) => (
              <StaffRow
                key={emp.id}
                emp={emp}
                idx={idx}
                salesThisMonth={salesMap[emp.id] ?? 0}
                pinRevealed={revealedPins.has(emp.id)}
                onTogglePin={() => togglePin(emp.id)}
                onEdit={() => setEditEmployee(emp)}
                onEditSales={() => setSalesEmployee(emp)}
                onToggleActive={() => handleToggleActive(emp)}
                isPending={isPending}
              />
            ))}
          </div>
        )}
      </div>

      {/* Inactive staff */}
      {inactive.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
            <UserX className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-semibold text-gray-600">Inactive Staff ({inactive.length})</span>
          </div>
          <div>
            {inactive.map((emp, idx) => (
              <StaffRow
                key={emp.id}
                emp={emp}
                idx={idx}
                salesThisMonth={salesMap[emp.id] ?? 0}
                pinRevealed={revealedPins.has(emp.id)}
                onTogglePin={() => togglePin(emp.id)}
                onEdit={() => setEditEmployee(emp)}
                onEditSales={() => setSalesEmployee(emp)}
                onToggleActive={() => handleToggleActive(emp)}
                isPending={isPending}
              />
            ))}
          </div>
        </div>
      )}

      <AddEmployeeDialog open={addOpen} onClose={() => { setAddOpen(false); router.refresh(); }} />
      <EditEmployeeDialog employee={editEmployee} onClose={() => { setEditEmployee(null); router.refresh(); }} />
      {salesEmployee && (
        <SalesDialog
          employeeId={salesEmployee.id}
          employeeName={salesEmployee.fullName}
          month={m}
          year={y}
          allEmployees={employees.map((e) => ({ id: e.id, fullName: e.fullName }))}
          onClose={() => setSalesEmployee(null)}
        />
      )}
    </div>
  );
}

function StaffRow({ emp, idx, salesThisMonth, pinRevealed, onTogglePin, onEdit, onEditSales, onToggleActive, isPending }: {
  emp: Employee; idx: number; salesThisMonth: number;
  pinRevealed: boolean; onTogglePin: () => void;
  onEdit: () => void; onEditSales: () => void; onToggleActive: () => void; isPending: boolean;
}) {
  const initials = emp.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div
      className={cn("flex items-center gap-4 px-4 py-3 transition-colors hover:bg-white/[0.02]", !emp.isActive && "opacity-50")}
      style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: idx % 2 === 0 ? "#161616" : "#181818" }}
    >
      {/* Avatar */}
      <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
        style={{ background: emp.isActive ? "rgba(249,115,22,0.15)" : "rgba(255,255,255,0.06)", color: emp.isActive ? "#fb923c" : "#6b7280" }}>
        {initials}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm text-white">{toTitleCase(emp.fullName)}</span>
          <span className="text-[10px] text-gray-600 font-medium">{emp.employeeId}</span>
          <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-semibold", ROLE_COLORS[emp.role] ?? "bg-white/10 text-gray-400")}>
            {ROLE_LABELS[emp.role] ?? emp.role}
          </span>
          {salesThisMonth > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-orange-500/15 text-orange-400">
              🏆 {formatCurrency(salesThisMonth)} this month
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <p className="text-xs text-gray-500">{emp.phone}</p>
          {emp.shiftDays && emp.shiftDays.length > 0 && emp.shiftDays.length < 7 && (
            <div className="flex items-center gap-0.5">
              {[{d:1,l:"M"},{d:2,l:"T"},{d:3,l:"W"},{d:4,l:"T"},{d:5,l:"F"},{d:6,l:"S"},{d:0,l:"S"}].map(({d,l},i) => (
                <span key={i} className="text-[9px] w-4 h-4 rounded flex items-center justify-center font-bold"
                  style={emp.shiftDays!.includes(d)
                    ? { background: "rgba(249,115,22,0.2)", color: "#fb923c" }
                    : { background: "rgba(255,255,255,0.04)", color: "#374151" }}>
                  {l}
                </span>
              ))}
            </div>
          )}
          {emp.shifts && Array.isArray(emp.shifts) && emp.shifts.length > 0 ? (
            <div className="flex items-center gap-1 flex-wrap">
              {(emp.shifts as Shift[]).filter(s => s.start && s.end).map((s, i) => (
                <span key={i} className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-orange-500/10 text-orange-500">
                  {s.start}–{s.end}
                </span>
              ))}
            </div>
          ) : emp.shiftEndTime ? (
            <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-orange-500/10 text-orange-500">
              Ends {emp.shiftEndTime}
            </span>
          ) : (
            <span className="text-[10px] text-gray-700">no shift set</span>
          )}
        </div>
      </div>

      {/* PIN */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <div className="rounded-lg px-3 py-1.5 flex items-center gap-2" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <span className="text-xs text-gray-500 font-medium">PIN</span>
          <span className="font-mono text-sm font-bold text-white min-w-[40px] tracking-widest">
            {emp.pin
              ? (pinRevealed ? emp.pin : "•".repeat(emp.pin.length))
              : <span className="text-gray-700 font-normal text-xs">not set</span>
            }
          </span>
          {emp.pin && (
            <button onClick={onTogglePin} className="text-gray-600 hover:text-gray-300 transition-colors">
              {pinRevealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {salesThisMonth > 0 && (
          <button onClick={onEditSales} className="p-1.5 rounded-lg text-gray-600 hover:text-orange-400 transition-colors" style={{ background: "rgba(255,255,255,0.04)" }} title="Edit sales">
            <TrendingUp className="h-3.5 w-3.5" />
          </button>
        )}
        <button onClick={onEdit} className="p-1.5 rounded-lg text-gray-600 hover:text-white transition-colors" style={{ background: "rgba(255,255,255,0.04)" }} title="Edit">
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onToggleActive}
          disabled={isPending}
          className={cn("p-1.5 rounded-lg transition-colors", emp.isActive ? "text-gray-600 hover:text-red-400" : "text-gray-600 hover:text-emerald-400")}
          style={{ background: "rgba(255,255,255,0.04)" }}
          title={emp.isActive ? "Deactivate" : "Reactivate"}
        >
          {emp.isActive ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}
