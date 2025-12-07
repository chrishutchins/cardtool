"use client";

import { useState, useTransition } from "react";

interface Currency {
  id: string;
  name: string;
  code: string;
}

interface ScrapedValue {
  sourceName: string;
  value: number;
  matchedCode: string | null;
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
  const [isPending, startTransition] = useTransition();

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
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to scrape URL");
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = () => {
    const updates: Array<{ currencyId: string; valueCents: number }> = [];
    
    for (const scraped of scrapedValues) {
      if (scraped.matchedCode) {
        const currency = codeToCurrency.get(scraped.matchedCode);
        if (currency) {
          // Convert from cents-per-point (e.g., 1.5) to our cents format (150)
          updates.push({
            currencyId: currency.id,
            valueCents: Math.round(scraped.value * 100),
          });
        }
      }
    }
    
    if (updates.length === 0) {
      setError("No matching currencies found to import");
      return;
    }
    
    startTransition(async () => {
      await onImport(updates);
      setScrapedValues([]);
    });
  };

  const matchedCount = scrapedValues.filter((v) => v.matchedCode && codeToCurrency.has(v.matchedCode)).length;

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

      {scrapedValues.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-400">
              Found <span className="text-white font-medium">{scrapedValues.length}</span> values,{" "}
              <span className="text-emerald-400 font-medium">{matchedCount}</span> matched to your currencies
            </p>
            <button
              onClick={handleImport}
              disabled={isPending || matchedCount === 0}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
            >
              {isPending ? "Importing..." : `Import ${matchedCount} Values`}
            </button>
          </div>

          <div className="overflow-hidden rounded-lg border border-zinc-700 max-h-64 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-800 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400">Source Name</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-zinc-400">Value (¢)</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400">Matched To</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-700">
                {scrapedValues.map((scraped, i) => {
                  const matchedCurrency = scraped.matchedCode ? codeToCurrency.get(scraped.matchedCode) : null;
                  return (
                    <tr key={i} className={matchedCurrency ? "bg-emerald-900/10" : ""}>
                      <td className="px-3 py-2 text-zinc-300">{scraped.sourceName}</td>
                      <td className="px-3 py-2 text-right text-white font-mono">{scraped.value.toFixed(2)}</td>
                      <td className="px-3 py-2">
                        {matchedCurrency ? (
                          <span className="text-emerald-400">{matchedCurrency.name}</span>
                        ) : (
                          <span className="text-zinc-500">Not matched</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

