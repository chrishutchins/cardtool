"use client";

import { useState, useTransition } from "react";

interface Currency {
  id: string;
  name: string;
  code: string;
  template_value_cents?: number;
}

interface ScrapedValue {
  sourceName: string;
  value: number;
  matchedCode: string | null;
}

interface ValueChange {
  currency: Currency;
  oldValue: number | null;
  newValue: number;
  change: "increase" | "decrease" | "new" | "same";
}

interface Props {
  currencies: Currency[];
  sourceUrl: string | null;
  onImport: (updates: Array<{ currencyId: string; valueCents: number }>) => Promise<void>;
}

export function UrlImporter({ currencies, sourceUrl, onImport }: Props) {
  const [url, setUrl] = useState(sourceUrl ?? "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scrapedValues, setScrapedValues] = useState<ScrapedValue[]>([]);
  const [changes, setChanges] = useState<ValueChange[]>([]);
  const [isPending, startTransition] = useTransition();
  const [importSuccess, setImportSuccess] = useState(false);

  // Build code -> currency mapping
  const codeToCurrency = new Map<string, Currency>();
  for (const currency of currencies) {
    codeToCurrency.set(currency.code, currency);
  }

  const handleScrape = async () => {
    if (!url) return;
    
    setIsLoading(true);
    setError(null);
    setScrapedValues([]);
    setChanges([]);
    setImportSuccess(false);
    
    try {
      const response = await fetch("/api/scrape-point-values", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to scrape URL");
      }
      
      setScrapedValues(data.values);
      
      if (data.values.length === 0) {
        setError("No point values found on this page. Try a different URL.");
        return;
      }
      
      // Calculate changes
      const changeList: ValueChange[] = [];
      
      for (const scraped of data.values as ScrapedValue[]) {
        if (scraped.matchedCode) {
          const currency = codeToCurrency.get(scraped.matchedCode);
          if (currency) {
            const newValueCents = Math.round(scraped.value * 100);
            const oldValueCents = currency.template_value_cents ?? null;
            
            let change: ValueChange["change"] = "same";
            if (oldValueCents === null) {
              change = "new";
            } else if (newValueCents > oldValueCents) {
              change = "increase";
            } else if (newValueCents < oldValueCents) {
              change = "decrease";
            }
            
            changeList.push({
              currency,
              oldValue: oldValueCents,
              newValue: newValueCents,
              change,
            });
          }
        }
      }
      
      // Sort: changes first, then same values
      changeList.sort((a, b) => {
        const order = { increase: 0, decrease: 1, new: 2, same: 3 };
        return order[a.change] - order[b.change];
      });
      
      setChanges(changeList);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to scrape URL");
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = () => {
    const updates = changes
      .filter((c) => c.change !== "same")
      .map((c) => ({
        currencyId: c.currency.id,
        valueCents: c.newValue,
      }));
    
    if (updates.length === 0) {
      setError("No changes to import");
      return;
    }
    
    startTransition(async () => {
      await onImport(updates);
      setImportSuccess(true);
    });
  };

  const changesCount = changes.filter((c) => c.change !== "same").length;
  const increaseCount = changes.filter((c) => c.change === "increase").length;
  const decreaseCount = changes.filter((c) => c.change === "decrease").length;
  const newCount = changes.filter((c) => c.change === "new").length;

  const formatValue = (cents: number | null) => {
    if (cents === null) return "—";
    return `${(cents / 100).toFixed(2)}¢`;
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://frequentmiler.com/reasonable-redemption-values-rrvs/"
          className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none text-sm"
        />
        <button
          onClick={handleScrape}
          disabled={isLoading || !url}
          className="rounded-lg bg-zinc-700 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-600 disabled:opacity-50 transition-colors whitespace-nowrap"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Scanning...
            </span>
          ) : sourceUrl ? (
            "Refresh Values"
          ) : (
            "Scan URL"
          )}
        </button>
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-900/20 border border-red-900/50 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {importSuccess && (
        <div className="text-sm text-emerald-400 bg-emerald-900/20 border border-emerald-900/50 rounded-lg px-3 py-2">
          ✓ Successfully imported {changesCount} value{changesCount !== 1 ? "s" : ""}
        </div>
      )}

      {changes.length > 0 && !importSuccess && (
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3 text-sm">
              <span className="text-zinc-400">
                Found <span className="text-white font-medium">{changes.length}</span> matched currencies
              </span>
              {changesCount > 0 ? (
                <span className="text-zinc-500">|</span>
              ) : null}
              {increaseCount > 0 && (
                <span className="text-emerald-400">
                  ↑ {increaseCount} increase{increaseCount !== 1 ? "s" : ""}
                </span>
              )}
              {decreaseCount > 0 && (
                <span className="text-red-400">
                  ↓ {decreaseCount} decrease{decreaseCount !== 1 ? "s" : ""}
                </span>
              )}
              {newCount > 0 && (
                <span className="text-amber-400">
                  + {newCount} new
                </span>
              )}
              {changesCount === 0 && (
                <span className="text-zinc-500">All values match</span>
              )}
            </div>
            {changesCount > 0 && (
              <button
                onClick={handleImport}
                disabled={isPending}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
              >
                {isPending ? "Applying..." : `Apply ${changesCount} Change${changesCount !== 1 ? "s" : ""}`}
              </button>
            )}
          </div>

          <div className="overflow-hidden rounded-lg border border-zinc-700 max-h-80 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-800 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400">Currency</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-zinc-400">Current</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-zinc-400"></th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-zinc-400">New</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-zinc-400">Diff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-700">
                {changes.map((change) => {
                  const diff = change.oldValue !== null 
                    ? ((change.newValue - change.oldValue) / 100).toFixed(2)
                    : null;
                  
                  return (
                    <tr 
                      key={change.currency.id} 
                      className={
                        change.change === "increase" ? "bg-emerald-900/10" :
                        change.change === "decrease" ? "bg-red-900/10" :
                        change.change === "new" ? "bg-amber-900/10" :
                        ""
                      }
                    >
                      <td className="px-3 py-2 text-zinc-300">{change.currency.name}</td>
                      <td className="px-3 py-2 text-right text-zinc-400 font-mono">
                        {formatValue(change.oldValue)}
                      </td>
                      <td className="px-3 py-2 text-center text-zinc-500">
                        {change.change !== "same" && "→"}
                      </td>
                      <td className={`px-3 py-2 text-right font-mono ${
                        change.change === "increase" ? "text-emerald-400" :
                        change.change === "decrease" ? "text-red-400" :
                        change.change === "new" ? "text-amber-400" :
                        "text-zinc-400"
                      }`}>
                        {formatValue(change.newValue)}
                      </td>
                      <td className={`px-3 py-2 text-right font-mono text-xs ${
                        change.change === "increase" ? "text-emerald-400" :
                        change.change === "decrease" ? "text-red-400" :
                        "text-zinc-500"
                      }`}>
                        {change.change === "increase" && `+${diff}¢`}
                        {change.change === "decrease" && `${diff}¢`}
                        {change.change === "new" && "new"}
                        {change.change === "same" && "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Show unmatched values if there are any */}
      {scrapedValues.length > 0 && changes.length > 0 && (
        (() => {
          const unmatched = scrapedValues.filter(
            (v) => !v.matchedCode || !codeToCurrency.has(v.matchedCode)
          );
          if (unmatched.length === 0) return null;
          
          return (
            <details className="text-sm">
              <summary className="text-zinc-500 cursor-pointer hover:text-zinc-400">
                {unmatched.length} unmatched value{unmatched.length !== 1 ? "s" : ""} (click to expand)
              </summary>
              <div className="mt-2 pl-4 border-l border-zinc-700 space-y-1">
                {unmatched.map((v, i) => (
                  <div key={i} className="text-zinc-500">
                    {v.sourceName}: {v.value.toFixed(2)}¢
                  </div>
                ))}
              </div>
            </details>
          );
        })()
      )}
    </div>
  );
}
