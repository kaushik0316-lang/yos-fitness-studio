"use client";

import { useState, useRef } from "react";
import { Upload, Users, CreditCard, CheckCircle, AlertTriangle, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

type ImportResult = {
  imported: number;
  skipped: number;
  nameMatched?: number;
  ghostCreated?: number;
  errors: number;
  warnings: string[];
};

type Tab = "members" | "receipts";

export function ImportClient() {
  const [tab, setTab] = useState<Tab>("members");

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {(["members", "receipts"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all",
              tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            {t === "members" ? <Users className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
            {t === "members" ? "Members" : "Receipts"}
          </button>
        ))}
      </div>

      {tab === "members" && <MembersImport />}
      {tab === "receipts" && <ReceiptsImport />}
    </div>
  );
}

/* ─── Members importer ───────────────────────────────────────────────────── */

function MembersImport() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleImport() {
    if (!file) return;
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch("/api/import/members", { method: "POST", body: fd });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error ?? "Import failed");
      setResult(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-700">
        <strong>Member Master import</strong> — creates new member records from your Excel file.
        Members are company-agnostic; their IDs are generated from the APPLICATION NUMBER (e.g. YF-101).
        Duplicate phone numbers and existing IDs are skipped with a warning.
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
        {/* File picker */}
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Excel File</label>
          <div
            onClick={() => fileRef.current?.click()}
            className={cn(
              "mt-2 border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors",
              file ? "border-green-400 bg-green-50" : "border-gray-200 hover:border-orange-300 hover:bg-orange-50/30"
            )}
          >
            <Upload className={cn("h-7 w-7 mx-auto mb-2", file ? "text-green-500" : "text-gray-400")} />
            {file ? (
              <p className="text-sm font-semibold text-green-700">{file.name}</p>
            ) : (
              <>
                <p className="text-sm font-medium text-gray-600">Click to choose your Member Master .xlsx file</p>
                <p className="text-xs text-gray-400 mt-1">Columns: APPLICATION NUMBER, NAME, GENDER, DOB, ADDRESS, EMAIL, MOBILE, WEIGHT, HEIGHT, PURPOSE, DOJ</p>
              </>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => { setFile(e.target.files?.[0] ?? null); setResult(null); }}
          />
        </div>

        <button
          onClick={handleImport}
          disabled={!file || loading}
          className={cn(
            "w-full py-3 rounded-xl font-bold text-sm transition-all",
            !file || loading
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-200"
          )}
        >
          {loading ? "Importing… this may take a moment" : "Import Members"}
        </button>
      </div>

      {error && <ErrorBanner message={error} />}
      {result && <ResultCard result={result} type="members" />}
    </div>
  );
}

/* ─── Receipts importer ──────────────────────────────────────────────────── */

function ReceiptsImport() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [company, setCompany] = useState("YOS_FITNESS");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleImport() {
    if (!file) return;
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("company", company);

      const res = await fetch("/api/import/receipts", { method: "POST", body: fd });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error ?? "Import failed");
      setResult(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-700">
        <strong>Receipt import</strong> — creates payment records from your Excel file.
        Members are matched by Application Number → Mobile → fuzzy name matching.
        If still no match, a new member is auto-created so no receipt is ever lost.
        Duplicate receipt numbers are skipped.
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Which company's receipts?</label>
          <div className="flex gap-3 mt-2">
            {[
              { value: "YOS_FITNESS", label: "Yos Fitness", sub: "Yos fitness receipts.xlsx", color: "border-orange-400 bg-orange-50 text-orange-700" },
              { value: "YOS_FITNESS_STUDIO", label: "Yos Studio", sub: "Yos fitness Studio Receipts.xlsx", color: "border-indigo-400 bg-indigo-50 text-indigo-700" },
            ].map((c) => (
              <button
                key={c.value}
                onClick={() => setCompany(c.value)}
                className={cn(
                  "px-4 py-2.5 rounded-xl border-2 text-left transition-all flex-1",
                  company === c.value ? c.color + " border-2" : "border-gray-200 text-gray-500 hover:border-gray-300"
                )}
              >
                <p className="text-sm font-bold">{c.label}</p>
                <p className="text-[11px] opacity-70 mt-0.5">{c.sub}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Excel File</label>
          <div
            onClick={() => fileRef.current?.click()}
            className={cn(
              "mt-2 border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors",
              file ? "border-green-400 bg-green-50" : "border-gray-200 hover:border-orange-300 hover:bg-orange-50/30"
            )}
          >
            <Upload className={cn("h-7 w-7 mx-auto mb-2", file ? "text-green-500" : "text-gray-400")} />
            {file ? (
              <p className="text-sm font-semibold text-green-700">{file.name}</p>
            ) : (
              <>
                <p className="text-sm font-medium text-gray-600">Click to choose your receipts .xlsx file</p>
                <p className="text-xs text-gray-400 mt-1">Columns: DATE, RECEIPT NO., NAME, MOBILE, APPL NO, TYPE, MODE OF PAYMENT, PACKAGE, DURATION, START, END, AMOUNT, BALANCE</p>
              </>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => { setFile(e.target.files?.[0] ?? null); setResult(null); }}
          />
        </div>

        <button
          onClick={handleImport}
          disabled={!file || loading}
          className={cn(
            "w-full py-3 rounded-xl font-bold text-sm transition-all",
            !file || loading
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-200"
          )}
        >
          {loading ? "Importing… this may take a moment" : "Import Receipts"}
        </button>
      </div>

      {error && <ErrorBanner message={error} />}
      {result && <ResultCard result={result} type="receipts" />}
    </div>
  );
}

/* ─── Shared result card ─────────────────────────────────────────────────── */

function ResultCard({ result, type }: { result: ImportResult; type: "members" | "receipts" }) {
  const [showWarnings, setShowWarnings] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
      <p className="text-sm font-bold text-gray-700 uppercase tracking-wider">Import Complete</p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatPill icon={CheckCircle} label="Imported" value={result.imported} color="text-green-600 bg-green-50" />
        <StatPill icon={AlertTriangle} label="Skipped" value={result.skipped} color="text-amber-600 bg-amber-50" />
        {type === "receipts" && !!result.nameMatched && (
          <StatPill icon={CheckCircle} label="Name matched" value={result.nameMatched} color="text-violet-600 bg-violet-50" />
        )}
        {type === "receipts" && !!result.ghostCreated && (
          <StatPill icon={AlertTriangle} label="New members" value={result.ghostCreated} color="text-blue-600 bg-blue-50" />
        )}
        <StatPill icon={XCircle} label="Errors" value={result.errors} color="text-red-600 bg-red-50" />
      </div>

      {result.warnings.length > 0 && (
        <div>
          <button
            onClick={() => setShowWarnings((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 hover:text-amber-900 transition-colors"
          >
            {showWarnings ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {result.warnings.length} warning{result.warnings.length !== 1 ? "s" : ""}
          </button>
          {showWarnings && (
            <div className="mt-2 bg-amber-50 border border-amber-100 rounded-lg p-3 max-h-60 overflow-y-auto">
              {result.warnings.map((w, i) => (
                <p key={i} className="text-[11px] text-amber-800 font-mono leading-relaxed">{w}</p>
              ))}
              {result.warnings.length === 100 && (
                <p className="text-[11px] text-amber-600 mt-1 italic">Showing first 100 warnings…</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatPill({
  icon: Icon, label, value, color,
}: { icon: any; label: string; value: number; color: string }) {
  return (
    <div className={cn("rounded-xl p-3 flex items-center gap-2.5", color)}>
      <Icon className="h-4 w-4 flex-shrink-0" />
      <div>
        <p className="text-xl font-extrabold leading-none">{value}</p>
        <p className="text-[10px] font-semibold uppercase tracking-wide opacity-70 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-2">
      <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
      <p className="text-sm text-red-700 font-medium">{message}</p>
    </div>
  );
}
