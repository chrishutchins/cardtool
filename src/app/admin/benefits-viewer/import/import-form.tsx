"use client";

import { useState, useTransition } from "react";

interface ImportResult {
  success: number;
  matched: number;
  skipped: number;
  errors: string[];
}

interface BenefitsImportFormProps {
  onImport: (formData: FormData) => Promise<ImportResult>;
}

export function BenefitsImportForm({ onImport }: BenefitsImportFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file?.size) return;

    startTransition(async () => {
      const formData = new FormData();
      formData.set("file", file);
      const res = await onImport(formData);
      setResult(res);
    });
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">xlsx file</label>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setResult(null);
            }}
            className="block w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-zinc-700 file:text-white"
          />
        </div>
        <button
          type="submit"
          disabled={isPending || !file?.size}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? "Importing…" : "Import benefits"}
        </button>
      </form>

      {result && (
        <div className="mt-4 space-y-2">
          <div className="rounded-lg p-4 bg-zinc-800 border border-zinc-700">
            <p className="text-zinc-300">
              Imported <strong className="text-white">{result.success}</strong> benefit(s) from{" "}
              <strong className="text-white">{result.matched}</strong> matched sheet(s).
              {result.skipped > 0 && (
                <span className="text-zinc-500"> {result.skipped} sheet(s) skipped (no matching card).</span>
              )}
            </p>
          </div>
          {result.errors.length > 0 && (
            <div className="rounded-lg bg-red-900/30 border border-red-800 p-4">
              <p className="text-red-400 font-medium mb-2">{result.errors.length} error(s):</p>
              <ul className="list-disc list-inside text-sm text-red-300 space-y-1 max-h-48 overflow-y-auto">
                {result.errors.slice(0, 20).map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
                {result.errors.length > 20 && (
                  <li>… and {result.errors.length - 20} more</li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
