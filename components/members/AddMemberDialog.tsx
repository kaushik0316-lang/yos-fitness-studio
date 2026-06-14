"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Check, X } from "lucide-react";
import { createMember } from "@/lib/actions/members";
import { toast } from "@/hooks/use-toast";
import type { Company } from "@prisma/client";
import { toTitleCase } from "@/lib/utils/titleCase";

const schema = z.object({
  fullName: z.string().min(2, "Name is required"),
  phone: z.string().min(10, "Valid phone required"),
  whatsapp: z.string().optional(),
  email: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  dateOfBirth: z.string().optional(),
  bloodGroup: z.string().optional(),
  weight: z.string().optional(),
  height: z.string().optional(),
  healthConditions: z.string().optional(),
  intentionOfJoining: z.string().optional(),
  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),
  address: z.string().optional(),
  trainerId: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["ACTIVE", "EXPIRED", "FROZEN", "INACTIVE", "PROSPECT"]),
});

type FormData = z.infer<typeof schema>;

type Props = {
  open: boolean;
  onClose: () => void;
  packages: { id: string; name: string; price: any; durationDays: number; company: Company | null }[];
  trainers: { id: string; fullName: string }[];
  userId: string;
};

const BLOOD_GROUPS = ["A+", "A−", "B+", "B−", "AB+", "AB−", "O+", "O−", "A1+", "A1−", "A1B+", "A1B−", "Other"];
const GOALS = [
  "Weight Loss", "Muscle Gain", "General Fitness", "Strength Training",
  "Flexibility & Mobility", "Sports Performance", "Rehabilitation", "Other",
];

const inp = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-orange-400 transition-colors bg-white";
const lbl = "block text-xs font-semibold text-gray-600 mb-1.5";
const sec = "bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4";

export function AddMemberDialog({ open, onClose, packages, trainers, userId }: Props) {
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { status: "ACTIVE" },
  });

  function handleClose() { reset(); onClose(); }

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      const result = await createMember({
        ...data,
        idCompany: "YOS_FITNESS",
        discount: 0,
        weight: data.weight ? Number(data.weight) : undefined,
        height: data.height ? Number(data.height) : undefined,
      });
      toast({ title: "Member added!", description: `Registered as ${result.memberId}` });
      handleClose();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={handleClose}>
      <div className="w-full max-w-lg rounded-2xl overflow-hidden flex flex-col"
        style={{ background: "#f9fafb", maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="bg-gray-950 px-6 pt-6 pb-5 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-white text-lg font-extrabold">Add New Member</h2>
            <button onClick={handleClose} className="text-gray-500 hover:text-gray-300 transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="text-gray-400 text-sm mt-1.5">Fill in the details below to register a new member</p>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">

            <div className={sec}>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Required</p>

              <div>
                <label className={lbl}>Full Name <span className="text-orange-500">*</span></label>
                <input
                  {...register("fullName")}
                  className={inp}
                  placeholder="As per ID proof"
                  onChange={(e) => {
                    const cleaned = toTitleCase(e.target.value.replace(/\./g, " ").replace(/ {2,}/g, " "));
                    e.target.value = cleaned;
                    register("fullName").onChange(e);
                  }}
                />
                {errors.fullName && <p className="text-xs text-red-500 mt-1">{errors.fullName.message}</p>}
              </div>

              <div>
                <label className={lbl}>Phone <span className="text-orange-500">*</span></label>
                <input {...register("phone")} className={inp} type="tel" inputMode="numeric" placeholder="10-digit number" />
                {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Gender</label>
                  <select {...register("gender")} className={inp}>
                    <option value="">Select</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className={lbl}>Date of Birth</label>
                  <input {...register("dateOfBirth")} type="date" className={inp} />
                </div>
              </div>

              <div>
                <label className={lbl}>Address</label>
                <input {...register("address")} className={inp} placeholder="Street, area, city" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Weight (kg)</label>
                  <input {...register("weight")} type="number" step="0.1" className={inp} placeholder="e.g. 70" />
                </div>
                <div>
                  <label className={lbl}>Height (cm)</label>
                  <input {...register("height")} type="number" step="0.1" className={inp} placeholder="e.g. 170" />
                </div>
              </div>

              <div>
                <label className={lbl}>Health Conditions / Injuries</label>
                <textarea {...register("healthConditions")} rows={2} className={`${inp} resize-none`}
                  placeholder="Diabetes, BP, injuries… or 'None'" />
              </div>
            </div>

            <div className={sec}>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Additional Info</p>

              <div>
                <label className={lbl}>WhatsApp</label>
                <input {...register("whatsapp")} className={inp} type="tel" placeholder="Same as phone" />
              </div>

              <div>
                <label className={lbl}>Email</label>
                <input {...register("email")} type="email" className={inp} placeholder="rajesh@gmail.com" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Blood Group</label>
                  <select {...register("bloodGroup")} className={inp}>
                    <option value="">—</option>
                    {BLOOD_GROUPS.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className={lbl}>Fitness Goal</label>
                  <select {...register("intentionOfJoining")} className={inp}>
                    <option value="">Select</option>
                    {GOALS.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Emergency Contact</label>
                  <input {...register("emergencyContact")} className={inp} placeholder="Name" />
                </div>
                <div>
                  <label className={lbl}>Emergency Phone</label>
                  <input {...register("emergencyPhone")} className={inp} type="tel" placeholder="10-digit" />
                </div>
              </div>
            </div>

            <div className={sec}>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Admin</p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Status</label>
                  <select {...register("status")} className={inp}>
                    <option value="ACTIVE">Active</option>
                    <option value="PROSPECT">Prospect</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className={lbl}>Assign Trainer</label>
                  <select {...register("trainerId")} className={inp}>
                    <option value="">No trainer</option>
                    {trainers.map((t) => <option key={t.id} value={t.id}>{toTitleCase(t.fullName)}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className={lbl}>Notes</label>
                <textarea {...register("notes")} rows={2} className={`${inp} resize-none`}
                  placeholder="Any notes about this member…" />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-5 py-4 bg-white border-t border-gray-100 flex-shrink-0">
            <button type="button" onClick={handleClose}
              className="text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 transition-colors">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Add Member
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
