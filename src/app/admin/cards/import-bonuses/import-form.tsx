"use client";

import { useState, useTransition } from "react";

interface ImportBonusFormProps {
  onImport: (csvData: string) => Promise<{ success: number; errors: string[] }>;
}

export function ImportBonusForm({ onImport }: ImportBonusFormProps) {
  const [csvData, setCsvData] = useState("");
  const [results, setResults] = useState<{ success: number; errors: string[] } | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvData.trim()) return;

    startTransition(async () => {
      const result = await onImport(csvData);
      setResults(result);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <textarea
        value={csvData}
        onChange={(e) => setCsvData(e.target.value)}
        placeholder="Paste your CSV data here...&#10;&#10;card_slug,spend_requirement,time_period_months,component_type,points_amount,currency_code,cash_amount,benefit_description,default_benefit_value&#10;chase-sapphire-preferred,4000,3,points,60000,UR,,,"
        className="w-full h-64 rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-3 text-white text-sm font-mono placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
        required
      />

      {results && (
        <div className={`rounded-lg p-4 ${results.errors.length > 0 ? "bg-amber-900/20 border border-amber-700/50" : "bg-green-900/20 border border-green-700/50"}`}>
          <p className={`font-medium ${results.errors.length > 0 ? "text-amber-300" : "text-green-300"}`}>
            Import Complete: {results.success} row{results.success !== 1 ? "s" : ""} imported successfully
          </p>
          {results.errors.length > 0 && (
            <div className="mt-2">
              <p className="text-amber-400 text-sm font-medium mb-1">Errors ({results.errors.length}):</p>
              <ul className="text-amber-300 text-sm space-y-1 max-h-48 overflow-y-auto">
                {results.errors.map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending || !csvData.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? "Importing..." : "Import Welcome Bonuses"}
        </button>
        <button
          type="button"
          onClick={() => {
            setCsvData("");
            setResults(null);
          }}
          className="px-4 py-2 text-zinc-400 hover:text-white"
        >
          Clear
        </button>
      </div>
    </form>
  );
}








