"use client";

import { useState } from "react";

type Bureau = "transunion" | "equifax" | "experian";
type ScoreModel = "fico_8" | "fico_9" | "fico_8_bankcard" | "vantage_3";

interface Provider {
  name: string;
  url?: string;
}

interface ScoreSource {
  scoreModel: ScoreModel;
  modelName: string;
  bureauProviders: Record<Bureau, Provider[]>;
}

const scoreSources: ScoreSource[] = [
  {
    scoreModel: "fico_8",
    modelName: "FICO 8",
    bureauProviders: {
      transunion: [
        { name: "Bank of America" },
        { name: "Capital One" },
      ],
      equifax: [
        { name: "myFICO" },
      ],
      experian: [
        { name: "Experian" },
        { name: "American Express" },
      ],
    },
  },
  {
    scoreModel: "vantage_3",
    modelName: "VantageScore 3.0",
    bureauProviders: {
      transunion: [
        { name: "Credit Karma" },
        { name: "US Bank" },
      ],
      equifax: [
        { name: "Equifax" },
        { name: "Credit Karma" },
      ],
      experian: [
        { name: "Chase" },
      ],
    },
  },
  {
    scoreModel: "fico_8_bankcard",
    modelName: "FICO 8 Bankcard",
    bureauProviders: {
      transunion: [],
      equifax: [
        { name: "Citi" },
      ],
      experian: [],
    },
  },
  {
    scoreModel: "fico_9",
    modelName: "FICO 9",
    bureauProviders: {
      transunion: [],
      equifax: [],
      experian: [
        { name: "Wells Fargo" },
      ],
    },
  },
];

const bureauLabels: Record<Bureau, string> = {
  transunion: "TransUnion",
  equifax: "Equifax",
  experian: "Experian",
};

const bureauColors: Record<Bureau, string> = {
  transunion: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  equifax: "bg-red-500/20 text-red-400 border-red-500/30",
  experian: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

export function ScoreSources() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-zinc-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
            <svg
              className="w-5 h-5 text-amber-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z"
              />
            </svg>
          </div>
          <div className="text-left">
            <h3 className="text-white font-medium">Where to Get Your Scores</h3>
            <p className="text-sm text-zinc-500">
              Free credit score sources by score type and bureau
            </p>
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-zinc-400 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {expanded && (
        <div className="px-6 pb-6 space-y-6">
          {/* Header row */}
          <div className="grid grid-cols-4 gap-4 pt-2">
            <div className="text-sm font-medium text-zinc-500">Score Model</div>
            <div className="text-sm font-medium text-zinc-500 text-center">TransUnion</div>
            <div className="text-sm font-medium text-zinc-500 text-center">Equifax</div>
            <div className="text-sm font-medium text-zinc-500 text-center">Experian</div>
          </div>

          {/* Divider */}
          <div className="border-t border-zinc-800 -mx-6" />

          {/* Score rows */}
          {scoreSources.map((source) => (
            <div key={source.scoreModel} className="grid grid-cols-4 gap-4 items-start">
              <div>
                <span className="text-white font-medium">{source.modelName}</span>
              </div>
              {(["transunion", "equifax", "experian"] as Bureau[]).map((bureau) => (
                <div key={bureau} className="flex flex-wrap justify-center gap-2">
                  {source.bureauProviders[bureau].length > 0 ? (
                    source.bureauProviders[bureau].map((provider) => (
                      <span
                        key={provider.name}
                        className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${bureauColors[bureau]}`}
                      >
                        {provider.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-zinc-600 text-sm">—</span>
                  )}
                </div>
              ))}
            </div>
          ))}

          {/* Footer note */}
          <div className="pt-4 border-t border-zinc-800">
            <p className="text-xs text-zinc-500">
              💡 Tip: FICO 8 is the most commonly used score by lenders. VantageScore 3.0 is free but less widely used for credit decisions.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
