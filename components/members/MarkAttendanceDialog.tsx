"use client";

import { useState } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { markMemberAttendance } from "@/lib/actions/attendance";
import { toast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
  member: { id: string; memberId: string; fullName: string };
  userId: string;
};

export function MarkAttendanceDialog({ open, onClose, member, userId }: Props) {
  const [loading, setLoading] = useState(false);
  const [remarks, setRemarks] = useState("");

  async function handleMark() {
    setLoading(true);
    try {
      const result = await markMemberAttendance(member.id, undefined, remarks || undefined);
      if (result.success) {
        toast({ title: "Attendance marked!", description: `${member.fullName} checked in today.` });
        onClose();
      } else {
        toast({ title: "Already marked", description: result.error, variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Mark Attendance</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="font-semibold text-gray-900">{member.fullName}</p>
            <p className="text-sm text-gray-500">{member.memberId} · {formatDate(new Date())}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Remarks <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Any notes..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleMark} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Mark Present
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
