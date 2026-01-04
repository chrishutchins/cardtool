import { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "Privacy Policy | CardTool",
  description: "Privacy Policy for CardTool - How we collect, use, and protect your data",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-16">
          <h1 className="text-4xl font-bold text-white mb-8">Privacy Policy</h1>
          <p className="text-zinc-400 mb-8">
            Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </p>

          <div className="prose prose-invert prose-zinc max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                1. Overview
              </h2>
              <p className="text-zinc-300 leading-relaxed">
                CardTool (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) is committed to protecting your privacy.
                This Privacy Policy explains how we collect, use, disclose, and safeguard
                your information when you use our credit card rewards tracking service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                2. Information We Collect
              </h2>
              <h3 className="text-xl font-medium text-zinc-200 mb-3">
                Account Information
              </h3>
              <ul className="list-disc list-inside text-zinc-300 space-y-2 mb-4">
                <li>Email address and name (from Clerk authentication)</li>
                <li>Account preferences and settings</li>
              </ul>

              <h3 className="text-xl font-medium text-zinc-200 mb-3">
                Card Tracking Data
              </h3>
              <ul className="list-disc list-inside text-zinc-300 space-y-2 mb-4">
                <li>Which credit cards you have added to your wallet</li>
                <li>Custom card names you create</li>
                <li>
                  <strong>We do NOT collect:</strong> Actual credit card numbers,
                  CVVs, or other payment credentials
                </li>
              </ul>

              <h3 className="text-xl font-medium text-zinc-200 mb-3">
                Spending Data
              </h3>
              <ul className="list-disc list-inside text-zinc-300 space-y-2 mb-4">
                <li>
                  User-entered annual spending estimates by category (e.g., &quot;I spend
                  $500/month on groceries&quot;)
                </li>
                <li>This data is self-reported and not linked to actual transactions</li>
              </ul>

              <h3 className="text-xl font-medium text-zinc-200 mb-3">
                Usage Data
              </h3>
              <ul className="list-disc list-inside text-zinc-300 space-y-2">
                <li>Pages visited and features used</li>
                <li>Error logs and performance data</li>
                <li>Device and browser information</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                3. How We Use Your Information
              </h2>
              <ul className="list-disc list-inside text-zinc-300 space-y-2">
                <li>
                  <strong>Provide the service:</strong> Calculate and display reward
                  earnings based on your cards and spending
                </li>
                <li>
                  <strong>Verify membership:</strong> Check subscription status via Stripe
                </li>
                <li>
                  <strong>Improve the product:</strong> Analyze aggregate usage patterns
                </li>
                <li>
                  <strong>Communicate with you:</strong> Respond to feedback and support requests
                </li>
                <li>
                  <strong>Ensure security:</strong> Detect and prevent fraud or abuse
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                4. Third-Party Services
              </h2>
              <p className="text-zinc-300 leading-relaxed mb-4">
                We use the following third-party services to provide CardTool:
              </p>
              <ul className="list-disc list-inside text-zinc-300 space-y-2">
                <li>
                  <strong>Clerk:</strong> Authentication and user management
                </li>
                <li>
                  <strong>Supabase:</strong> Database hosting
                </li>
                <li>
                  <strong>Stripe:</strong> Membership verification (email only)
                </li>
                <li>
                  <strong>Vercel:</strong> Application hosting
                </li>
                <li>
                  <strong>Sentry:</strong> Error tracking and monitoring
                </li>
                <li>
                  <strong>Plaid:</strong> Optional bank account linking (see Section 6)
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                5. Data Retention
              </h2>
              <ul className="list-disc list-inside text-zinc-300 space-y-2">
                <li>
                  <strong>Active accounts:</strong> Data retained while your account is active
                </li>
                <li>
                  <strong>Deleted accounts:</strong> Data removed within 30 days of deletion
                </li>
                <li>
                  <strong>Logs:</strong> Retained for 7-14 days depending on service tier
                </li>
                <li>
                  <strong>Backups:</strong> Retained for 7-30 days depending on infrastructure
                </li>
              </ul>
            </section>

            <section className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6">
              <h2 className="text-2xl font-semibold text-blue-300 mb-4">
                6. Optional Bank Account Linking (Plaid)
              </h2>
              <p className="text-zinc-300 leading-relaxed mb-4 font-medium">
                This section applies ONLY if you choose to enable our optional bank account
                linking feature. If you do not use this feature, none of the following data
                is collected or shared.
              </p>

              <h3 className="text-xl font-medium text-zinc-200 mb-3">
                What is Plaid?
              </h3>
              <p className="text-zinc-300 leading-relaxed mb-4">
                Plaid Inc. is our third-party service provider that enables you to securely
                connect your bank accounts to CardTool. When you link an account, you are
                granting Plaid permission to access your financial institution on your behalf.
              </p>

              <h3 className="text-xl font-medium text-zinc-200 mb-3">
                What Data Does Plaid Collect?
              </h3>
              <ul className="list-disc list-inside text-zinc-300 space-y-2 mb-4">
                <li>Your bank account and routing numbers</li>
                <li>Account balances and credit limits</li>
                <li>Account holder name</li>
                <li>Transaction history (used only to retrieve balances)</li>
              </ul>

              <h3 className="text-xl font-medium text-zinc-200 mb-3">
                What Data Do We Store?
              </h3>
              <p className="text-zinc-300 leading-relaxed mb-2">
                From the data Plaid provides, CardTool stores ONLY:
              </p>
              <ul className="list-disc list-inside text-zinc-300 space-y-2 mb-4">
                <li>Account name (e.g., &quot;Chase Sapphire Reserve&quot;)</li>
                <li>Last 4 digits of account number (masked)</li>
                <li>Current balance and credit limit</li>
                <li>Last update timestamp</li>
              </ul>

              <p className="text-zinc-300 leading-relaxed mb-2 font-medium">
                We do NOT store:
              </p>
              <ul className="list-disc list-inside text-zinc-300 space-y-2 mb-4">
                <li>Full account numbers or routing numbers</li>
                <li>Transaction history</li>
                <li>Your bank login credentials (these never leave Plaid)</li>
              </ul>

              <h3 className="text-xl font-medium text-zinc-200 mb-3">
                Your Control
              </h3>
              <ul className="list-disc list-inside text-zinc-300 space-y-2 mb-4">
                <li>You can unlink any account at any time in Settings</li>
                <li>Unlinking immediately removes all associated data from our database</li>
                <li>
                  You can also manage Plaid connections at{" "}
                  <a
                    href="https://my.plaid.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline"
                  >
                    my.plaid.com
                  </a>
                </li>
              </ul>

              <h3 className="text-xl font-medium text-zinc-200 mb-3">
                Plaid&apos;s Privacy Policy
              </h3>
              <p className="text-zinc-300 leading-relaxed">
                Plaid&apos;s privacy practices are governed by their{" "}
                <a
                  href="https://plaid.com/legal/#end-user-privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline"
                >
                  End User Privacy Policy
                </a>
                .
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                7. Data Security
              </h2>
              <ul className="list-disc list-inside text-zinc-300 space-y-2">
                <li>All data is encrypted in transit using HTTPS/TLS</li>
                <li>Data is encrypted at rest in our database</li>
                <li>We use secure authentication through Clerk</li>
                <li>Access to production systems is strictly limited</li>
                <li>We conduct regular security reviews</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                8. Your Rights
              </h2>
              <p className="text-zinc-300 leading-relaxed mb-4">
                You have the right to:
              </p>
              <ul className="list-disc list-inside text-zinc-300 space-y-2">
                <li>
                  <strong>Access your data:</strong> View all data we have about you
                </li>
                <li>
                  <strong>Export your data:</strong> Download a copy of your data
                </li>
                <li>
                  <strong>Delete your account:</strong> Request complete deletion of your data
                </li>
                <li>
                  <strong>Correct your data:</strong> Update inaccurate information
                </li>
              </ul>
              <p className="text-zinc-300 leading-relaxed mt-4">
                To exercise these rights, visit your Settings page or contact us through
                the in-app feedback system.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                9. Children&apos;s Privacy
              </h2>
              <p className="text-zinc-300 leading-relaxed">
                CardTool is not intended for users under 18 years of age. We do not
                knowingly collect information from children. If you believe we have
                collected data from a child, please contact us immediately.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                10. Changes to This Policy
              </h2>
              <p className="text-zinc-300 leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you
                of any material changes by posting the new policy on this page and
                updating the &quot;Last updated&quot; date. Your continued use of the service
                after changes constitutes acceptance of the updated policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                11. Contact Us
              </h2>
              <p className="text-zinc-300 leading-relaxed">
                If you have any questions about this Privacy Policy, please contact us
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

