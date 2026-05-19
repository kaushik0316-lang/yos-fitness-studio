"use client";

import { Download } from "lucide-react";

export function ExportMembersButton() {
  return (
    <button
      className="border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors"
      onClick={() => {
        window.location.href = "/api/export/members";
      }}
    >
      <Download size={14} />
      Export Members
    </button>
  );
}
