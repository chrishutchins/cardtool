import { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "Cookie Policy | CardTool",
  description: "Cookie Policy for CardTool - How we use cookies and similar technologies",
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
                Similar technologies include local storage, session storage, and device identifiers.
              </p>
            </section>

            <section className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6">
              <h2 className="text-2xl font-semibold text-emerald-300 mb-4">
                Our Approach
              </h2>
              <p className="text-zinc-300 leading-relaxed mb-4">
                CardTool uses only <strong>essential cookies and technologies</strong> required for
                authentication, security, and basic functionality. We prioritize your privacy:
              </p>
              <ul className="list-disc list-inside text-zinc-300 space-y-2">
                <li><strong>No advertising cookies</strong></li>
                <li><strong>No cross-site tracking</strong></li>
                <li><strong>No third-party marketing cookies</strong></li>
                <li>Limited analytics for error reporting and reliability only</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                Cookies &amp; Technologies We Use
              </h2>

              <h3 className="text-xl font-medium text-zinc-200 mb-3 mt-6">
                Essential (Authentication &amp; Security)
              </h3>
              <div className="overflow-x-auto mb-6">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-700">
                      <th className="py-3 px-4 text-zinc-200 font-semibold">Name</th>
                      <th className="py-3 px-4 text-zinc-200 font-semibold">Provider</th>
                      <th className="py-3 px-4 text-zinc-200 font-semibold">Purpose</th>
                      <th className="py-3 px-4 text-zinc-200 font-semibold">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="text-zinc-300">
                    <tr className="border-b border-zinc-800">
                      <td className="py-3 px-4 font-mono text-sm">__clerk_*</td>
                      <td className="py-3 px-4">Clerk</td>
                      <td className="py-3 px-4">Authentication session management</td>
                      <td className="py-3 px-4">Session / 7 days</td>
                    </tr>
                    <tr className="border-b border-zinc-800">
                      <td className="py-3 px-4 font-mono text-sm">__session</td>
                      <td className="py-3 px-4">Clerk</td>
                      <td className="py-3 px-4">User session identifier</td>
                      <td className="py-3 px-4">Session</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h3 className="text-xl font-medium text-zinc-200 mb-3">
                Error Reporting &amp; Diagnostics
              </h3>
              <div className="overflow-x-auto mb-6">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-700">
                      <th className="py-3 px-4 text-zinc-200 font-semibold">Technology</th>
                      <th className="py-3 px-4 text-zinc-200 font-semibold">Provider</th>
                      <th className="py-3 px-4 text-zinc-200 font-semibold">Purpose</th>
                      <th className="py-3 px-4 text-zinc-200 font-semibold">Data Collected</th>
                    </tr>
                  </thead>
                  <tbody className="text-zinc-300">
                    <tr className="border-b border-zinc-800">
                      <td className="py-3 px-4 font-mono text-sm">Sentry SDK</td>
                      <td className="py-3 px-4">Sentry</td>
                      <td className="py-3 px-4">Error tracking and crash reporting</td>
                      <td className="py-3 px-4">Error logs, device info, IP address</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-zinc-400 text-sm mb-6">
                Sentry helps us identify and fix bugs. It may collect device identifiers, browser
                information, and IP addresses when errors occur. This data is used solely for
                debugging and improving service reliability.
              </p>

              <h3 className="text-xl font-medium text-zinc-200 mb-3">
                Optional Features (If Used)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-700">
                      <th className="py-3 px-4 text-zinc-200 font-semibold">Feature</th>
                      <th className="py-3 px-4 text-zinc-200 font-semibold">Provider</th>
                      <th className="py-3 px-4 text-zinc-200 font-semibold">Cookies/Technologies</th>
                    </tr>
                  </thead>
                  <tbody className="text-zinc-300">
                    <tr className="border-b border-zinc-800">
                      <td className="py-3 px-4">Bank Account Linking</td>
                      <td className="py-3 px-4">Plaid</td>
                      <td className="py-3 px-4">Session cookies during Link flow</td>
                    </tr>
                    <tr className="border-b border-zinc-800">
                      <td className="py-3 px-4">Payment Processing</td>
                      <td className="py-3 px-4">Stripe</td>
                      <td className="py-3 px-4">Session cookies during checkout</td>
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
                Our authentication provider (Clerk) sets cookies necessary for secure
                login functionality. These cookies are essential for the service to work
                and cannot be disabled while using CardTool.
              </p>
              <p className="text-zinc-300 leading-relaxed mb-4">
                If you use our optional Plaid integration, Plaid may set cookies during
                the account linking process. These are managed by Plaid and are subject
                to their{" "}
                <a
                  href="https://plaid.com/legal/#privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline"
                >
                  privacy policy
                </a>
                .
              </p>
              <p className="text-zinc-300 leading-relaxed">
                Sentry may use local storage or device fingerprinting for error correlation.
                For details, see{" "}
                <a
                  href="https://sentry.io/privacy/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline"
                >
                  Sentry&apos;s Privacy Policy
                </a>
                .
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
