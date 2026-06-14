"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Check, ChevronLeft, X } from "lucide-react";
import { createMember } from "@/lib/actions/members";
// Dialog UI is custom — no shadcn Dialog dependency needed
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
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
  packageId: z.string().optional(),
  startDate: z.string().optional(),
  paymentAmount: z.string().optional(),
  discount: z.string().optional(),
  paymentMode: z.enum(["CASH", "UPI", "CARD", "BANK_TRANSFER", "CHEQUE", "FREE"]).optional(),
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
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      status: "ACTIVE",
      startDate: format(new Date(), "yyyy-MM-dd"),
      discount: "0",
    },
  });

  const selectedPackageId = watch("packageId");
  const selectedPkg = packages.find((p) => p.id === selectedPackageId);
  const filteredPackages = packages.filter((p) => !p.company || p.company === "YOS_FITNESS");

  function handleClose() { reset(); setStep(0); onClose(); }

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      const result = await createMember({
        ...data,
        idCompany: "YOS_FITNESS",
        weight: data.weight ? Number(data.weight) : undefined,
        height: data.height ? Number(data.height) : undefined,
        paymentAmount: data.paymentAmount ? Number(data.paymentAmount) : undefined,
        discount: data.discount ? Number(data.discount) : 0,
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white text-lg font-extrabold">Add New Member</h2>
            <button onClick={handleClose} className="text-gray-500 hover:text-gray-300 transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
          {/* Step indicator */}
          <div className="flex items-center gap-3">
            {["Personal Info", "Membership"].map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all
                    ${i === step ? "bg-white text-orange-600 border-white"
                    : i < step ? "bg-orange-500 border-orange-500 text-white"
                    : "border-gray-600 text-gray-600"}`}>
                    {i < step ? <Check className="h-3 w-3" /> : i + 1}
                  </div>
                  <span className={`text-sm font-medium transition-all
                    ${i === step ? "text-white" : i < step ? "text-orange-400" : "text-gray-600"}`}>
                    {s}
                  </span>
                </div>
                {i === 0 && <div className="w-8 h-px bg-gray-700 mx-1" />}
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">

            {/* ── Step 0: Personal Info ── */}
            {step === 0 && (
              <>
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
              </>
            )}

            {/* ── Step 1: Membership ── */}
            {step === 1 && (
              <div className={sec}>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Membership & Payment</p>
                <p className="text-sm text-gray-500 !mt-1">Assign a package and record the first payment. Skip if enrolling as a prospect.</p>

                <div>
                  <label className={lbl}>Package</label>
                  <select {...register("packageId")} className={inp}>
                    <option value="">No package (Prospect / Walk-in)</option>
                    {filteredPackages.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} — ₹{Number(p.price).toLocaleString("en-IN")}</option>
                    ))}
                  </select>
                </div>

                {selectedPackageId && (
                  <>
                    <div>
                      <label className={lbl}>Start Date</label>
                      <input {...register("startDate")} type="date" className={inp} />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={lbl}>
                          Amount Paid (₹)
                          {selectedPkg && <span className="text-gray-400 font-normal ml-1">MRP ₹{Number(selectedPkg.price).toLocaleString("en-IN")}</span>}
                        </label>
                        <input {...register("paymentAmount")} type="number"
                          defaultValue={selectedPkg ? Number(selectedPkg.price) : undefined} className={inp} />
                      </div>
                      <div>
                        <label className={lbl}>Discount (₹)</label>
                        <input {...register("discount")} type="number" defaultValue={0} className={inp} />
                      </div>
                    </div>

                    <div>
                      <label className={lbl}>Payment Mode</label>
                      <select {...register("paymentMode")} className={inp}>
                        <option value="CASH">Cash</option>
                        <option value="UPI">UPI</option>
                        <option value="CARD">Card</option>
                        <option value="BANK_TRANSFER">Bank Transfer</option>
                        <option value="FREE">Free / Complimentary</option>
                      </select>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-5 py-4 bg-white border-t border-gray-100 flex-shrink-0">
            <button type="button" onClick={handleClose}
              className="text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors">
              Cancel
            </button>
            <div className="flex items-center gap-2">
              {step > 0 && (
                <button type="button" onClick={() => setStep(s => s - 1)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200 hover:border-gray-300 transition-colors bg-white">
                  <ChevronLeft className="h-4 w-4" /> Back
                </button>
              )}
              {step === 0 ? (
                <button type="button" onClick={() => setStep(1)}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 active:bg-orange-700 transition-colors">
                  Next →
                </button>
              ) : (
                <button type="submit" disabled={loading}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 transition-colors">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Add Member
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
