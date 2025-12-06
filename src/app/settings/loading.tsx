import { UserHeader } from "@/components/user-header";

export default function SettingsLoading() {
  return (
    <div className="min-h-screen bg-zinc-950">
      <UserHeader />
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="mb-8">
          <div className="h-9 w-32 bg-zinc-800 rounded animate-pulse" />
          <div className="h-5 w-64 bg-zinc-800 rounded animate-pulse mt-2" />
        </div>

        <div className="space-y-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
              <div className="h-6 w-48 bg-zinc-800 rounded animate-pulse mb-2" />
              <div className="h-4 w-96 bg-zinc-800 rounded animate-pulse mb-4" />
              <div className="h-24 bg-zinc-800/50 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

