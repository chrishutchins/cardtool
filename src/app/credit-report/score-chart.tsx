"use client";

import { useState, useMemo } from "react";
import { ChevronDown, ChevronUp, ExternalLink, Lock } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

type CreditBureau = "equifax" | "experian" | "transunion";
type ScoreType = "fico_8" | "fico_9" | "fico_bankcard_8" | "vantage_3" | "vantage_4" | "other";

interface CreditScore {
  id: string;
  bureau: CreditBureau;
  score_type: ScoreType;
  score: number;
  score_date: string | null;
}

interface ScoreChartProps {
  scores: CreditScore[];
  latestScores: Record<string, CreditScore>;
}

// Colors only used for chart lines, not headers
const BUREAU_COLORS: Record<CreditBureau, string> = {
  equifax: "#3b82f6", // blue
  experian: "#ef4444", // red
  transunion: "#22c55e", // green
};

const BUREAU_LABELS: Record<CreditBureau, string> = {
  equifax: "Equifax",
  experian: "Experian",
  transunion: "TransUnion",
};

const SCORE_TYPE_LABELS: Record<ScoreType, string> = {
  fico_8: "FICO 8",
  fico_9: "FICO 9",
  fico_bankcard_8: "FICO Bankcard 8",
  vantage_3: "VantageScore 3",
  vantage_4: "VantageScore 4",
  other: "Other",
};

// Primary scores always shown
const PRIMARY_SCORE_TYPES: ScoreType[] = ["fico_8"];
// Other scores hidden by default
const OTHER_SCORE_TYPES: ScoreType[] = ["fico_9", "fico_bankcard_8", "vantage_3"];
const BUREAUS: CreditBureau[] = ["equifax", "experian", "transunion"];

const TIME_RANGES = [
  { label: "6 mo", months: 6 },
  { label: "1 yr", months: 12 },
  { label: "2 yr", months: 24 },
  { label: "All", months: 0 },
];

// Import sources data
interface ImportSource {
  name: string;
  url: string;
  cardholderOnly?: boolean;
  recommended?: boolean;
}

interface ImportRow {
  label: string;
  sources: {
    equifax: ImportSource[];
    experian: ImportSource[];
    transunion: ImportSource[];
  };
}

const IMPORT_SOURCES: ImportRow[] = [
  {
    label: "Credit Report",
    sources: {
      equifax: [{ name: "Equifax", url: "https://www.equifax.com/personal/credit-report-services/free-credit-reports/", recommended: true }],
      experian: [{ name: "Experian", url: "https://www.experian.com/credit/credit-report/", recommended: true }],
      transunion: [{ name: "TransUnion", url: "https://www.transunion.com/annual-credit-report", recommended: true }],
    },
  },
  {
    label: "FICO 8",
    sources: {
      equifax: [{ name: "myFICO", url: "https://www.myfico.com/", recommended: true }],
      experian: [
        { name: "Experian", url: "https://www.experian.com/credit/credit-report/", recommended: true },
        { name: "American Express", url: "https://www.americanexpress.com/us/credit-cards/features-benefits/free-credit-score/" },
      ],
      transunion: [
        { name: "Capital One", url: "https://www.capitalone.com/creditwise/", recommended: true },
        { name: "Bank of America", url: "https://www.bankofamerica.com/", cardholderOnly: true },
      ],
    },
  },
  {
    label: "VantageScore 3.0",
    sources: {
      equifax: [
        { name: "Equifax", url: "https://www.equifax.com/personal/credit-report-services/free-credit-reports/", recommended: true },
        { name: "Credit Karma", url: "https://www.creditkarma.com/free-credit-score", recommended: true },
      ],
      experian: [{ name: "Chase", url: "https://www.chase.com/personal/financial-tools/monitor/free-credit-score", recommended: true }],
      transunion: [
        { name: "Credit Karma", url: "https://www.creditkarma.com/free-credit-score", recommended: true },
        { name: "US Bank", url: "https://www.usbank.com/online-mobile-banking/get-your-free-credit-score.html", cardholderOnly: true },
      ],
    },
  },
  {
    label: "FICO 8 Bankcard",
    sources: {
      equifax: [{ name: "Citi", url: "https://www.cardbenefits.citi.com/en/Products/FICO-Score", cardholderOnly: true }],
      experian: [],
      transunion: [],
    },
  },
  {
    label: "FICO 9",
    sources: {
      equifax: [],
      experian: [{ name: "Wells Fargo", url: "https://www.wellsfargo.com/goals-credit/smarter-credit/credit-101/fico/", cardholderOnly: true }],
      transunion: [],
    },
  },
];

