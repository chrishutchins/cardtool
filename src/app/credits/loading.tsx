export default function Loading() {
  return (
    <div className="flex-1 bg-zinc-950">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="mb-8">
          <div className="h-9 w-48 bg-zinc-800 rounded animate-pulse" />
          <div className="h-5 w-64 bg-zinc-800 rounded animate-pulse mt-2" />
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-8 w-32 bg-zinc-800 rounded animate-pulse" />
              <div className="h-8 w-32 bg-zinc-800 rounded animate-pulse" />
            </div>
            <div className="h-10 w-24 bg-zinc-800 rounded animate-pulse" />
          </div>
        </div>

        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
              <div className="bg-zinc-800/50 px-6 py-3 border-b border-zinc-700">
                <div className="h-6 w-48 bg-zinc-700 rounded animate-pulse" />
              </div>
              <div className="p-6 space-y-4">
                {[1, 2].map((j) => (
                  <div key={j} className="flex items-center justify-between">
                    <div className="h-5 w-40 bg-zinc-800 rounded animate-pulse" />
                    <div className="flex gap-2">
                      {[1, 2, 3, 4].map((k) => (
                        <div key={k} className="h-8 w-12 bg-zinc-800 rounded animate-pulse" />
                      ))}
                    </div>
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

