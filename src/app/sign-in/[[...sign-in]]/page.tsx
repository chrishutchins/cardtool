import { SignIn } from "@clerk/nextjs";
import Link from "next/link";

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <Link href="/" className="text-2xl font-bold text-white">
            CardTool
          </Link>
        </div>
        <SignIn 
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
    </div>
  );
}