function getScoreColor(score: number): string {
  if (score >= 800) return "text-emerald-400";
  if (score >= 740) return "text-green-400";
  if (score >= 670) return "text-yellow-400";
  if (score >= 580) return "text-orange-400";
  return "text-red-400";
}

function getScoreLabel(score: number): string {
  if (score >= 800) return "Excellent";
  if (score >= 740) return "Very Good";
  if (score >= 670) return "Good";
  if (score >= 580) return "Fair";
  return "Poor";
}

export function ScoreChart({ scores, latestScores }: ScoreChartProps) {
  const [selectedScoreType, setSelectedScoreType] = useState<ScoreType>("fico_8");
  const [selectedTimeRange, setSelectedTimeRange] = useState(24); // months, 0 = all
  const [showHistory, setShowHistory] = useState(false);
  const [showOtherScores, setShowOtherScores] = useState(false);
  const [showImportSources, setShowImportSources] = useState(false);

  // Get available score types (ones that have data)
  const availableScoreTypes = useMemo(() => {
    const types = new Set<ScoreType>();
    scores.forEach((s) => types.add(s.score_type));
    // Also check latestScores
    Object.values(latestScores).forEach((s) => types.add(s.score_type));
    return [...PRIMARY_SCORE_TYPES, ...OTHER_SCORE_TYPES].filter((t) => types.has(t));
  }, [scores, latestScores]);

  const availablePrimaryTypes = useMemo(() => 
    PRIMARY_SCORE_TYPES.filter((t) => availableScoreTypes.includes(t)),
    [availableScoreTypes]
  );

  const availableOtherTypes = useMemo(() => 
    OTHER_SCORE_TYPES.filter((t) => availableScoreTypes.includes(t)),
    [availableScoreTypes]
  );

  // Check if there's any score history
  const hasHistory = scores.length > 0;

  // Filter scores by selected type and time range
  const filteredScores = useMemo(() => {
    let filtered = scores.filter((s) => s.score_type === selectedScoreType);

    if (selectedTimeRange > 0) {
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - selectedTimeRange);
      filtered = filtered.filter(
        (s) => s.score_date && new Date(s.score_date) >= cutoff
      );
    }

    return filtered;
  }, [scores, selectedScoreType, selectedTimeRange]);

  // Transform data for Recharts
  const chartData = useMemo(() => {
    // Group by date
    const byDate = new Map<string, Record<string, number>>();

    filteredScores.forEach((score) => {
      if (!score.score_date) return;
      const dateKey = score.score_date.slice(0, 7); // YYYY-MM

      if (!byDate.has(dateKey)) {
        byDate.set(dateKey, {});
      }
      byDate.get(dateKey)![score.bureau] = score.score;
    });

    // Convert to array and sort
    return Array.from(byDate.entries())
      .map(([date, bureaus]) => ({
        date,
        displayDate: new Date(date + "-01").toLocaleDateString("en-US", {
          month: "short",
          year: "2-digit",
        }),
        ...bureaus,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredScores]);

  // Calculate Y-axis domain - round down to nearest 50 below lowest value
  const yAxisDomain = useMemo(() => {
    if (filteredScores.length === 0) return [300, 850];
    
    const allScoreValues = filteredScores.map((s) => s.score);
    const minScore = Math.min(...allScoreValues);
    const maxScore = Math.max(...allScoreValues);
    
    // Round down to nearest 50
    const yMin = Math.floor(minScore / 50) * 50;
    // Round up to nearest 50, max 850
    const yMax = Math.min(Math.ceil(maxScore / 50) * 50, 850);
    
    return [yMin, yMax];
  }, [filteredScores]);

  // Check which bureaus have data for the selected score type
  const bureausWithData = useMemo(() => {
    const bureaus = new Set<CreditBureau>();
    filteredScores.forEach((s) => bureaus.add(s.bureau));
    return bureaus;
  }, [filteredScores]);

  // Render a score row
  const renderScoreRow = (scoreType: ScoreType) => (
    <tr key={scoreType} className="border-t border-zinc-800">
      <td className="py-2 pr-4 text-sm text-zinc-300">
        {SCORE_TYPE_LABELS[scoreType]}
      </td>
      {BUREAUS.map((bureau) => {
        const key = `${bureau}-${scoreType}`;
        const score = latestScores[key];
        return (
          <td key={bureau} className="py-2 px-3 text-center">
            {score ? (
              <div>
                <span className={`text-xl font-bold ${getScoreColor(score.score)}`}>
                  {score.score}
                </span>
                <span className="block text-xs text-zinc-500">
                  {getScoreLabel(score.score)}
                </span>
              </div>
            ) : (
              <span className="text-zinc-600">—</span>
            )}
          </td>
        );
      })}
    </tr>
  );

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
      <h2 className="text-xl font-semibold text-white mb-4">Credit Scores</h2>

      {/* Current Scores Grid */}
      <div>
        <div className="overflow-x-auto">
          <table className="w-full table-fixed">
            <colgroup>
              <col style={{ width: "25%" }} />
              <col style={{ width: "25%" }} />
              <col style={{ width: "25%" }} />
              <col style={{ width: "25%" }} />
            </colgroup>
            <thead>
              <tr>
                <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider pb-2 pr-4">
                  Score Type
                </th>
                {BUREAUS.map((bureau) => (
                  <th
                    key={bureau}
                    className="text-center text-xs font-medium text-zinc-500 uppercase tracking-wider pb-2 px-3"
                  >
                    {BUREAU_LABELS[bureau]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {availablePrimaryTypes.map(renderScoreRow)}
            </tbody>
          </table>
        </div>

        {/* Other Scores - Collapsible */}
        {availableOtherTypes.length > 0 && (
          <div className="mt-3 pt-3 border-t border-zinc-800">
            <button
              onClick={() => setShowOtherScores(!showOtherScores)}
              className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors mb-2"
            >
              {showOtherScores ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
              {showOtherScores ? "Hide Other Scores" : "Show Other Scores"}
            </button>

            {showOtherScores && (
              <div className="overflow-x-auto">
                <table className="w-full table-fixed">
                  <colgroup>
                    <col style={{ width: "25%" }} />
                    <col style={{ width: "25%" }} />
                    <col style={{ width: "25%" }} />
                    <col style={{ width: "25%" }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider pb-2 pr-4">
                        Score Type
                      </th>
                      {BUREAUS.map((bureau) => (
                        <th
                          key={bureau}
                          className="text-center text-xs font-medium text-zinc-500 uppercase tracking-wider pb-2 px-3"
                        >
                          {BUREAU_LABELS[bureau]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {availableOtherTypes.map(renderScoreRow)}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Import Sources - Collapsible */}
      <div className="mt-3 pt-3 border-t border-zinc-800">
        <button
          onClick={() => setShowImportSources(!showImportSources)}
          className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          {showImportSources ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
          {showImportSources ? "Hide Import Sources" : "How to Import Your Scores/Report"}
        </button>

        {showImportSources && (
          <div className="mt-4">
            <div className="overflow-x-auto">
              <table className="w-full table-fixed">
                <colgroup>
                  <col style={{ width: "25%" }} />
                  <col style={{ width: "25%" }} />
                  <col style={{ width: "25%" }} />
                  <col style={{ width: "25%" }} />
                </colgroup>
                <thead>
                  <tr>
                    <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider pb-2 pr-4">
                      Data Type
                    </th>
                    {BUREAUS.map((bureau) => (
                      <th
                        key={bureau}
                        className="text-center text-xs font-medium text-zinc-500 uppercase tracking-wider pb-2 px-3"
                      >
                        {BUREAU_LABELS[bureau]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {IMPORT_SOURCES.map((row, idx) => {
                    const isPrimary = row.label === "Credit Report";
                    return (
                    <tr 
                      key={row.label} 
                      className={`${idx > 0 ? "border-t border-zinc-800" : ""} ${isPrimary ? "bg-emerald-500/5" : ""}`}
                    >
                      <td className={`py-2 pr-4 text-sm align-top ${isPrimary ? "text-white font-medium" : "text-zinc-300"}`}>
                        <div className="flex items-center gap-2">
                          {row.label}
                          {isPrimary && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded font-normal">
                              Primary
                            </span>
                          )}
                        </div>
                      </td>
                      {BUREAUS.map((bureau) => {
                        const sources = row.sources[bureau];
                        return (
                          <td key={bureau} className="py-2 px-3 text-center align-top">
                            {sources.length > 0 ? (
                              <div className="space-y-1 inline-flex flex-col items-center">
                                {sources.map((source) => (
                                  <a
                                    key={source.name}
                                    href={source.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-sm transition-colors group"
                                  >
                                    {source.cardholderOnly ? (
                                      <Lock className="h-3 w-3 flex-shrink-0 text-amber-500" />
                                    ) : (
                                      <ExternalLink className="h-3 w-3 flex-shrink-0 text-zinc-600 group-hover:text-zinc-400" />
                                    )}
                                    <span className={
                                      source.recommended 
                                        ? "text-emerald-400 group-hover:text-emerald-300" 
                                        : source.cardholderOnly
                                          ? "text-zinc-500 group-hover:text-zinc-300"
                                          : "text-zinc-400 group-hover:text-white"
                                    }>
                                      {source.name}
                                    </span>
                                  </a>
                                ))}
                              </div>
                            ) : (
                              <span className="text-zinc-600 text-sm">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                  })}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div className="mt-3 pt-3 border-t border-zinc-800 flex items-center gap-6 text-xs text-zinc-500">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>Recommended</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Lock className="h-3 w-3 text-amber-500" />
                <span>Customers only</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Score History - Collapsible */}
      {hasHistory && (
        <div className="mt-3 pt-3 border-t border-zinc-800">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {showHistory ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
            {showHistory ? "Hide Score History" : "View Score History"}
          </button>

          {showHistory && (
            <div className="mt-4">
              {/* Chart Controls */}
              <div className="flex flex-wrap items-center gap-4 mb-6">
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Score Type</label>
                  <select
                    value={selectedScoreType}
                    onChange={(e) => setSelectedScoreType(e.target.value as ScoreType)}
                    className="bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm rounded-lg px-3 py-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    {availableScoreTypes.map((type) => (
                      <option key={type} value={type}>
                        {SCORE_TYPE_LABELS[type]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Time Range</label>
                  <div className="flex gap-1">
                    {TIME_RANGES.map((range) => (
                      <button
                        key={range.months}
                        onClick={() => setSelectedTimeRange(range.months)}
                        className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                          selectedTimeRange === range.months
                            ? "bg-emerald-600 text-white"
                            : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                        }`}
                      >
                        {range.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Score History Chart */}
              {chartData.length > 0 ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                      <XAxis
                        dataKey="displayDate"
                        stroke="#71717a"
                        tick={{ fill: "#a1a1aa", fontSize: 12 }}
                      />
                      <YAxis
                        domain={yAxisDomain}
                        stroke="#71717a"
                        tick={{ fill: "#a1a1aa", fontSize: 12 }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#18181b",
                          border: "1px solid #3f3f46",
                          borderRadius: "8px",
                        }}
                        labelStyle={{ color: "#e4e4e7" }}
                      />
                      <Legend />
                      {BUREAUS.map((bureau) =>
                        bureausWithData.has(bureau) ? (
                          <Line
                            key={bureau}
                            type="monotone"
                            dataKey={bureau}
                            name={BUREAU_LABELS[bureau]}
                            stroke={BUREAU_COLORS[bureau]}
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            activeDot={{ r: 5 }}
                            connectNulls
                          />
                        ) : null
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-40 flex items-center justify-center text-zinc-500">
                  No score history available for {SCORE_TYPE_LABELS[selectedScoreType]}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
