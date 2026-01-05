"use client";

import { useTransition } from "react";

interface EmulationBannerProps {
  emulatedUserEmail: string | null;
  emulatedUserId: string;
  onStopEmulation: () => Promise<void>;
}

export function EmulationBanner({
  emulatedUserEmail,
  emulatedUserId,
  onStopEmulation,
}: EmulationBannerProps) {
  const [isPending, startTransition] = useTransition();

  const handleStop = () => {
    startTransition(() => {
      onStopEmulation();
    });
  };

  return (
    <div className="sticky top-0 z-50 bg-amber-600 text-black px-4 py-2">
      <div className="mx-auto max-w-7xl flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
          <span>
            Viewing as:{" "}
            <span className="font-bold">
              {emulatedUserEmail || emulatedUserId}
            </span>
          </span>
        </div>
        <button
          onClick={handleStop}
          disabled={isPending}
          className="px-3 py-1 rounded-md bg-black/20 hover:bg-black/30 text-sm font-medium transition-colors disabled:opacity-50"
        >
          {isPending ? "Stopping..." : "Stop Emulating"}
        </button>
      </div>
    </div>
  );
}

