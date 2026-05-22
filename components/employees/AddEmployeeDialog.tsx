"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { createEmployee } from "@/lib/actions/employees";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

type Shift = { start: string; end: string };
type Props = { open: boolean; onClose: () => void };

type FormValues = {
  fullName: string; role: string; phone: string; joinDate: string;
  salaryType: string; monthlySalary: string; perDaySalary: string;
  pin: string; shifts: Shift[]; notes: string;
};

const inputCls = "w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500";
const labelCls = "block text-xs font-medium text-gray-500 mb-1";

export function AddEmployeeDialog({ open, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, watch, reset, control, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      fullName: "", role: "TRAINER", phone: "", joinDate: format(new Date(), "yyyy-MM-dd"),
      salaryType: "FIXED_MONTHLY", monthlySalary: "", perDaySalary: "",
      pin: "", shifts: [{ start: "", end: "" }], notes: "",
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "shifts" });
  const salaryType = watch("salaryType");

  function handleClose() { reset(); onClose(); }

  async function onSubmit(data: FormValues) {
    setLoading(true);
    try {
      const validShifts = data.shifts.filter(s => s.start && s.end);
      const result = await createEmployee({
        fullName:      data.fullName,
        role:          data.role as any,
        phone:         data.phone,
        joinDate:      data.joinDate,
        salaryType:    data.salaryType as any,
        monthlySalary: data.monthlySalary ? Number(data.monthlySalary) : undefined,
        perDaySalary:  data.perDaySalary  ? Number(data.perDaySalary)  : undefined,
        pin:           data.pin,
        shifts:        validShifts,
        notes:         data.notes,
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Staff Member</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* Name */}
          <div>
            <label className={labelCls}>Full Name *</label>
            <input {...register("fullName", { required: true })} placeholder="e.g. RAVI KUMAR"
              className={inputCls} style={{ textTransform: "uppercase" }} />
          </div>

          {/* Role + Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Role</label>
              <select {...register("role")} className={inputCls}>
                <option value="FRONT_DESK">Front Desk</option>
                <option value="TRAINER">Trainer</option>
                <option value="CLEANER">Cleaner</option>
                <option value="MANAGER">Manager</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Phone *</label>
              <input {...register("phone", { required: true })} placeholder="98765 43210" className={inputCls} />
            </div>
          </div>

          {/* PIN */}
          <div>
            <label className={labelCls}>Check-in PIN * <span className="text-gray-600 font-normal">(4 digits, used at kiosk)</span></label>
            <input {...register("pin", { required: "PIN required", pattern: { value: /^\d{4}$/, message: "Must be 4 digits" } })}
              type="text" inputMode="numeric" maxLength={4} placeholder="e.g. 1234"
              className={`${inputCls} font-mono tracking-widest`} />
            {errors.pin && <p className="text-xs text-red-400 mt-1">{errors.pin.message}</p>}
          </div>

          {/* Shifts */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={labelCls + " mb-0"}>Shift Schedule <span className="text-gray-600 font-normal">(IST, 24-h)</span></label>
              {fields.length < 4 && (
                <button type="button" onClick={() => append({ start: "", end: "" })}
                  className="flex items-center gap-1 text-xs font-semibold text-orange-400 hover:text-orange-300 transition-colors">
                  <Plus className="h-3 w-3" /> Add Shift
                </button>
              )}
            </div>
            <div className="space-y-2">
              {fields.map((field, idx) => (
                <div key={field.id} className="flex items-center gap-2">
                  <span className="text-xs text-gray-600 font-bold w-14 flex-shrink-0">
                    {["Shift 1","Shift 2","Shift 3","Shift 4"][idx]}
                  </span>
                  <div className="flex items-center gap-2 flex-1">
                    <input {...register(`shifts.${idx}.start`)} type="time" className={`${inputCls} flex-1`} />
                    <span className="text-gray-600 text-xs font-bold">→</span>
                    <input {...register(`shifts.${idx}.end`)}  type="time" className={`${inputCls} flex-1`} />
                  </div>
                  {fields.length > 1 && (
                    <button type="button" onClick={() => remove(idx)}
                      className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 transition-colors flex-shrink-0"
                      style={{ background: "rgba(255,255,255,0.04)" }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Join Date + Salary Type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Join Date</label>
              <input {...register("joinDate")} type="date" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Salary Type</label>
              <select {...register("salaryType")} className={inputCls}>
                <option value="FIXED_MONTHLY">Fixed Monthly</option>
                <option value="PER_DAY">Per Day</option>
              </select>
            </div>
          </div>

          {/* Salary amount */}
          <div>
            <label className={labelCls}>{salaryType === "FIXED_MONTHLY" ? "Monthly Salary (₹)" : "Per Day Salary (₹)"}</label>
            {salaryType === "FIXED_MONTHLY"
              ? <input {...register("monthlySalary")} type="number" placeholder="25000" className={inputCls} />
              : <input {...register("perDaySalary")}  type="number" placeholder="800"   className={inputCls} />
            }
          </div>

          {/* Notes */}
          <div>
            <label className={labelCls}>Notes</label>
            <textarea {...register("notes")} rows={2} className={`${inputCls} resize-none`} />
          </div>

          <DialogFooter>
            <button type="button" onClick={handleClose} disabled={loading}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-400 hover:text-white transition-colors"
              style={{ background: "rgba(255,255,255,0.06)" }}>
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #f97316, #ea580c)" }}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add Staff
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
