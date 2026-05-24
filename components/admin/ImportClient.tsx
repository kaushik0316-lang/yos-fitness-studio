"use client";

import { useState, useRef } from "react";
import { Upload, Users, CreditCard, CheckCircle, AlertTriangle, XCircle, ChevronDown, ChevronUp, Wand2, UserX, RefreshCw, Zap, UserCheck, CalendarX, GitMerge, Type, ReceiptText, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ImportResult = {
  imported: number;
  skipped: number;
  nameMatched?: number;
  ghostCreated?: number;
  errors: number;
  warnings: string[];
};

type RematchResult = {
  ghostsFound: number;
  rematched: number;
  deleted: number;
  unresolved: number;
  unresolvedNames: string[];
};

type BackfillResult = {
  datesUpdated: number;
  notFound: number;
  noDates: number;
  membersSetActive: number;
  membersSetExpired: number;
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

      <FixReceiptNumbersPanel />
      <MergeDuplicatesPanel />
      <FixSpecificPaymentsPanel />
      <FixReceiptDatesPanel />
      <FixCurrentPackagePanel />
      <FixNamesPanel />
      <FuzzyMergePanel />
      <RematchPanel />
      <FixGhostsPanel />
      <BackfillPanel />
      <SyncExpiryPanel />
      <FixNoPaymentPanel />
      <FixDatesPanel />
      <FixSundayAbsencesPanel />
    </div>
  );
}

/* ─── Fix corrupt receipt numbers (Excel date serials imported as numbers) ── */

