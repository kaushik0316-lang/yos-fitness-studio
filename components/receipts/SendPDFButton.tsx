"use client";

import { useState } from "react";

type Props = {
  phone: string | null | undefined;
  memberName: string;
  receiptNo: number | null | undefined;
};

function isFakePhone(p: string | null | undefined): boolean {
  if (!p) return true;
  const d = p.replace(/\D/g, "");
  if (d.length < 10) return true;
  if (/^0+$/.test(d)) return true;
  if (/^(.)\1+$/.test(d)) return true;
  return false;
}

export function SendPDFButton({ phone, memberName, receiptNo }: Props) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "shared" | "downloaded">("idle");

  async function handleClick() {
    setLoading(true);
    setStatus("idle");
    try {
      // Dynamically import to keep bundle light
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      const el = document.getElementById("receipt-card");
      if (!el) throw new Error("Receipt card not found");

      // Capture receipt at 2× for crispness
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: null,
        logging: false,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.92);
      const imgW = canvas.width;
      const imgH = canvas.height;

      // PDF sized to match image (in mm, 96dpi base)
      const pxToMm = 25.4 / 96;
      const pdfW = (imgW / 2) * pxToMm;
      const pdfH = (imgH / 2) * pxToMm;

      const pdf = new jsPDF({ orientation: pdfH > pdfW ? "portrait" : "landscape", unit: "mm", format: [pdfW, pdfH] });
      pdf.addImage(imgData, "JPEG", 0, 0, pdfW, pdfH);

      const fileName = `Receipt-${receiptNo ?? "receipt"}-${memberName.replace(/\s+/g, "_")}.pdf`;
      const pdfBlob = pdf.output("blob");
      const file = new File([pdfBlob], fileName, { type: "application/pdf" });

      // Try Web Share API (works on Android/iOS Chrome/Safari)
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: `Receipt #${receiptNo}` });
        setStatus("shared");
      } else {
        // Desktop fallback: download PDF
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        setStatus("downloaded");

        // Also open WhatsApp Web if phone is real
        if (!isFakePhone(phone)) {
          const digits = phone!.replace(/\D/g, "");
          const wa = digits.length === 10 ? `91${digits}` : digits;
          setTimeout(() => window.open(`https://web.whatsapp.com/send?phone=${wa}`, "_blank"), 800);
        }
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") alert(`Could not generate PDF: ${e?.message ?? e}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="no-print flex flex-col items-start gap-1">
      <button
        onClick={handleClick}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60"
        style={{ background: "#25d366", color: "#fff", border: "none", cursor: loading ? "not-allowed" : "pointer" }}
      >
        {loading ? (
          <>
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Generating…
          </>
        ) : (
          <>
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Share
          </>
        )}
      </button>
      {status === "shared" && <p className="text-xs text-green-600 font-medium">✓ Shared!</p>}
      {status === "downloaded" && <p className="text-xs text-blue-600 font-medium">PDF downloaded — attach it in WhatsApp Web</p>}
    </div>
  );
}
