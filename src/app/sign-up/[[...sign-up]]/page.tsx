"use client";

import { useState } from "react";
import { SignUp } from "@clerk/nextjs";
import Link from "next/link";

export default function SignUpPage() {
  const [inviteCode, setInviteCode] = useState("");
  const [isValidCode, setIsValidCode] = useState(false);
  const [error, setError] = useState("");
  const [isChecking, setIsChecking] = useState(false);

  const handleCheckCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsChecking(true);
    setError("");

    try {
      const response = await fetch("/api/verify-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: inviteCode }),
      });

      const data = await response.json();

      if (data.valid) {
        setIsValidCode(true);
      } else {
        setError("Invalid invite code. Please check your code and try again.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {!isValidCode ? (
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-8">
            <div className="text-center mb-8">
              <Link href="/" className="text-2xl font-bold text-white">
                CardTool
              </Link>
              <p className="text-zinc-400 mt-2">
                Enter your invite code to create an account
              </p>
            </div>

            <form onSubmit={handleCheckCode} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  Invite Code
                </label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="Enter your invite code"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-center text-lg tracking-widest"
                  required
                  autoFocus
                />
              </div>

              {error && (
                <p className="text-red-400 text-sm text-center">{error}</p>
              )}

              <button
                type="submit"
                disabled={isChecking || !inviteCode.trim()}
                className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isChecking ? "Verifying..." : "Continue"}
              </button>
            </form>

            <p className="text-center text-sm text-zinc-500 mt-6">
              Already have an account?{" "}
              <Link href="/sign-in" className="text-blue-400 hover:text-blue-300">
                Sign in
              </Link>
            </p>

            <p className="text-center text-xs text-zinc-600 mt-4">
              Don&apos;t have an invite code? Contact the administrator.
            </p>
          </div>
        ) : (
          <div>
            <div className="text-center mb-4">
              <p className="text-emerald-400 text-sm">
                ✓ Invite code accepted
              </p>
            </div>
            <SignUp 
              forceRedirectUrl="/wallet"
              appearance={{
                elements: {
                  rootBox: "mx-auto",
                  card: "bg-zinc-900 border border-zinc-800",
                  headerTitle: "text-white",
                  headerSubtitle: "text-zinc-400",
                  socialButtonsBlockButton: "bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700",
                  formFieldLabel: "text-zinc-400",
                  formFieldInput: "bg-zinc-800 border-zinc-700 text-white",
                  formButtonPrimary: "bg-blue-600 hover:bg-blue-700",
                  footerActionLink: "text-blue-400 hover:text-blue-300",
                }
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