function FixReceiptNumbersPanel() {
  const [loading, setLoading]   = useState(false);
  const [fixing, setFixing]     = useState(false);
  const [info, setInfo]         = useState<{ badCount: number; maxGoodReceiptNumber: number; samples: any[] } | null>(null);
  const [result, setResult]     = useState<{ fixed: number; maxReceiptNumberNow: number; message: string } | null>(null);
  const [error, setError]       = useState<string | null>(null);

  async function check() {
    setLoading(true); setError(null); setResult(null);
    try {
      const res  = await fetch("/api/admin/fix-receipt-numbers");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setInfo(data);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function fix() {
    if (!confirm(`This will clear ${info?.badCount} corrupt receipt number(s) (> 9999). They will show as "—" on old imported receipts but new receipts will get correct numbers. Continue?`)) return;
    setFixing(true); setError(null);
    try {
      const res  = await fetch("/api/admin/fix-receipt-numbers", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setResult(data); setInfo(null);
    } catch (e: any) { setError(e.message); }
    finally { setFixing(false); }
  }

  return (
    <div className="bg-white rounded-xl border border-dashed border-red-200 p-5 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <ReceiptText className="h-4 w-4 text-red-500" />
            Fix Corrupt Receipt Numbers
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            Excel date serials (e.g. 32803) were accidentally imported as receipt numbers.
            This finds all receipt numbers above 9999 and clears them so the next real receipt gets the correct sequential number.
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={check} disabled={loading || fixing}
            className={cn("flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
              loading ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-gray-100 hover:bg-gray-200 text-gray-700")}>
            {loading ? "Checking…" : "Check"}
          </button>
          {info && info.badCount > 0 && (
            <button onClick={fix} disabled={fixing}
              className={cn("flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
                fixing ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-red-500 hover:bg-red-600 text-white shadow-md shadow-red-200")}>
              {fixing ? "Fixing…" : `Clear ${info.badCount} bad number${info.badCount !== 1 ? "s" : ""}`}
            </button>
          )}
        </div>
      </div>

      {error && <ErrorBanner message={error} />}

      {info && (
        <div className="space-y-2">
          {info.badCount === 0 ? (
            <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3">
              <p className="text-sm font-semibold text-green-700">✓ No corrupt receipt numbers found. Highest valid receipt: #{info.maxGoodReceiptNumber}</p>
            </div>
          ) : (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 space-y-2">
              <p className="text-sm font-semibold text-red-700">⚠ {info.badCount} corrupt receipt number(s) found. Highest valid: #{info.maxGoodReceiptNumber}</p>
              <div className="space-y-1">
                {info.samples.map((s: any, i: number) => (
                  <p key={i} className="text-xs font-mono text-red-600">#{s.receiptNumber} — {s.member} ({s.memberId}) ₹{s.amount}</p>
                ))}
                {info.badCount > 10 && <p className="text-xs text-gray-400">…and {info.badCount - 10} more</p>}
              </div>
            </div>
          )}
        </div>
      )}

      {result && (
        <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3">
          <p className="text-sm font-semibold text-green-700">✓ {result.message}</p>
        </div>
      )}
    </div>
  );
}

/* ─── Merge duplicate members (same phone number) ───────────────────────── */

type DupeGroup = {
  phone: string;
  members: { id: string; memberId: string; fullName: string; status: string; payments: number; attendances: number }[];
};

function MergeDuplicatesPanel() {
  const [loading, setLoading]   = useState(false);
  const [merging, setMerging]   = useState(false);
  const [dupes, setDupes]       = useState<DupeGroup[] | null>(null);
  const [results, setResults]   = useState<string[] | null>(null);
  const [error, setError]       = useState<string | null>(null);

  async function preview() {
    setLoading(true); setError(null); setDupes(null); setResults(null);
    try {
      const res  = await fetch("/api/admin/merge-duplicates");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setDupes(data.duplicates);
      setError(null); // clear any stale error
    } catch (e: any) { setError(e.message); setDupes(null); }
    finally { setLoading(false); }
  }

  async function merge() {
    if (!confirm(`This will merge ${dupes?.length} duplicate group(s). The member with more payments is kept. Continue?`)) return;
    setMerging(true); setError(null);
    try {
      const res  = await fetch("/api/admin/merge-duplicates", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setResults(data.results);
      setDupes(null);
    } catch (e: any) { setError(e.message); }
    finally { setMerging(false); }
  }

  return (
    <div className="bg-white rounded-xl border border-dashed border-red-200 p-5 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <GitMerge className="h-4 w-4 text-red-500" />
            Merge Duplicate Members
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            Finds members with the same phone number and merges them into one record. The member with more payments is kept; all data (payments, attendances) is moved across.
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={preview} disabled={loading || merging}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
              loading ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700"
            )}
          >
            {loading ? "Checking…" : "Preview"}
          </button>
          {dupes && dupes.length > 0 && (
            <button
              onClick={merge} disabled={merging}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
                merging ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-red-500 hover:bg-red-600 text-white shadow-md shadow-red-200"
              )}
            >
              <GitMerge className="h-3.5 w-3.5" />
              {merging ? "Merging…" : `Merge ${dupes.length} group${dupes.length !== 1 ? "s" : ""}`}
            </button>
          )}
        </div>
      </div>

      {error && <ErrorBanner message={error} />}

      {dupes !== null && dupes.length === 0 && (
        <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3">
          <p className="text-sm font-semibold text-green-700">✓ No duplicates found — all phone numbers are unique.</p>
        </div>
      )}

      {dupes && dupes.length > 0 && (
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {dupes.map((g) => (
            <div key={g.phone} className="bg-red-50 border border-red-100 rounded-lg p-3">
              <p className="text-xs font-bold text-red-600 mb-1.5">📞 {g.phone}</p>
              <div className="space-y-1">
                {g.members.map((m, i) => (
                  <div key={m.id} className="flex items-center gap-2 text-xs text-gray-700">
                    {i === 0
                      ? <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded font-bold text-[10px]">KEEP</span>
                      : <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded font-bold text-[10px]">MERGE</span>
                    }
                    <span className="font-semibold">{m.fullName}</span>
                    <span className="text-gray-400">{m.memberId}</span>
                    <span className="text-gray-400">· {m.payments} payments · {m.status}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {results && (
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {results.map((r, i) => (
            <p key={i} className={cn("text-xs font-mono", r.startsWith("✓") ? "text-green-700" : "text-red-600")}>{r}</p>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── One-time fix: Nithin #2678 + Gowtham #2656 dates ──────────────────── */

function FixSpecificPaymentsPanel() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<string[] | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const [done, setDone]       = useState(false);

  async function run() {
    setLoading(true); setResults(null); setError(null);
    try {
      const res  = await fetch("/api/admin/fix-payments", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setResults(data.results);
      setDone(true);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  if (done && results) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 space-y-1">
        <p className="text-sm font-bold text-green-700">✓ Payment dates corrected</p>
        {results.map((r, i) => <p key={i} className="text-xs text-green-700">{r}</p>)}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-dashed border-amber-300 p-5 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-gray-800">Fix Nithin & Gowtham Payment Dates</p>
          <p className="text-xs text-gray-500 mt-0.5">
            One-time fix — Nithin #2678: date → 21 May 2026, membership 21 May 2026 → 20 May 2027.
            Gowtham #2656: payment date → 29 Apr 2026.
          </p>
        </div>
        <button
          onClick={run} disabled={loading}
          className={cn(
            "flex-shrink-0 px-4 py-2 rounded-xl text-sm font-bold transition-all",
            loading ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-200"
          )}
        >
          {loading ? "Fixing…" : "Apply Fix"}
        </button>
      </div>
      {error && <ErrorBanner message={error} />}
    </div>
  );
}

/* ─── Fix receipt dates defaulted to import timestamp ───────────────────── */

function FixReceiptDatesPanel() {
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState<{ fixed: number; ghostJoinFixed: number; setActive: number; setExpired: number } | null>(null);
  const [error, setError]     = useState<string | null>(null);

  async function run() {
    setLoading(true); setResult(null); setError(null);
    try {
      const res  = await fetch("/api/import/fix-receipt-dates", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setResult(data);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="bg-white rounded-xl border border-dashed border-orange-200 p-5 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <ReceiptText className="h-4 w-4 text-orange-500" />
            Fix Receipt Dates
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            When an Excel date cell was text, the receipt <code className="bg-gray-100 px-1 rounded text-[11px]">date</code> defaulted to
            the import timestamp instead of the actual payment day. This finds every payment
            where <code className="bg-gray-100 px-1 rounded text-[11px]">date</code> is 30+ days <em>after</em>{" "}
            <code className="bg-gray-100 px-1 rounded text-[11px]">startDate</code> and sets it to{" "}
            <code className="bg-gray-100 px-1 rounded text-[11px]">startDate</code>. Member status is re-synced after.
          </p>
        </div>
        <button
          onClick={run} disabled={loading}
          className={cn(
            "flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
            loading ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-200"
          )}
        >
          <ReceiptText className="h-3.5 w-3.5" />
          {loading ? "Fixing…" : "Fix Dates"}
        </button>
      </div>
      {error && <ErrorBanner message={error} />}
      {result && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatPill icon={CheckCircle}   label="Dates fixed"    value={result.fixed}           color="text-orange-600 bg-orange-50" />
          <StatPill icon={CheckCircle}   label="Ghosts sorted"  value={result.ghostJoinFixed}  color="text-slate-600 bg-slate-50" />
          <StatPill icon={CheckCircle}   label="Set ACTIVE"     value={result.setActive}       color="text-green-600 bg-green-50" />
          <StatPill icon={AlertTriangle} label="Set EXPIRED"    value={result.setExpired}      color="text-amber-600 bg-amber-50" />
        </div>
      )}
    </div>
  );
}

/* ─── Backfill currentPackageId from most-recent payment ────────────────── */

function FixCurrentPackagePanel() {
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState<{ fixed: number; noPackageFound: number } | null>(null);
  const [error, setError]     = useState<string | null>(null);

  async function run() {
    setLoading(true); setResult(null); setError(null);
    try {
      const res  = await fetch("/api/import/fix-current-package", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setResult(data);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="bg-white rounded-xl border border-dashed border-violet-200 p-5 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <Link2 className="h-4 w-4 text-violet-500" />
            Link Current Package
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            Members imported from Excel have their status and expiry synced, but their
            <code className="bg-gray-100 px-1 rounded text-[11px] mx-1">currentPackageId</code>
            may still be null — so their profile shows "No active membership" even when they're ACTIVE.
            This scans every such member, finds their most recent payment with a package, and links it.
          </p>
        </div>
        <button
          onClick={run} disabled={loading}
          className={cn(
            "flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
            loading ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-violet-500 hover:bg-violet-600 text-white shadow-md shadow-violet-200"
          )}
        >
          <Link2 className="h-3.5 w-3.5" />
          {loading ? "Linking…" : "Link Packages"}
        </button>
      </div>
      {error && <ErrorBanner message={error} />}
      {result && (
        <div className="grid grid-cols-2 gap-3">
          <StatPill icon={CheckCircle}   label="Packages linked"   value={result.fixed}          color="text-violet-600 bg-violet-50" />
          <StatPill icon={AlertTriangle} label="No package found"  value={result.noPackageFound} color="text-amber-600 bg-amber-50" />
        </div>
      )}
    </div>
  );
}

/* ─── Fix member names: remove dots/slashes, separate by space ───────────── */

function FixNamesPanel() {
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState<{ fixed: number; sample: { from: string; to: string }[] } | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const [showSample, setShowSample] = useState(false);

  async function run() {
    setLoading(true); setResult(null); setError(null);
    try {
      const res  = await fetch("/api/import/fix-names", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setResult(data);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="bg-white rounded-xl border border-dashed border-blue-200 p-5 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <Type className="h-4 w-4 text-blue-500" />
            Fix Member Names
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            Replaces dots, slashes, commas and other special characters in member names with a space —
            e.g. <em>DHIVYA.V</em> becomes <em>DHIVYA V</em>, <em>MURALI/RAJAN</em> becomes <em>MURALI RAJAN</em>.
          </p>
        </div>
        <button
          onClick={run} disabled={loading}
          className={cn(
            "flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
            loading ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-blue-500 hover:bg-blue-600 text-white shadow-md shadow-blue-200"
          )}
        >
          <Type className="h-3.5 w-3.5" />
          {loading ? "Fixing…" : "Fix Names"}
        </button>
      </div>

      {error && <ErrorBanner message={error} />}

      {result && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
            <CheckCircle className="h-4 w-4" />
            {result.fixed} member name{result.fixed !== 1 ? "s" : ""} cleaned
          </div>
          {result.sample.length > 0 && (
            <div>
              <button
                onClick={() => setShowSample(v => !v)}
                className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900"
              >
                {showSample ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                Sample changes
              </button>
              {showSample && (
                <div className="mt-2 bg-blue-50 border border-blue-100 rounded-lg p-3 max-h-48 overflow-y-auto">
                  {result.sample.map((s, i) => (
                    <p key={i} className="text-[11px] font-mono text-blue-900 leading-relaxed">
                      {s.from} → {s.to}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Fuzzy name merge for ghost members ─────────────────────────────────── */

type MergeResult = {
  merged: number;
  ambiguous: number;
  noMatch: number;
  statusFixed: number;
  remainingGhosts: number;
  log: string[];
};

function FuzzyMergePanel() {
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState<MergeResult | null>(null);
  const [error, setError]       = useState<string | null>(null);
  const [showLog, setShowLog]   = useState(false);

  async function run() {
    if (!confirm(
      "This will fuzzy-match IMP-* ghost members to real members using name similarity " +
      "(initials, Levenshtein distance, word overlap), reassign their payments, and delete the ghosts. " +
      "Ambiguous or uncertain matches are left untouched. Continue?"
    )) return;
    setLoading(true); setResult(null); setError(null);
    try {
      const res  = await fetch("/api/import/merge-ghosts", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Merge failed");
      setResult(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-dashed border-teal-200 p-5 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <GitMerge className="h-4 w-4 text-teal-600" />
            Smart Ghost Merge (Fuzzy Names)
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            Matches <code className="bg-gray-100 px-1 rounded text-teal-700 text-[11px]">IMP-*</code> ghost
            members to real members using initials (<em>DHIVYA.V → DHIVYA VASANTH</em>),
            spelling variants (<em>KARTHIK → KARTHICK</em>), and word overlap.
            Only confident, unambiguous matches are merged. Member status is re-synced after.
          </p>
        </div>
        <button
          onClick={run}
          disabled={loading}
          className={cn(
            "flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
            loading
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-teal-600 hover:bg-teal-700 text-white shadow-md shadow-teal-200"
          )}
        >
          <GitMerge className="h-3.5 w-3.5" />
          {loading ? "Merging…" : "Run Merge"}
        </button>
      </div>

      {error && <ErrorBanner message={error} />}

      {result && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <StatPill icon={GitMerge}      label="Merged"     value={result.merged}          color="text-teal-700 bg-teal-50" />
            <StatPill icon={CheckCircle}   label="Status synced" value={result.statusFixed}  color="text-green-600 bg-green-50" />
            <StatPill icon={AlertTriangle} label="Ambiguous"  value={result.ambiguous}        color="text-amber-600 bg-amber-50" />
            <StatPill icon={XCircle}       label="No match"   value={result.noMatch}          color="text-gray-500 bg-gray-50" />
            <StatPill icon={Users}         label="Ghosts left" value={result.remainingGhosts} color="text-slate-600 bg-slate-50" />
          </div>

          {result.log.length > 0 && (
            <div>
              <button
                onClick={() => setShowLog((v) => !v)}
                className="flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-900"
              >
                {showLog ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                {result.log.length} merge decisions
              </button>
              {showLog && (
                <div className="mt-2 bg-teal-50 border border-teal-100 rounded-lg p-3 max-h-60 overflow-y-auto">
                  {result.log.map((line, i) => (
                    <p key={i} className="text-[11px] text-teal-900 font-mono leading-relaxed">{line}</p>
                  ))}
                  {result.log.length === 200 && (
                    <p className="text-[11px] text-teal-600 mt-1 italic">Showing first 200 entries…</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Ghost member re-matcher ────────────────────────────────────────────── */

function RematchPanel() {
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState<RematchResult | null>(null);
  const [error, setError]       = useState<string | null>(null);
  const [showNames, setShowNames] = useState(false);

  async function handleRematch() {
    if (!confirm("This will re-link all IMP-* ghost receipts to real members using name matching, then delete the ghost member records. Continue?")) return;
    setLoading(true); setResult(null); setError(null);
    try {
      const res = await fetch("/api/import/rematch", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Rematch failed");
      setResult(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-dashed border-violet-200 p-5 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-violet-500" />
            Fix Ghost Members
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            Re-links receipts that were imported before name-matching existed.
            Matches <code className="bg-gray-100 px-1 rounded text-violet-700 text-[11px]">IMP-*</code> ghost
            members to real members by name, then removes the ghost records.
          </p>
        </div>
        <button
          onClick={handleRematch}
          disabled={loading}
          className={cn(
            "flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
            loading
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-violet-500 hover:bg-violet-600 text-white shadow-md shadow-violet-200"
          )}
        >
          <Wand2 className="h-3.5 w-3.5" />
          {loading ? "Rematching…" : "Run Re-match"}
        </button>
      </div>

      {error && <ErrorBanner message={error} />}

      {result && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatPill icon={CheckCircle} label="Rematched"  value={result.rematched}   color="text-green-600 bg-green-50" />
            <StatPill icon={XCircle}     label="Deleted"    value={result.deleted}     color="text-violet-600 bg-violet-50" />
            <StatPill icon={AlertTriangle} label="Unresolved" value={result.unresolved} color="text-amber-600 bg-amber-50" />
            <StatPill icon={Users}       label="Ghosts found" value={result.ghostsFound} color="text-gray-600 bg-gray-50" />
          </div>
          {result.unresolvedNames.length > 0 && (
            <div>
              <button
                onClick={() => setShowNames((v) => !v)}
                className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 hover:text-amber-900"
              >
                {showNames ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                {result.unresolvedNames.length} still unresolved
              </button>
              {showNames && (
                <div className="mt-2 bg-amber-50 border border-amber-100 rounded-lg p-3 max-h-48 overflow-y-auto">
                  {result.unresolvedNames.map((n, i) => (
                    <p key={i} className="text-[11px] text-amber-800 font-mono leading-relaxed">{n}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Fix ghost members → INACTIVE ──────────────────────────────────────── */

function FixGhostsPanel() {
  const [loading, setLoading] = useState(false);
  const [updated, setUpdated] = useState<number | null>(null);
  const [error, setError]     = useState<string | null>(null);

  async function run() {
    if (!confirm("Mark all IMP-* ghost members as INACTIVE? This will fix the inflated active member count.")) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/import/fix-ghosts", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setUpdated(data.updated);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="bg-white rounded-xl border border-dashed border-red-200 p-5 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <UserX className="h-4 w-4 text-red-500" />
            Mark Ghost Members Inactive
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            Sets all <code className="bg-gray-100 px-1 rounded text-red-600 text-[11px]">IMP-*</code> ghost members
            to <strong>INACTIVE</strong> so they don't inflate the active member count on your dashboard.
          </p>
        </div>
        <button
          onClick={run} disabled={loading}
          className={cn(
            "flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
            loading ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-red-500 hover:bg-red-600 text-white shadow-md shadow-red-200"
          )}
        >
          <UserX className="h-3.5 w-3.5" />
          {loading ? "Fixing…" : "Run Fix"}
        </button>
      </div>
      {error && <ErrorBanner message={error} />}
      {updated !== null && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
          <CheckCircle className="h-4 w-4" />
          {updated} ghost members marked inactive
        </div>
      )}
    </div>
  );
}

/* ─── Backfill dates + sync member status ────────────────────────────────── */

function BackfillPanel() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [company, setCompany] = useState("YOS_FITNESS");
  const [file, setFile]       = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState<BackfillResult | null>(null);
  const [error, setError]     = useState<string | null>(null);

  async function run() {
    if (!file) return;
    setLoading(true); setResult(null); setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("company", company);
      const res = await fetch("/api/import/backfill", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setResult(data);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="bg-white rounded-xl border border-dashed border-green-200 p-5 space-y-4">
      <div>
        <p className="text-sm font-bold text-gray-800 flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-green-600" />
          Backfill Dates & Sync Member Status
        </p>
        <p className="text-xs text-gray-500 mt-0.5">
          Re-upload a receipts file to fill in membership start/end dates on existing payments,
          then automatically sets each member to <strong>ACTIVE</strong> or <strong>EXPIRED</strong>
          based on their latest receipt end date.
        </p>
      </div>

      {/* Company */}
      <div className="flex gap-3">
        {[
          { value: "YOS_FITNESS", label: "Yos Fitness", color: "border-orange-400 bg-orange-50 text-orange-700" },
          { value: "YOS_FITNESS_STUDIO", label: "Yos Studio", color: "border-indigo-400 bg-indigo-50 text-indigo-700" },
        ].map((c) => (
          <button key={c.value} onClick={() => setCompany(c.value)}
            className={cn("px-4 py-2 rounded-xl border-2 text-sm font-semibold transition-all",
              company === c.value ? c.color : "border-gray-200 text-gray-500 hover:border-gray-300")}>
            {c.label}
          </button>
        ))}
      </div>

      {/* File picker */}
      <div
        onClick={() => fileRef.current?.click()}
        className={cn("border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors",
          file ? "border-green-400 bg-green-50" : "border-gray-200 hover:border-green-300 hover:bg-green-50/30")}>
        <Upload className={cn("h-5 w-5 mx-auto mb-1", file ? "text-green-500" : "text-gray-400")} />
        {file
          ? <p className="text-sm font-semibold text-green-700">{file.name}</p>
          : <p className="text-sm text-gray-500">Click to choose the same receipts .xlsx file</p>}
      </div>
      <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden"
        onChange={(e) => { setFile(e.target.files?.[0] ?? null); setResult(null); }} />

      <button onClick={run} disabled={!file || loading}
        className={cn("w-full py-3 rounded-xl font-bold text-sm transition-all",
          !file || loading ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                           : "bg-green-600 hover:bg-green-700 text-white shadow-md shadow-green-200")}>
        {loading ? "Processing… this may take a minute" : "Backfill Dates & Sync Status"}
      </button>

      {error && <ErrorBanner message={error} />}
      {result && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatPill icon={CheckCircle}   label="Dates updated"   value={result.datesUpdated}      color="text-green-600 bg-green-50" />
          <StatPill icon={CheckCircle}   label="Set ACTIVE"      value={result.membersSetActive}  color="text-blue-600 bg-blue-50" />
          <StatPill icon={AlertTriangle} label="Set EXPIRED"     value={result.membersSetExpired} color="text-amber-600 bg-amber-50" />
        </div>
      )}
    </div>
  );
}

/* ─── Sync member expiry from existing payments (no file needed) ─────────── */

type SyncResult = { membersProcessed: number; setActive: number; setExpired: number; errors: number };

function SyncExpiryPanel() {
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState<SyncResult | null>(null);
  const [error, setError]     = useState<string | null>(null);

  async function run() {
    setLoading(true); setResult(null); setError(null);
    try {
      const res  = await fetch("/api/import/sync-expiry", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setResult(data);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="bg-white rounded-xl border border-dashed border-sky-200 p-5 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <Zap className="h-4 w-4 text-sky-500" />
            Sync Member Expiry Dates
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            No file needed — reads expiry dates already in your payment records and writes them
            back to each member profile. Sets status to <strong>ACTIVE</strong> or <strong>EXPIRED</strong> automatically.
          </p>
        </div>
        <button
          onClick={run} disabled={loading}
          className={cn(
            "flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
            loading ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-sky-500 hover:bg-sky-600 text-white shadow-md shadow-sky-200"
          )}
        >
          <Zap className="h-3.5 w-3.5" />
          {loading ? "Syncing…" : "Sync Now"}
        </button>
      </div>
      {error && <ErrorBanner message={error} />}
      {result && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatPill icon={CheckCircle}   label="Processed"   value={result.membersProcessed} color="text-sky-600 bg-sky-50" />
          <StatPill icon={CheckCircle}   label="Set ACTIVE"  value={result.setActive}        color="text-green-600 bg-green-50" />
          <StatPill icon={AlertTriangle} label="Set EXPIRED" value={result.setExpired}       color="text-amber-600 bg-amber-50" />
        </div>
      )}
    </div>
  );
}

/* ─── Fix members with no payments → PROSPECT ───────────────────────────── */

function FixNoPaymentPanel() {
  const [loading, setLoading] = useState(false);
  const [updated, setUpdated] = useState<number | null>(null);
  const [error, setError]     = useState<string | null>(null);

  async function run() {
    if (!confirm("This will mark all members with no payment records as PROSPECT instead of ACTIVE. Continue?")) return;
    setLoading(true); setError(null);
    try {
      const res  = await fetch("/api/import/fix-no-payment", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setUpdated(data.updated);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="bg-white rounded-xl border border-dashed border-violet-200 p-5 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-violet-500" />
            Fix Members With No Payments → Prospect
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            Members imported from the Member Master but with no receipt records were incorrectly
            set to <strong>ACTIVE</strong>. This sets them to <strong>PROSPECT</strong> — they applied
            but never paid.
          </p>
        </div>
        <button
          onClick={run} disabled={loading}
          className={cn(
            "flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
            loading ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-violet-500 hover:bg-violet-600 text-white shadow-md shadow-violet-200"
          )}
        >
          <UserCheck className="h-3.5 w-3.5" />
          {loading ? "Fixing…" : "Run Fix"}
        </button>
      </div>
      {error && <ErrorBanner message={error} />}
      {updated !== null && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
          <CheckCircle className="h-4 w-4" />
          {updated} members changed to Prospect
        </div>
      )}
    </div>
  );
}

/* ─── Fix corrupted dates (year 3036, 3015, 2105 etc.) ──────────────────── */

function FixDatesPanel() {
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState<{ paymentsFixed: number; membersFixed: number; errors: number; total: number } | null>(null);
  const [error, setError]     = useState<string | null>(null);

  async function run() {
    if (!confirm("This will correct payment dates with impossible years (e.g. 3036 → 2026, 3015 → 2015, 2105 → 2025). Continue?")) return;
    setLoading(true); setError(null);
    try {
      const res  = await fetch("/api/import/fix-dates", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setResult(data);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="bg-white rounded-xl border border-dashed border-red-200 p-5 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <CalendarX className="h-4 w-4 text-red-500" />
            Fix Corrupted Dates
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            Some receipts have impossible years (3036, 3015, 2105) from data entry errors in the
            original Excel. This corrects them to the nearest logical year — 3036 → 2026,
            3015 → 2015, 2105 → 2025 — on both payment records and member expiry dates.
          </p>
        </div>
        <button
          onClick={run} disabled={loading}
          className={cn(
            "flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
            loading ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-red-500 hover:bg-red-600 text-white shadow-md shadow-red-200"
          )}
        >
          <CalendarX className="h-3.5 w-3.5" />
          {loading ? "Fixing…" : "Fix Dates"}
        </button>
      </div>
      {error && <ErrorBanner message={error} />}
      {result && (
        <div className="grid grid-cols-3 gap-3">
          <StatPill icon={CheckCircle}   label="Payments fixed" value={result.paymentsFixed} color="text-green-600 bg-green-50" />
          <StatPill icon={CheckCircle}   label="Members fixed"  value={result.membersFixed}  color="text-blue-600 bg-blue-50" />
          <StatPill icon={AlertTriangle} label="Errors"         value={result.errors}         color="text-red-600 bg-red-50" />
        </div>
      )}
    </div>
  );
}

function FixSundayAbsencesPanel() {
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState<{ deleted: number; message: string } | null>(null);
  const [error, setError]     = useState<string | null>(null);

  async function run() {
    setLoading(true); setError(null);
    try {
      const res  = await fetch("/api/admin/fix-sunday-absences", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setResult(data);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="bg-white rounded-xl border border-dashed border-orange-200 p-5 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <CalendarX className="h-4 w-4 text-orange-500" />
            Remove Sunday Absences
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            Deletes all ABSENT attendance records that fall on a Sunday. Sundays are no longer tracked, so these entries are invalid.
          </p>
        </div>
        <button
          onClick={run} disabled={loading}
          className={cn(
            "flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
            loading ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-200"
          )}
        >
          <CalendarX className="h-3.5 w-3.5" />
          {loading ? "Removing…" : "Remove"}
        </button>
      </div>
      {error && <ErrorBanner message={error} />}
      {result && (
        <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3">
          <p className="text-sm font-semibold text-green-700">{result.message}</p>
        </div>
      )}
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
