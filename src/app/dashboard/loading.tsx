export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="mx-auto max-w-5xl px-4 py-12">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-9 w-40 bg-zinc-800 rounded animate-pulse" />
          <div className="h-5 w-64 bg-zinc-800 rounded animate-pulse mt-2" />
        </div>

        {/* Stats cards skeleton */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-zinc-900/50 border border-zinc-800 animate-pulse" />
          ))}
        </div>

        {/* Content cards skeleton */}
        <div className="grid gap-6 lg:grid-cols-2 mb-8">
          <div className="h-64 rounded-xl bg-zinc-900/50 border border-zinc-800 animate-pulse" />
          <div className="h-64 rounded-xl bg-zinc-900/50 border border-zinc-800 animate-pulse" />
        </div>

        {/* Recommendations skeleton */}
        <div className="h-48 rounded-xl bg-zinc-900/50 border border-zinc-800 animate-pulse" />
      </div>
    </div>
  );
}


