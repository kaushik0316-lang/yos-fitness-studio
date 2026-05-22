"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Loader2, Save } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { updateEmployee } from "@/lib/actions/employees";
import { toast } from "@/hooks/use-toast";

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
};

type Props = { employee: Employee | null; onClose: () => void };

export function EditEmployeeDialog({ employee, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm({
    defaultValues: {
      fullName: "", role: "FRONT_DESK", phone: "",
      salaryType: "FIXED_MONTHLY", monthlySalary: "", perDaySalary: "",
      pin: "", shiftEndTime: "", notes: "",
    },
  });

  const salaryType = watch("salaryType");

  useEffect(() => {
    if (employee) {
      reset({
        fullName: employee.fullName,
        role: employee.role,
        phone: employee.phone,
        salaryType: employee.salaryType,
        monthlySalary: employee.monthlySalary?.toString() ?? "",
        perDaySalary: employee.perDaySalary?.toString() ?? "",
        pin: employee.pin ?? "",
        shiftEndTime: employee.shiftEndTime ?? "",
        notes: employee.notes ?? "",
      });
    }
  }, [employee, reset]);

  async function onSubmit(data: any) {
    if (!employee) return;
    setLoading(true);
    try {
      await updateEmployee({
        id: employee.id,
        ...data,
        fullName: data.fullName.toUpperCase(),
        monthlySalary: data.monthlySalary ? Number(data.monthlySalary) : undefined,
        perDaySalary: data.perDaySalary ? Number(data.perDaySalary) : undefined,
        shiftEndTime: data.shiftEndTime || null,
      });
      toast({ title: "Saved!", description: `${data.fullName}'s profile updated.` });
      onClose();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={!!employee} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Staff — {employee?.employeeId}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Full Name *</label>
            <input
              {...register("fullName", { required: true })}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none uppercase"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
              <select {...register("role")} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none">
                <option value="FRONT_DESK">Front Desk</option>
                <option value="TRAINER">Trainer</option>
                <option value="CLEANER">Cleaner</option>
                <option value="MANAGER">Manager</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Phone *</label>
              <input {...register("phone", { required: true })} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Check-in PIN * <span className="text-gray-400 font-normal">(4 digits)</span></label>
            <input
              {...register("pin", {
                required: "PIN is required",
                pattern: { value: /^\d{4}$/, message: "Must be exactly 4 digits" },
              })}
              type="text"
              inputMode="numeric"
              maxLength={4}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none font-mono tracking-widest"
            />
            {errors.pin && <p className="text-xs text-red-600 mt-1">{errors.pin.message as string}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Shift End Time <span className="text-gray-400 font-normal">(IST, 24-h — e.g. 14:00 for 2 PM)</span>
            </label>
            <input
              {...register("shiftEndTime")}
              type="time"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Salary Type</label>
              <select {...register("salaryType")} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none">
                <option value="FIXED_MONTHLY">Fixed Monthly</option>
                <option value="PER_DAY">Per Day</option>
              </select>
            </div>
            {salaryType === "FIXED_MONTHLY" ? (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Monthly Salary (₹)</label>
                <input {...register("monthlySalary")} type="number" className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none" />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Per Day (₹)</label>
                <input {...register("perDaySalary")} type="number" className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none" />
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <textarea {...register("notes")} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none resize-none" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
