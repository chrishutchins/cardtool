export default function ReturnsLoading() {
  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="border-b border-zinc-800 bg-zinc-900">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex h-14 items-center justify-between">
            <div className="h-6 w-24 bg-zinc-800 rounded animate-pulse" />
            <div className="flex gap-4">
              <div className="h-8 w-20 bg-zinc-800 rounded animate-pulse" />
              <div className="h-8 w-20 bg-zinc-800 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>
      
      <div className="mx-auto max-w-5xl px-4 py-12">
        <div className="mb-8">
          <div className="h-9 w-64 bg-zinc-800 rounded animate-pulse mb-2" />
          <div className="h-5 w-48 bg-zinc-800 rounded animate-pulse" />
        </div>

        <div className="space-y-6">
          {/* Overview skeleton */}
          <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-6">
            <div className="text-center">
              <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse mx-auto mb-2" />
              <div className="h-10 w-40 bg-zinc-800 rounded animate-pulse mx-auto" />
            </div>
          </div>

          {/* Cashback section skeleton */}
          <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-6">
            <div className="h-6 w-40 bg-zinc-800 rounded animate-pulse mb-4" />
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="text-center">
                  <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse mx-auto mb-2" />
                  <div className="h-6 w-20 bg-zinc-800 rounded animate-pulse mx-auto" />
                </div>
              ))}
            </div>
          </div>

          {/* Points section skeleton */}
          <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-6">
            <div className="h-6 w-36 bg-zinc-800 rounded animate-pulse mb-4" />
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="text-center">
                  <div className="h-4 w-20 bg-zinc-800 rounded animate-pulse mx-auto mb-2" />
                  <div className="h-6 w-16 bg-zinc-800 rounded animate-pulse mx-auto" />
                </div>
              ))}
            </div>
          </div>

          {/* Summary skeleton */}
          <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-6">
            <div className="h-6 w-28 bg-zinc-800 rounded animate-pulse mb-4" />
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex justify-between items-center py-2">
                  <div className="h-5 w-32 bg-zinc-800 rounded animate-pulse" />
                  <div className="h-6 w-24 bg-zinc-800 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

