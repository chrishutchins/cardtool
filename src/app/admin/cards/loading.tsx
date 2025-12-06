export default function Loading() {
  return (
    <div className="p-8">
      <div className="animate-pulse">
        <div className="h-8 w-32 bg-zinc-800 rounded mb-6" />
        
        {/* Filters skeleton */}
        <div className="flex gap-3 mb-4">
          <div className="h-10 w-48 bg-zinc-800 rounded-lg" />
          <div className="h-10 w-32 bg-zinc-800 rounded-lg" />
          <div className="h-10 w-32 bg-zinc-800 rounded-lg" />
        </div>
        
        {/* Table skeleton */}
        <div className="rounded-xl border border-zinc-800 overflow-hidden">
          <div className="bg-zinc-800/50 h-12" />
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="border-t border-zinc-800 h-16 bg-zinc-900" />
          ))}
        </div>
      </div>
    </div>
  );
}

