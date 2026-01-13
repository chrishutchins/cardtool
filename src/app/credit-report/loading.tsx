export default function Loading() {
  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header skeleton */}
      <div className="h-16 bg-zinc-900 border-b border-zinc-800" />

      <div className="mx-auto max-w-7xl px-4 py-12">
        {/* Title skeleton */}
        <div className="mb-8">
          <div className="h-9 w-48 bg-zinc-800 rounded animate-pulse" />
          <div className="h-5 w-72 bg-zinc-800/50 rounded mt-2 animate-pulse" />
        </div>

        {/* Credit Insights Row skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 animate-pulse"
            >
              <div className="h-3 w-16 bg-zinc-800 rounded mb-3" />
              <div className="h-8 w-20 bg-zinc-800 rounded mb-1" />
              <div className="h-3 w-12 bg-zinc-800/50 rounded" />
            </div>
          ))}
        </div>

        {/* Score Chart skeleton */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 mb-8 animate-pulse">
          <div className="h-6 w-32 bg-zinc-800 rounded mb-6" />
          
          {/* Score grid skeleton */}
          <div className="mb-8">
            <div className="h-4 w-24 bg-zinc-800/50 rounded mb-4" />
            <div className="grid grid-cols-4 gap-4">
              {[...Array(16)].map((_, i) => (
                <div key={i} className="h-12 bg-zinc-800 rounded" />
              ))}
            </div>
          </div>

          {/* Chart skeleton */}
          <div className="h-80 bg-zinc-800 rounded" />
        </div>

        {/* Account Mapping skeleton */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 mb-8 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 bg-zinc-800 rounded" />
            <div>
              <div className="h-5 w-36 bg-zinc-800 rounded mb-1" />
              <div className="h-4 w-48 bg-zinc-800/50 rounded" />
            </div>
          </div>
        </div>

        {/* Account Summary skeleton */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden mb-8 animate-pulse">
          <div className="p-4 border-b border-zinc-800">
            <div className="h-5 w-28 bg-zinc-800 rounded mb-1" />
            <div className="h-4 w-48 bg-zinc-800/50 rounded" />
          </div>
          <div className="p-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-zinc-800 rounded mb-2" />
            ))}
          </div>
        </div>

        {/* Bureau Tabs skeleton */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden mb-8 animate-pulse">
          <div className="flex border-b border-zinc-800">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex-1 p-3">
                <div className="h-5 w-20 bg-zinc-800 rounded mx-auto" />
              </div>
            ))}
          </div>
          <div className="p-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-12 bg-zinc-800 rounded mb-2" />
            ))}
          </div>
        </div>

        {/* Inquiries skeleton */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden animate-pulse">
          <div className="p-4 border-b border-zinc-800">
            <div className="h-5 w-32 bg-zinc-800 rounded mb-1" />
            <div className="h-4 w-48 bg-zinc-800/50 rounded" />
          </div>
          <div className="p-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-12 bg-zinc-800 rounded mb-2" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
