"use client";

import { useState } from "react";
import { Plus, Package, Users, Loader2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { formatCurrency, COMPANY_LABELS, COMPANY_COLORS } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Company, UserRole } from "@prisma/client";

type Package = {
  id: string; name: string; durationDays: number; price: any;
  company: Company | null; isActive: boolean; isCustom: boolean;
};

type User = { id: string; name: string; email: string; role: UserRole; isActive: boolean };

type Props = { packages: Package[]; users: User[] };

const ROLE_COLORS: Record<string, string> = {
  ADMIN:      "bg-orange-100 text-orange-700",
  FRONT_DESK: "bg-blue-100 text-blue-700",
  TRAINER:    "bg-green-100 text-green-700",
  ACCOUNTANT: "bg-purple-100 text-purple-700",
};

export function SettingsClient({ packages, users }: Props) {
  const [activeTab, setActiveTab] = useState<"packages" | "users">("packages");
  const [showAddPkg, setShowAddPkg] = useState(false);
  const [savingPkg, setSavingPkg] = useState(false);
  const [newPkg, setNewPkg] = useState({ name: "", durationDays: "30", price: "", company: "YOS_FITNESS", notes: "" });

  async function savePackage() {
    if (!newPkg.name || !newPkg.price) {
      toast({ title: "Fill in all required fields", variant: "destructive" });
      return;
    }
    setSavingPkg(true);
    try {
      const res = await fetch("/api/packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newPkg,
          durationDays: Number(newPkg.durationDays),
          price: Number(newPkg.price),
          company: newPkg.company === "BOTH" ? null : newPkg.company,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast({ title: "Package created!" });
      setShowAddPkg(false);
      setNewPkg({ name: "", durationDays: "30", price: "", company: "YOS_FITNESS", notes: "" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSavingPkg(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {[
          { key: "packages", label: `Packages (${packages.length})`, icon: Package },
          { key: "users",    label: `Users (${users.length})`,    icon: Users },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as any)}
            className={cn("flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
              activeTab === t.key ? "bg-white shadow-sm text-gray-900" : "text-gray-500"
            )}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Packages tab */}
      {activeTab === "packages" && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setShowAddPkg(!showAddPkg)}>
              <Plus className="h-3.5 w-3.5" />
              Add Package
            </Button>
          </div>

          {/* Add package form */}
          {showAddPkg && (
            <div className="bg-white rounded-xl border p-5 space-y-3">
              <h3 className="font-semibold text-gray-900 text-sm">New Package</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Package Name *</label>
                  <input value={newPkg.name} onChange={(e) => setNewPkg(p => ({ ...p, name: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                    placeholder="e.g. 3 Month Premium" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Duration (days)</label>
                  <input value={newPkg.durationDays} onChange={(e) => setNewPkg(p => ({ ...p, durationDays: e.target.value }))}
                    type="number" className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Price (₹) *</label>
                  <input value={newPkg.price} onChange={(e) => setNewPkg(p => ({ ...p, price: e.target.value }))}
                    type="number" className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Company</label>
                  <select value={newPkg.company} onChange={(e) => setNewPkg(p => ({ ...p, company: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none">
                    <option value="YOS_FITNESS">Yos Fitness</option>
                    <option value="YOS_FITNESS_STUDIO">Yos Fitness Studio</option>
                    <option value="BOTH">Both Companies</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setShowAddPkg(false)}>Cancel</Button>
                <Button size="sm" onClick={savePackage} disabled={savingPkg}>
                  {savingPkg ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  Save
                </Button>
              </div>
            </div>
          )}

          {/* Package list */}
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Package</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Duration</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Price</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Company</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {packages.map((pkg) => (
                  <tr key={pkg.id} className={cn("hover:bg-gray-50", !pkg.isActive && "opacity-50")}>
                    <td className="px-4 py-3 font-medium text-gray-900">{pkg.name}</td>
                    <td className="px-4 py-3 text-gray-600">{pkg.durationDays} days</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{formatCurrency(Number(pkg.price))}</td>
                    <td className="px-4 py-3">
                      {pkg.company ? (
                        <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", COMPANY_COLORS[pkg.company])}>
                          {pkg.company === "YOS_FITNESS" ? "Yos Fitness" : "Yos Studio"}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Both</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {pkg.isActive
                        ? <span className="text-xs text-green-600 font-medium flex items-center gap-1"><Check className="h-3 w-3" />Active</span>
                        : <span className="text-xs text-gray-400 flex items-center gap-1"><X className="h-3 w-3" />Inactive</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Users tab */}
      {activeTab === "users" && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Email</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Role</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id} className={cn("hover:bg-gray-50", !u.isActive && "opacity-50")}>
                  <td className="px-4 py-3 font-medium text-gray-900">{u.name}</td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", ROLE_COLORS[u.role] ?? "bg-gray-100 text-gray-600")}>
                      {u.role.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {u.isActive
                      ? <span className="text-xs text-green-600 font-medium">Active</span>
                      : <span className="text-xs text-gray-400">Inactive</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
