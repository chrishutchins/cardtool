"use client";

import { useState, useTransition } from "react";

interface ImportCreditsFormProps {
  onImport: (csvData: string) => Promise<{ success: number; errors: string[] }>;
}

export function ImportCreditsForm({ onImport }: ImportCreditsFormProps) {
  const [csvData, setCsvData] = useState("");
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ success: number; errors: string[] } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvData.trim()) return;

    startTransition(async () => {
      const res = await onImport(csvData);
      setResult(res);
    });
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          value={csvData}
          onChange={(e) => setCsvData(e.target.value)}
          rows={10}
          placeholder="Paste CSV data here..."
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none font-mono text-sm"
        />
        <button
          type="submit"
          disabled={isPending || !csvData.trim()}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? "Importing..." : "Import Credits"}
        </button>
      </form>

      {result && (
        <div className="mt-4 space-y-2">
          <div className={`rounded-lg p-4 ${result.success > 0 ? 'bg-emerald-900/30 border border-emerald-800' : 'bg-zinc-800'}`}>
            <p className="text-emerald-400 font-medium">
              Successfully imported {result.success} credit{result.success !== 1 ? 's' : ''}
            </p>
          </div>
          {result.errors.length > 0 && (
            <div className="rounded-lg bg-red-900/30 border border-red-800 p-4">
              <p className="text-red-400 font-medium mb-2">
                {result.errors.length} error{result.errors.length !== 1 ? 's' : ''}:
              </p>
              <ul className="list-disc list-inside text-sm text-red-300 space-y-1">
                {result.errors.map((error, idx) => (
                  <li key={idx}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

