import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function Home() {
  // Redirect authenticated users to dashboard
  const { userId } = await auth();
  if (userId) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center">
      {/* Logo */}
      <div className="text-4xl sm:text-5xl font-bold text-white mb-12">
        <span className="text-blue-400">Card</span>
        <span>Tool</span>
      </div>

      {/* Members button */}
      <Link
        href="/sign-in"
        className="rounded-lg border border-zinc-700 px-8 py-3 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors uppercase tracking-wider"
      >
        Members
      </Link>
    </div>
  );
}
