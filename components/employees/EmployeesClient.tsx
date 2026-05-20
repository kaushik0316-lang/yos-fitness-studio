"use client";

import { useState } from "react";
import { Plus, UserCog, Phone, DollarSign, BarChart2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AddEmployeeDialog } from "@/components/employees/AddEmployeeDialog";
import { formatDate, formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { UserRole, EmployeeRole, SalaryType } from "@prisma/client";

type Employee = {
  id: string; employeeId: string; fullName: string; role: EmployeeRole;
  phone: string; joinDate: Date; salaryType: SalaryType;
  monthlySalary: any; perDaySalary: any; isActive: boolean; notes: string | null;
  user: { email: string; role: string } | null;
  _count: { attendances: number };
};

const ROLE_COLORS: Record<EmployeeRole, string> = {
  FRONT_DESK: "bg-blue-100 text-blue-700",
  TRAINER: "bg-green-100 text-green-700",
  CLEANER: "bg-gray-100 text-gray-600",
  MANAGER: "bg-purple-100 text-purple-700",
  ADMIN: "bg-orange-100 text-orange-700",
};

type Props = { employees: Employee[]; userRole: UserRole };

export function EmployeesClient({ employees, userRole }: Props) {
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{employees.filter((e) => e.isActive).length} active staff</p>
        {userRole === "ADMIN" && (
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="h-3.5 w-3.5" />
            Add Employee
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {employees.map((emp) => (
          <div key={emp.id} className={cn(
            "bg-white rounded-xl border p-5 transition-all hover:shadow-sm",
            !emp.isActive && "opacity-60"
          )}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600">
                  {emp.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{emp.fullName}</p>
                  <p className="text-xs text-gray-400">{emp.employeeId}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", ROLE_COLORS[emp.role])}>
                  {emp.role.replace("_", " ")}
                </span>
                {!emp.isActive && (
                  <span className="text-xs text-gray-400">Inactive</span>
                )}
              </div>
            </div>

            <div className="space-y-1.5 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Phone className="h-3.5 w-3.5 text-gray-400" />
                <a href={`tel:${emp.phone}`} className="hover:text-orange-600">{emp.phone}</a>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <DollarSign className="h-3.5 w-3.5 text-gray-400" />
                <span>
                  {emp.salaryType === "FIXED_MONTHLY"
                    ? `${formatCurrency(Number(emp.monthlySalary))}/month`
                    : `${formatCurrency(Number(emp.perDaySalary))}/day`}
                </span>
              </div>
              <div className="flex items-center gap-2 text-gray-500 text-xs">
                <UserCog className="h-3.5 w-3.5 text-gray-400" />
                <span>Since {formatDate(emp.joinDate)}</span>
              </div>
            </div>

            {emp.user && (
              <div className="mt-3 pt-3 border-t">
                <p className="text-xs text-gray-400">System Access: {emp.user.role}</p>
                <p className="text-xs text-gray-400">{emp.user.email}</p>
              </div>
            )}

            <div className="mt-3 pt-3 border-t flex gap-2">
              <Link
                href={`/employee-attendance?emp=${emp.employeeId}`}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold text-gray-500 border border-gray-200 hover:border-blue-300 hover:text-blue-600 transition-colors"
              >
                <UserCog className="h-3 w-3" />
                Attendance
              </Link>
              <Link
                href={`/payroll`}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold text-gray-500 border border-gray-200 hover:border-emerald-300 hover:text-emerald-600 transition-colors"
              >
                <BarChart2 className="h-3 w-3" />
                Payroll
              </Link>
            </div>
          </div>
        ))}
      </div>

      <AddEmployeeDialog open={showAdd} onClose={() => setShowAdd(false)} />
    </div>
  );
}
