import { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "Terms of Service | CardTool",
  description: "Terms of Service for CardTool - Credit Card Rewards Optimizer",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-16">
          <h1 className="text-4xl font-bold text-white mb-8">
            Terms of Service
          </h1>
          <p className="text-zinc-400 mb-8">
            Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </p>

          <div className="prose prose-invert prose-zinc max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                1. Service Description
              </h2>
              <p className="text-zinc-300 leading-relaxed">
                CardTool is a credit card rewards tracking and optimization tool. We help you
                understand which credit cards earn the most rewards for your spending patterns.
                This service is for informational and educational purposes only.
              </p>
            </section>

            <section className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-6">
              <h2 className="text-2xl font-semibold text-amber-300 mb-4">
                2. Financial Disclaimer
              </h2>
              <p className="text-zinc-300 leading-relaxed mb-4">
                CardTool provides information about credit card rewards programs. This
                information is for educational and informational purposes only and should
                not be construed as financial advice.
              </p>
              <ul className="list-disc list-inside text-zinc-300 space-y-2">
                <li>
                  Reward values and calculations are estimates and may not reflect actual earnings
                </li>
                <li>
                  Credit card terms are subject to change by issuers without notice
                </li>
                <li>
                  We do not guarantee the accuracy of point valuations or reward calculations
                </li>
                <li>
                  Consult a financial advisor for personalized financial advice
                </li>
                <li>
                  Credit card applications and approvals are subject to issuer requirements
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                3. Account Terms
              </h2>
              <p className="text-zinc-300 leading-relaxed mb-4">
                During our beta period, account creation is by invitation only. By creating
                an account, you agree to:
              </p>
              <ul className="list-disc list-inside text-zinc-300 space-y-2">
                <li>Provide accurate and complete information</li>
                <li>Maintain the security of your account credentials</li>
                <li>Notify us immediately of any unauthorized access</li>
                <li>Accept responsibility for all activity under your account</li>
              </ul>
              <p className="text-zinc-300 leading-relaxed mt-4">
                We reserve the right to suspend or terminate accounts that violate these
                terms or for any other reason at our sole discretion.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                4. User Responsibilities
              </h2>
              <p className="text-zinc-300 leading-relaxed">
                You agree not to:
              </p>
              <ul className="list-disc list-inside text-zinc-300 space-y-2 mt-4">
                <li>Use the service for any illegal purpose</li>
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Share your account credentials with others</li>
                <li>Use automated tools to access the service without permission</li>
                <li>Interfere with or disrupt the service</li>
                <li>Reverse engineer or attempt to extract the source code</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                5. Limitation of Liability
              </h2>
              <p className="text-zinc-300 leading-relaxed mb-4">
                THE SERVICE IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTY OF ANY KIND. TO THE
                MAXIMUM EXTENT PERMITTED BY LAW:
              </p>
              <ul className="list-disc list-inside text-zinc-300 space-y-2">
                <li>
                  We make no warranties regarding the accuracy, reliability, or availability
                  of the service
                </li>
                <li>
                  We are not liable for any financial decisions made based on information
                  provided by the service
                </li>
                <li>
                  Our total liability shall not exceed the amount you paid us in the
                  12 months preceding the claim, or $100, whichever is greater
                </li>
                <li>
                  We are not liable for indirect, incidental, special, consequential, or
                  punitive damages
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                6. Third-Party Services
              </h2>
              <p className="text-zinc-300 leading-relaxed mb-4">
                CardTool integrates with third-party services to provide our functionality:
              </p>
              <ul className="list-disc list-inside text-zinc-300 space-y-2">
                <li>
                  <strong>Clerk:</strong> Authentication and account management
                </li>
                <li>
                  <strong>Stripe:</strong> Membership verification
                </li>
                <li>
                  <strong>Plaid</strong> (Optional): Bank account linking for balance display
                </li>
              </ul>
              <p className="text-zinc-300 leading-relaxed mt-4">
                Your use of these services is subject to their respective terms and
                privacy policies.
              </p>
            </section>

            <section className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6">
              <h2 className="text-2xl font-semibold text-blue-300 mb-4">
                7. Third-Party Services - Plaid
              </h2>
              <p className="text-zinc-300 leading-relaxed mb-4">
                If you choose to use our optional bank account linking feature:
              </p>
              <ul className="list-disc list-inside text-zinc-300 space-y-2">
                <li>
                  You authorize Plaid Inc. to access your financial accounts on your behalf
                </li>
                <li>
                  You agree to Plaid&apos;s{" "}
                  <a
                    href="https://plaid.com/legal/#end-user-privacy-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline"
                  >
                    End User Privacy Policy
                  </a>
                </li>
                <li>
                  This authorization can be revoked at any time via Settings or{" "}
                  <a
                    href="https://my.plaid.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline"
                  >
                    my.plaid.com
                  </a>
                </li>
                <li>
                  CardTool is not responsible for the availability or accuracy of data
                  provided by Plaid or your financial institution
                </li>
                <li>
                  Linking accounts is entirely optional and not required to use CardTool
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                8. Intellectual Property
              </h2>
              <p className="text-zinc-300 leading-relaxed">
                All content, features, and functionality of CardTool are owned by us and
                are protected by intellectual property laws. You may not copy, modify,
                distribute, or create derivative works without our explicit permission.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                9. Changes to Terms
              </h2>
              <p className="text-zinc-300 leading-relaxed">
                We may update these terms from time to time. We will notify you of any
                material changes by posting the new terms on this page. Your continued
                use of the service after changes constitutes acceptance of the new terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                10. Governing Law
              </h2>
              <p className="text-zinc-300 leading-relaxed">
                These terms shall be governed by and construed in accordance with the
                laws of the United States, without regard to its conflict of law provisions.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                11. Contact Us
              </h2>
              <p className="text-zinc-300 leading-relaxed">
                If you have any questions about these Terms of Service, please contact us
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

