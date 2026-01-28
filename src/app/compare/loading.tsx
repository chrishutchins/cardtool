export default function Loading() {
  return (
    <div className="flex-1 bg-zinc-950">
      <div className="mx-auto max-w-[1600px] px-4 py-8">
        <div className="animate-pulse">
          <div className="h-9 w-56 bg-zinc-800 rounded mb-2" />
          <div className="h-4 w-80 bg-zinc-800 rounded mb-6" />
          
          {/* Controls skeleton */}
          <div className="flex gap-4 mb-4">
            <div className="h-10 w-48 bg-zinc-800 rounded-lg" />
            <div className="h-10 w-40 bg-zinc-800 rounded-lg" />
          </div>
          
          {/* Table skeleton */}
          <div className="rounded-xl border border-zinc-800 overflow-hidden">
            <div className="bg-zinc-800/50 h-12" />
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="border-t border-zinc-800 h-16 bg-zinc-900" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

