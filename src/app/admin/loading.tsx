export default function Loading() {
  return (
    <div className="p-8">
      <div className="animate-pulse">
        <div className="h-8 w-48 bg-zinc-800 rounded mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
              <div className="h-4 w-20 bg-zinc-800 rounded mb-2" />
              <div className="h-8 w-16 bg-zinc-800 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

