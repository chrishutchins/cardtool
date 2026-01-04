import Link from "next/link";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-zinc-800 bg-zinc-900 mt-auto">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-zinc-500">
          <div className="flex items-center gap-2">
            <Link href="/" className="font-semibold text-zinc-300 hover:text-white transition-colors">
              <span className="text-blue-400">Card</span>
              <span>Tool</span>
            </Link>
            <span className="text-zinc-600">·</span>
            <span>© {currentYear} All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6">
            <Link
              href="/terms"
              className="hover:text-zinc-300 transition-colors"
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              className="hover:text-zinc-300 transition-colors"
            >
              Privacy
            </Link>
            <Link
              href="/cookies"
              className="hover:text-zinc-300 transition-colors"
            >
              Cookies
            </Link>
          </div>
        </div>
        <p className="mt-4 text-xs text-zinc-600 text-center sm:text-left">
          We use cookies for authentication only.{" "}
          <Link href="/cookies" className="underline hover:text-zinc-400">
            Learn more
          </Link>
        </p>
      </div>
    </footer>
  );
}

