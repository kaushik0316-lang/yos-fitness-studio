"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Eye, EyeOff, UserCheck, UserX } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { setEmployeeActive } from "@/lib/actions/employees";
import { toast } from "@/hooks/use-toast";
import { AddEmployeeDialog } from "./AddEmployeeDialog";
import { EditEmployeeDialog } from "./EditEmployeeDialog";
import { useRouter } from "next/navigation";

type Employee = {
  id: string;
  employeeId: string;
  fullName: string;
  role: string;
  phone: string;
  salaryType: string;
  monthlySalary: number | null;
  perDaySalary: number | null;
  pin: string | null;
  shiftEndTime: string | null;
  notes: string | null;
  isActive: boolean;
  joinDate: Date;
};

const ROLE_LABELS: Record<string, string> = {
  FRONT_DESK: "Front Desk",
  TRAINER: "Trainer",
  CLEANER: "Cleaner",
  MANAGER: "Manager",
  ADMIN: "Admin",
};

const ROLE_COLORS: Record<string, string> = {
  FRONT_DESK: "bg-blue-100 text-blue-700",
  TRAINER: "bg-orange-100 text-orange-700",
  CLEANER: "bg-gray-100 text-gray-600",
  MANAGER: "bg-purple-100 text-purple-700",
  ADMIN: "bg-red-100 text-red-700",
};

export function StaffTab({ employees, salesMap = {} }: { employees: Employee[]; salesMap?: Record<string, number> }) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
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
    const action = emp.isActive ? "deactivate" : "reactivate";
    if (!confirm(`${emp.isActive ? "Deactivate" : "Reactivate"} ${emp.fullName}? They ${emp.isActive ? "will no longer" : "will"} be able to check in.`)) return;

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

  const active = employees.filter((e) => e.isActive);
  const inactive = employees.filter((e) => !e.isActive);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{active.length} active staff · each uses their PIN at the <span className="font-medium text-gray-700">Staff Dashboard → yosfitnessstudio.in/checkin</span></p>
        </div>
        <Button onClick={() => setAddOpen(true)} size="sm">
          <Plus className="h-4 w-4" />
          Add Staff
        </Button>
      </div>

      {/* Active staff */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b flex items-center gap-2">
          <UserCheck className="h-4 w-4 text-green-600" />
          <span className="text-sm font-semibold text-gray-700">Active Staff ({active.length})</span>
        </div>
        {active.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No active staff. Add your first staff member above.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {active.map((emp) => (
              <StaffRow
                key={emp.id}
                emp={emp}
                salesThisMonth={salesMap[emp.id] ?? 0}
                pinRevealed={revealedPins.has(emp.id)}
                onTogglePin={() => togglePin(emp.id)}
                onEdit={() => setEditEmployee(emp)}
                onToggleActive={() => handleToggleActive(emp)}
                isPending={isPending}
              />
            ))}
          </div>
        )}
      </div>

      {/* Inactive staff */}
      {inactive.length > 0 && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b flex items-center gap-2">
            <UserX className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-semibold text-gray-500">Inactive Staff ({inactive.length})</span>
          </div>
          <div className="divide-y divide-gray-100">
            {inactive.map((emp) => (
              <StaffRow
                key={emp.id}
                emp={emp}
                salesThisMonth={salesMap[emp.id] ?? 0}
                pinRevealed={revealedPins.has(emp.id)}
                onTogglePin={() => togglePin(emp.id)}
                onEdit={() => setEditEmployee(emp)}
                onToggleActive={() => handleToggleActive(emp)}
                isPending={isPending}
              />
            ))}
          </div>
        </div>
      )}

      <AddEmployeeDialog open={addOpen} onClose={() => { setAddOpen(false); router.refresh(); }} />
      <EditEmployeeDialog employee={editEmployee} onClose={() => { setEditEmployee(null); router.refresh(); }} />
    </div>
  );
}

function StaffRow({
  emp, salesThisMonth, pinRevealed, onTogglePin, onEdit, onToggleActive, isPending,
}: {
  emp: Employee;
  salesThisMonth: number;
  pinRevealed: boolean;
  onTogglePin: () => void;
  onEdit: () => void;
  onToggleActive: () => void;
  isPending: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-4 px-4 py-3 hover:bg-gray-50/60 transition-colors", !emp.isActive && "opacity-60")}>
      {/* Avatar */}
      <div className={cn(
        "w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0",
        emp.isActive ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-500"
      )}>
        {emp.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm text-gray-900">{emp.fullName}</span>
          <span className="text-[10px] text-gray-400 font-medium">{emp.employeeId}</span>
          <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-semibold", ROLE_COLORS[emp.role] ?? "bg-gray-100 text-gray-600")}>
            {ROLE_LABELS[emp.role] ?? emp.role}
          </span>
          {salesThisMonth > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-orange-100 text-orange-700">
              🏆 {formatCurrency(salesThisMonth)} this month
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <p className="text-xs text-gray-500">{emp.phone}</p>
          {emp.shiftEndTime ? (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-50 text-orange-600 font-semibold">
              Ends {emp.shiftEndTime}
            </span>
          ) : (
            <span className="text-[10px] text-gray-300">no shift set</span>
          )}
        </div>
      </div>

      {/* PIN */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 flex items-center gap-2">
          <span className="text-xs text-gray-500 font-medium">PIN</span>
          <span className="font-mono text-sm font-bold text-gray-900 min-w-[40px] tracking-widest">
            {emp.pin
              ? (pinRevealed ? emp.pin : "•".repeat(emp.pin.length))
              : <span className="text-gray-300 font-normal text-xs">not set</span>
            }
          </span>
          {emp.pin && (
            <button onClick={onTogglePin} className="text-gray-400 hover:text-gray-700 transition-colors">
              {pinRevealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={onEdit}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors"
          title="Edit"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onToggleActive}
          disabled={isPending}
          className={cn(
            "p-1.5 rounded-lg transition-colors",
            emp.isActive
              ? "hover:bg-red-50 text-gray-400 hover:text-red-600"
              : "hover:bg-green-50 text-gray-400 hover:text-green-600"
          )}
          title={emp.isActive ? "Deactivate" : "Reactivate"}
        >
          {emp.isActive ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}
