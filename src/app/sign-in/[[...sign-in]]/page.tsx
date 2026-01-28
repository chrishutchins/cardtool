"use client";

import { useState } from "react";
import { SignIn, SignUp } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import Link from "next/link";
import { Loader2, CheckCircle, ArrowRight } from "lucide-react";

type AuthStep = "email" | "invite" | "signin" | "signup";

// Shared Clerk dark theme configuration
const clerkDarkAppearance = {
  baseTheme: dark,
  variables: {
    colorPrimary: "#2563eb", // blue-600
    colorBackground: "#18181b", // zinc-900
    colorInputBackground: "#27272a", // zinc-800
    colorInputText: "#ffffff",
    colorText: "#ffffff",
    colorTextSecondary: "#a1a1aa", // zinc-400
    colorDanger: "#ef4444",
    borderRadius: "0.5rem",
  },
  elements: {
    rootBox: "mx-auto",
    card: "bg-zinc-900 border border-zinc-800 shadow-xl",
    headerTitle: "text-white",
    headerSubtitle: "text-zinc-400",
    socialButtonsBlockButton:
      "bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700",
    socialButtonsBlockButtonText: "text-white",
    dividerLine: "bg-zinc-700",
    dividerText: "text-zinc-500",
    formFieldLabel: "text-zinc-400",
    formFieldInput:
      "bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500",
    formFieldInputShowPasswordButton: "text-zinc-400 hover:text-zinc-300",
    formButtonPrimary:
      "bg-blue-600 hover:bg-blue-700 text-white font-semibold",
    footerAction: "text-zinc-400",
    footerActionLink: "text-blue-400 hover:text-blue-300",
    identityPreview: "bg-zinc-800 border-zinc-700",
    identityPreviewText: "text-white",
    identityPreviewEditButton: "text-blue-400 hover:text-blue-300",
    formResendCodeLink: "text-blue-400 hover:text-blue-300",
    otpCodeFieldInput: "bg-zinc-800 border-zinc-700 text-white",
    alert: "bg-zinc-800 border-zinc-700",
    alertText: "text-zinc-300",
    footer: "hidden", // Hide Clerk footer for cleaner look
  },
};

// SignUp appearance with locked email field (email already verified)
const clerkSignUpAppearance = {
  ...clerkDarkAppearance,
  elements: {
    ...clerkDarkAppearance.elements,
    // Lock the email field - user already verified their email
    formFieldInput__emailAddress:
      "bg-zinc-800/50 border-zinc-700 text-zinc-400 pointer-events-none cursor-not-allowed",
    formFieldRow__emailAddress: "opacity-60",
  },
};

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [step, setStep] = useState<AuthStep>("email");
  const [error, setError] = useState("");
  const [isChecking, setIsChecking] = useState(false);

  const handleCheckEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsChecking(true);
    setError("");

    try {
      const response = await fetch("/api/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (response.status === 429) {
        setError("Too many attempts. Please try again later.");
        return;
      }

      const data = await response.json();

      if (data.existingUser) {
        // User already has an account - show sign in
        setStep("signin");
      } else if (data.whitelisted) {
        // Email is whitelisted via Stripe subscription - show sign up
        setStep("signup");
      } else {
        // Not whitelisted, require invite code
        setStep("invite");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsChecking(false);
    }
  };

  const handleCheckCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsChecking(true);
    setError("");

    try {
      const response = await fetch("/api/verify-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: inviteCode, email }),
      });

      if (response.status === 429) {
        setError("Too many attempts. Please try again later.");
        return;
      }

      const data = await response.json();

      if (data.valid) {
        setStep("signup");
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
    <div className="flex-1 bg-zinc-950 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {step === "email" && (
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-8">
            <div className="text-center mb-8">
              <Link
                href="/"
                className="text-2xl font-bold text-white inline-block"
              >
                <span className="text-blue-400">Card</span>
                <span>Tool</span>
              </Link>
              <p className="text-zinc-400 mt-3">
                Enter your email to continue
              </p>
            </div>

            <form onSubmit={handleCheckEmail} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                  autoFocus
                />
              </div>

              {error && (
                <p className="text-red-400 text-sm text-center">{error}</p>
              )}

              <button
                type="submit"
                disabled={isChecking || !email.trim()}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isChecking ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            <p className="text-center text-xs text-zinc-600 mt-6">
              Membership required to access CardTool
            </p>
          </div>
        )}

        {step === "invite" && (
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-8">
            <div className="text-center mb-6">
              <Link
                href="/"
                className="text-2xl font-bold text-white inline-block"
              >
                <span className="text-blue-400">Card</span>
                <span>Tool</span>
              </Link>
            </div>

            <div className="mb-6 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <p className="text-sm text-amber-300 text-center">
                <strong>{email}</strong> is not an active member.
                <br />
                Enter an invite code to continue.
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
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isChecking ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Continue"
                )}
              </button>
            </form>

            <button
              onClick={() => {
                setStep("email");
                setError("");
                setInviteCode("");
              }}
              className="w-full mt-4 text-sm text-zinc-500 hover:text-zinc-300"
            >
              ← Use a different email
            </button>

            <p className="text-center text-xs text-zinc-600 mt-6">
              Don&apos;t have an invite code? Contact the administrator.
            </p>
          </div>
        )}

        {step === "signin" && (
          <div>
            <div className="text-center mb-4">
              <Link
                href="/"
                className="text-2xl font-bold text-white inline-block"
              >
                <span className="text-blue-400">Card</span>
                <span>Tool</span>
              </Link>
            </div>
            <SignIn
              forceRedirectUrl="/dashboard"
              initialValues={{ emailAddress: email }}
              appearance={clerkDarkAppearance}
            />
            <button
              onClick={() => {
                setStep("email");
                setError("");
              }}
              className="w-full mt-4 text-sm text-zinc-500 hover:text-zinc-300"
            >
              ← Use a different email
            </button>
          </div>
        )}

        {step === "signup" && (
          <div>
            <div className="text-center mb-4">
              <Link
                href="/"
                className="text-2xl font-bold text-white block mb-3"
              >
                <span className="text-blue-400">Card</span>
                <span>Tool</span>
              </Link>
              <div className="flex items-center justify-center gap-2 text-emerald-400 text-sm">
                <CheckCircle className="h-4 w-4" />
                <span>Access verified for {email}</span>
              </div>
            </div>
            <SignUp
              forceRedirectUrl="/dashboard"
              initialValues={{ emailAddress: email }}
              appearance={clerkSignUpAppearance}
            />
            <p className="text-center text-xs text-zinc-500 mt-6">
              By signing up, you agree to our{" "}
              <Link
                href="/terms"
                className="text-zinc-400 hover:text-zinc-300 underline"
              >
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link
                href="/privacy"
                className="text-zinc-400 hover:text-zinc-300 underline"
              >
                Privacy Policy
              </Link>
            </p>
            <button
              onClick={() => {
                setStep("email");
                setError("");
              }}
              className="w-full mt-4 text-sm text-zinc-500 hover:text-zinc-300"
            >
              ← Use a different email
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
