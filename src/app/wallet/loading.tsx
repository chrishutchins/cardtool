export default function Loading() {
  return (
    <div className="flex-1 bg-zinc-950">
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-zinc-800 rounded mb-2" />
          <div className="h-4 w-64 bg-zinc-800 rounded mb-8" />
          
          {/* Cards skeleton */}
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-5 w-40 bg-zinc-800 rounded" />
                    <div className="h-4 w-20 bg-zinc-800 rounded" />
                  </div>
                  <div className="h-6 w-16 bg-zinc-800 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

