export default function Loading() {
  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header skeleton */}
      <div className="border-b border-zinc-800 bg-zinc-900">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex h-14 items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="h-6 w-24 bg-zinc-800 rounded animate-pulse" />
              <div className="hidden md:flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-8 w-20 bg-zinc-800 rounded animate-pulse" />
                ))}
              </div>
            </div>
            <div className="h-8 w-8 bg-zinc-800 rounded-full animate-pulse" />
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* Title skeleton */}
        <div className="mb-8">
          <div className="h-8 w-48 bg-zinc-800 rounded animate-pulse mb-2" />
          <div className="h-5 w-80 bg-zinc-800 rounded animate-pulse" />
        </div>

        {/* Source selector skeleton */}
        <div className="flex items-center gap-3 mb-6">
          <div className="h-5 w-16 bg-zinc-800 rounded animate-pulse" />
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-9 w-24 bg-zinc-800 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>

        {/* Table skeleton */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="h-12 bg-zinc-800 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
