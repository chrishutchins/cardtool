export default function InventoryLoading() {
  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="border-b border-zinc-800 bg-zinc-900">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex h-14 items-center">
            <div className="h-6 w-24 bg-zinc-800 rounded animate-pulse" />
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="mb-8">
          <div className="h-8 w-48 bg-zinc-800 rounded animate-pulse mb-2" />
          <div className="h-4 w-64 bg-zinc-800 rounded animate-pulse" />
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-9 w-32 bg-zinc-800 rounded animate-pulse" />
              <div className="h-9 w-32 bg-zinc-800 rounded animate-pulse" />
            </div>
            <div className="h-9 w-24 bg-zinc-800 rounded animate-pulse" />
          </div>
        </div>

        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
              <div className="bg-zinc-800/50 px-4 py-2 border-b border-zinc-700">
                <div className="h-5 w-32 bg-zinc-700 rounded animate-pulse" />
              </div>
              <div className="divide-y divide-zinc-800">
                {[1, 2].map((j) => (
                  <div key={j} className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 bg-zinc-800 rounded animate-pulse" />
                      <div>
                        <div className="h-5 w-40 bg-zinc-800 rounded animate-pulse mb-1" />
                        <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse" />
                      </div>
                    </div>
                    <div className="h-5 w-20 bg-zinc-800 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

