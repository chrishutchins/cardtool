export default function RulesLoading() {
  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="border-b border-zinc-800 bg-zinc-900">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex h-14 items-center">
            <div className="h-6 w-24 bg-zinc-800 rounded animate-pulse" />
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="mb-8">
          <div className="h-8 w-56 bg-zinc-800 rounded animate-pulse mb-2" />
          <div className="h-4 w-80 bg-zinc-800 rounded animate-pulse" />
        </div>

        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden"
            >
              <div className="bg-zinc-800/50 px-4 py-3 border-b border-zinc-700">
                <div className="h-6 w-32 bg-zinc-700 rounded animate-pulse" />
              </div>
              <div className="divide-y divide-zinc-800">
                {[1, 2].map((j) => (
                  <div key={j} className="px-4 py-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-4 w-4 bg-zinc-800 rounded animate-pulse" />
                      <div className="h-5 w-24 bg-zinc-800 rounded animate-pulse" />
                    </div>
                    <div className="flex items-baseline gap-2 mb-2">
                      <div className="h-8 w-8 bg-zinc-800 rounded animate-pulse" />
                      <div className="h-6 w-16 bg-zinc-800 rounded animate-pulse" />
                    </div>
                    <div className="h-4 w-64 bg-zinc-800 rounded animate-pulse" />
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

