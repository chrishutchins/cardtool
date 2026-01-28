import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Account Deleted | CardTool",
  description: "Your CardTool account has been deleted",
};

export default function AccountDeletedPage() {
  return (
    <div className="flex-1 bg-zinc-950 flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800">
          <svg
            className="h-8 w-8 text-zinc-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-white mb-4">Account Deleted</h1>
        <p className="text-zinc-400 mb-8">
          Your account and all associated data have been permanently deleted.
          We&apos;re sorry to see you go.
        </p>
        <Link
          href="/"
          className="inline-block rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
        >
          Return to Home
        </Link>
      </div>
    </div>
  );
}

