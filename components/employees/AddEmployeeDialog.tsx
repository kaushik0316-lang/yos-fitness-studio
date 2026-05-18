"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Loader2, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { createEmployee } from "@/lib/actions/employees";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

type Props = { open: boolean; onClose: () => void };

export function AddEmployeeDialog({ open, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm({
    defaultValues: {
      fullName: "", role: "FRONT_DESK", phone: "",
      joinDate: format(new Date(), "yyyy-MM-dd"),
      salaryType: "FIXED_MONTHLY", monthlySalary: "", perDaySalary: "",
      pin: "", notes: "",
    },
  });

  const salaryType = watch("salaryType");

  function handleClose() { reset(); onClose(); }

  async function onSubmit(data: any) {
    setLoading(true);
    try {
      const result = await createEmployee({
        ...data,
        fullName: data.fullName.toUpperCase(),
        monthlySalary: data.monthlySalary ? Number(data.monthlySalary) : undefined,
        perDaySalary: data.perDaySalary ? Number(data.perDaySalary) : undefined,
      });
      toast({ title: "Staff added!", description: `Registered as ${result.employeeId}. PIN: ${data.pin}` });
      handleClose();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Staff Member</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Full Name *</label>
            <input
              {...register("fullName", { required: true })}
              placeholder="e.g. RAVI KUMAR"
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
              <input
                {...register("phone", { required: true })}
                placeholder="98765 43210"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>
          </div>

          {/* PIN — used for check-in kiosk */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Check-in PIN * <span className="text-gray-400 font-normal">(4 digits, used at the kiosk)</span></label>
            <input
              {...register("pin", {
                required: "PIN is required",
                pattern: { value: /^\d{4}$/, message: "Must be exactly 4 digits" },
              })}
              type="text"
              inputMode="numeric"
              maxLength={4}
              placeholder="e.g. 1234"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none font-mono tracking-widest"
            />
            {errors.pin && <p className="text-xs text-red-600 mt-1">{errors.pin.message as string}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Join Date</label>
              <input {...register("joinDate")} type="date" className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Salary Type</label>
              <select {...register("salaryType")} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none">
                <option value="FIXED_MONTHLY">Fixed Monthly</option>
                <option value="PER_DAY">Per Day</option>
              </select>
            </div>
          </div>
          {salaryType === "FIXED_MONTHLY" ? (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Monthly Salary (₹)</label>
              <input {...register("monthlySalary")} type="number" className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none" placeholder="25000" />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Per Day Salary (₹)</label>
              <input {...register("perDaySalary")} type="number" className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none" placeholder="800" />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <textarea {...register("notes")} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none resize-none" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add Staff
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
