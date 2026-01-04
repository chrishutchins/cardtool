import { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "Cookie Policy | CardTool",
  description: "Cookie Policy for CardTool - How we use cookies",
};

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-16">
          <h1 className="text-4xl font-bold text-white mb-8">Cookie Policy</h1>
          <p className="text-zinc-400 mb-8">
            Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </p>

          <div className="prose prose-invert prose-zinc max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                What Are Cookies?
              </h2>
              <p className="text-zinc-300 leading-relaxed">
                Cookies are small text files stored on your device when you visit a website.
                They help websites remember your preferences and enable certain functionality.
              </p>
            </section>

            <section className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6">
              <h2 className="text-2xl font-semibold text-emerald-300 mb-4">
                Our Cookie Usage
              </h2>
              <p className="text-zinc-300 leading-relaxed mb-4">
                CardTool uses only <strong>strictly necessary cookies</strong> required for
                authentication and basic functionality. We do not use:
              </p>
              <ul className="list-disc list-inside text-zinc-300 space-y-2">
                <li>Advertising cookies</li>
                <li>Tracking cookies</li>
                <li>Analytics cookies that identify you personally</li>
                <li>Third-party marketing cookies</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                Cookies We Use
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-700">
                      <th className="py-3 px-4 text-zinc-200 font-semibold">Name</th>
                      <th className="py-3 px-4 text-zinc-200 font-semibold">Purpose</th>
                      <th className="py-3 px-4 text-zinc-200 font-semibold">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="text-zinc-300">
                    <tr className="border-b border-zinc-800">
                      <td className="py-3 px-4 font-mono text-sm">__clerk_*</td>
                      <td className="py-3 px-4">Authentication session management</td>
                      <td className="py-3 px-4">Session / 7 days</td>
                    </tr>
                    <tr className="border-b border-zinc-800">
                      <td className="py-3 px-4 font-mono text-sm">__session</td>
                      <td className="py-3 px-4">User session identifier</td>
                      <td className="py-3 px-4">Session</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                Third-Party Cookies
              </h2>
              <p className="text-zinc-300 leading-relaxed mb-4">
                Our authentication provider (Clerk) may set cookies necessary for secure
                login functionality. These cookies are essential for the service to work
                and cannot be disabled while using CardTool.
              </p>
              <p className="text-zinc-300 leading-relaxed">
                If you use our optional Plaid integration, Plaid may set cookies during
                the account linking process. These are managed by Plaid and are subject
                to their cookie policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                Managing Cookies
              </h2>
              <p className="text-zinc-300 leading-relaxed mb-4">
                Most web browsers allow you to control cookies through their settings.
                However, if you disable cookies, you will not be able to log in to
                CardTool.
              </p>
              <p className="text-zinc-300 leading-relaxed">
                To learn more about managing cookies in your browser:
              </p>
              <ul className="list-disc list-inside text-zinc-300 space-y-2 mt-4">
                <li>
                  <a
                    href="https://support.google.com/chrome/answer/95647"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline"
                  >
                    Chrome
                  </a>
                </li>
                <li>
                  <a
                    href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline"
                  >
                    Firefox
                  </a>
                </li>
                <li>
                  <a
                    href="https://support.apple.com/guide/safari/manage-cookies-and-website-data-sfri11471/mac"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline"
                  >
                    Safari
                  </a>
                </li>
                <li>
                  <a
                    href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline"
                  >
                    Microsoft Edge
                  </a>
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                Changes to This Policy
              </h2>
              <p className="text-zinc-300 leading-relaxed">
                We may update this Cookie Policy from time to time. Any changes will be
                posted on this page with an updated revision date.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                Contact Us
              </h2>
              <p className="text-zinc-300 leading-relaxed">
                If you have any questions about our use of cookies, please contact us
                through the in-app feedback system.
              </p>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-zinc-800">
            <Link
              href="/"
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

