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
              <p className="text-zinc-300 leading-relaxed mb-4">
                CardTool is a credit card rewards tracking and optimization tool. We help you
                understand which credit cards earn the most rewards for your spending patterns.
                This service is for informational and educational purposes only.
              </p>
              <p className="text-zinc-300 leading-relaxed mb-4">
                CardTool offers the following features:
              </p>
              <ul className="list-disc list-inside text-zinc-300 space-y-2">
                <li>
                  <strong>Card wallet management:</strong> Track your credit cards and their
                  benefits, including support for managing cards across multiple household members
                  (&quot;players&quot;)
                </li>
                <li>
                  <strong>Rewards optimization:</strong> Calculate which card to use for different
                  purchase categories
                </li>
                <li>
                  <strong>Credit tracking:</strong> Monitor card credits, benefits, and their usage
                </li>
                <li>
                  <strong>Bank account linking:</strong> Optionally connect accounts via Plaid to
                  sync balances, transactions, and statement information for automatic credit detection
                </li>
                <li>
                  <strong>Points balance tracking:</strong> Track loyalty program balances across
                  airlines, hotels, and bank programs
                </li>
                <li>
                  <strong>Credit report monitoring:</strong> Track credit scores and report data
                  from multiple bureaus
                </li>
                <li>
                  <strong>Inventory management:</strong> Track gift cards, travel credits,
                  certificates, and other card benefits
                </li>
                <li>
                  <strong>Tampermonkey script:</strong> Optional userscript to import
                  loyalty balances and credit report data from program websites
                </li>
              </ul>
            </section>

            <section className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-6">
              <h2 className="text-2xl font-semibold text-amber-300 mb-4">
                2. Financial &amp; Credit Report Disclaimer
              </h2>
              <p className="text-zinc-300 leading-relaxed mb-4">
                CardTool provides information about credit card rewards programs. This
                information is for educational and informational purposes only and should
                not be construed as financial advice.
              </p>
              
              <div className="bg-zinc-800/50 rounded-lg p-4 mb-4">
                <h3 className="text-lg font-medium text-amber-300 mb-2">
                  Not a Credit Reporting Agency
                </h3>
                <p className="text-zinc-300 leading-relaxed mb-2 text-sm">
                  CardTool is <strong>not a consumer reporting agency</strong> as defined by the 
                  Fair Credit Reporting Act (FCRA). Any credit scores or report data displayed are 
                  for your convenience only and are retrieved via third-party sources (such as 
                  the Tampermonkey script or connected accounts).
                </p>
                <p className="text-zinc-300 leading-relaxed mb-2 text-sm font-medium">
                  Credit report data displayed in CardTool is <strong>not intended to be used</strong> to 
                  make decisions about eligibility for credit, employment, housing, insurance, or 
                  other purposes covered by the FCRA.
                </p>
                <p className="text-zinc-300 leading-relaxed text-sm">
                  <strong>Do not rely on CardTool as your official credit report.</strong> Data may 
                  be incomplete, delayed, or differ from official bureau reports. We are not 
                  responsible for any inaccuracies in data imported via Plaid or the Tampermonkey script.
                </p>
              </div>

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

              <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 mt-6">
                <h3 className="text-lg font-medium text-zinc-200 mb-3">
                  Beta Service
                </h3>
                <p className="text-zinc-300 leading-relaxed mb-4 text-sm">
                  CardTool is currently in beta. This means:
                </p>
                <ul className="list-disc list-inside text-zinc-300 space-y-2 text-sm mb-4">
                  <li>Features may change, be modified, or be discontinued without notice</li>
                  <li>The service may experience downtime or interruptions</li>
                  <li>We may modify data schemas or storage methods</li>
                  <li>Bugs or errors may occur that affect your data</li>
                </ul>
                <p className="text-zinc-300 leading-relaxed text-sm font-medium">
                  We are not responsible for data loss resulting from service changes, bugs, 
                  system failures, or discontinuation of the service. We recommend maintaining 
                  your own records of important information.
                </p>
              </div>

              <h3 className="text-lg font-medium text-zinc-200 mt-6 mb-3">
                Multi-Player / Household Data
              </h3>
              <p className="text-zinc-300 leading-relaxed">
                If you use CardTool&apos;s multi-player feature to track cards or data for
                other household members, you represent and warrant that you have obtained
                appropriate consent from those individuals to input their card information,
                credit data, or other personal details into our service. You are solely
                responsible for ensuring you have the authority to manage this data on
                their behalf.
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
                <li>
                  We are not liable for data loss, data corruption, or service interruptions
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
                  <strong>Plaid</strong> (Optional): Bank account linking for balance and
                  transaction syncing
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
                  You authorize CardTool to retrieve account balances, credit limits, statement
                  information, and transaction history from your linked accounts
                </li>
                <li>
                  Transaction data is used to automatically detect credit card benefit usage
                  (e.g., Uber credits, airline credits, dining credits)
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

            <section className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-6">
              <h2 className="text-2xl font-semibold text-purple-300 mb-4">
                8. Tampermonkey Script
              </h2>
              <p className="text-zinc-300 leading-relaxed mb-4">
                CardTool offers an optional Tampermonkey userscript that allows you to import 
                loyalty program balances and credit report data directly from program websites.
                Tampermonkey is a popular browser add-on that runs user scripts on web pages.
              </p>

              <h3 className="text-lg font-medium text-zinc-200 mb-3">
                How It Works
              </h3>
              <ul className="list-disc list-inside text-zinc-300 space-y-2 mb-4">
                <li>
                  The script runs in your browser and detects when you visit supported
                  loyalty program or credit bureau websites
                </li>
                <li>
                  Data is only sent to CardTool when you explicitly click the &quot;Sync&quot;
                  button - it is never sent automatically
                </li>
                <li>
                  The script is open source and available for review at any time
                </li>
              </ul>

              <h3 className="text-lg font-medium text-zinc-200 mb-3">
                Technical Access
              </h3>
              <p className="text-zinc-300 leading-relaxed mb-4 text-sm">
                The script requires broad website access permissions 
                (<code className="bg-zinc-800 px-1 rounded">@match *://*/*</code>) to function
                across different loyalty program sites. While the script technically has
                access to page content on websites you visit, it only reads data from
                recognized sites and only transmits data when you initiate a sync.
              </p>

              <h3 className="text-lg font-medium text-zinc-200 mb-3">
                Your Responsibilities
              </h3>
              <p className="text-zinc-300 leading-relaxed mb-4">
                By using the Tampermonkey script, you acknowledge that you are manually
                initiating a transfer of data from your loyalty program or credit provider
                to CardTool. You are responsible for ensuring that this action does not
                violate the terms of service of those third-party websites.
              </p>
              <ul className="list-disc list-inside text-zinc-300 space-y-2">
                <li>
                  You are responsible for ensuring your use of the script complies with
                  the terms of service of the websites you access
                </li>
                <li>
                  You acknowledge that some loyalty programs may prohibit automated data
                  collection in their terms of service
                </li>
                <li>
                  CardTool is not responsible for any consequences arising from your use
                  of the script on third-party websites, including account suspension
                  or termination by those services
                </li>
                <li>
                  <strong>We do not guarantee that the script will work on any particular site;</strong>{" "}
                  websites may change their structure and break compatibility at any time
                </li>
                <li>
                  CardTool is <strong>not affiliated with</strong> the loyalty programs, banks, or credit
                  bureaus whose websites you access unless explicitly stated
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                9. Intellectual Property
              </h2>
              <p className="text-zinc-300 leading-relaxed">
                All content, features, and functionality of CardTool are owned by us and
                are protected by intellectual property laws. You may not copy, modify,
                distribute, or create derivative works without our explicit permission.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                10. Changes to Terms
              </h2>
              <p className="text-zinc-300 leading-relaxed">
                We may update these terms from time to time. We will notify you of any
                material changes by posting the new terms on this page. Your continued
                use of the service after changes constitutes acceptance of the new terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                11. User Content
              </h2>
              <p className="text-zinc-300 leading-relaxed mb-4">
                You may submit content to CardTool, including inventory notes, spending
                estimates, player descriptions, and other user-generated data.
              </p>
              <ul className="list-disc list-inside text-zinc-300 space-y-2">
                <li>You retain ownership of content you submit</li>
                <li>
                  You grant CardTool a limited, non-exclusive license to host, store,
                  and process your content solely to operate and provide the service
                </li>
                <li>
                  You represent that you have the right to submit any content you provide
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                12. Governing Law and Jurisdiction
              </h2>
              <p className="text-zinc-300 leading-relaxed">
                These terms shall be governed by and construed in accordance with the
                laws of the State of Delaware, without regard to its conflict of law
                provisions. Any disputes arising from these terms or your use of CardTool
                shall be resolved in the state or federal courts located in Delaware,
                and you consent to the personal jurisdiction of such courts.
              </p>
            </section>

            <section className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-6">
              <h2 className="text-2xl font-semibold text-zinc-200 mb-4">
                13. Dispute Resolution and Arbitration
              </h2>
              <p className="text-zinc-300 leading-relaxed mb-4">
                <strong>Please read this section carefully. It affects your legal rights.</strong>
              </p>
              <p className="text-zinc-300 leading-relaxed mb-4">
                You and CardTool agree to resolve any disputes arising from these terms or
                your use of the service through binding individual arbitration, rather than
                in court, except that either party may bring claims in small claims court
                if eligible.
              </p>
              <h3 className="text-lg font-medium text-zinc-200 mb-3">
                Arbitration Rules
              </h3>
              <ul className="list-disc list-inside text-zinc-300 space-y-2 mb-4">
                <li>
                  Arbitration will be conducted by JAMS under its Streamlined Arbitration
                  Rules, or by another mutually agreed arbitration provider
                </li>
                <li>
                  The arbitration will be held in Delaware or another mutually agreed location,
                  or may be conducted remotely
                </li>
                <li>The arbitrator&apos;s decision will be final and binding</li>
              </ul>
              <h3 className="text-lg font-medium text-zinc-200 mb-3">
                Class Action Waiver
              </h3>
              <p className="text-zinc-300 leading-relaxed mb-4">
                You agree to resolve disputes with CardTool on an individual basis only.
                You waive any right to participate in a class action lawsuit or class-wide
                arbitration against CardTool.
              </p>
              <p className="text-zinc-300 leading-relaxed text-sm">
                You may opt out of this arbitration agreement by sending written notice to
                us within 30 days of first accepting these terms. If you opt out, the
                Governing Law and Jurisdiction section will apply.
              </p>
            </section>

            <section className="bg-red-500/10 border border-red-500/20 rounded-xl p-6">
              <h2 className="text-2xl font-semibold text-red-300 mb-4">
                14. Storage of Codes and PINs
              </h2>
              <p className="text-zinc-300 leading-relaxed mb-4">
                If you use the Inventory Tracking feature to store gift card PINs, security
                codes, access keys, or other sensitive credentials, you do so at your own
                risk.
              </p>
              <div className="bg-zinc-800/50 rounded-lg p-4 mb-4">
                <p className="text-zinc-300 leading-relaxed text-sm font-medium mb-2">
                  <strong className="text-red-300">Do not store:</strong>
                </p>
                <ul className="list-disc list-inside text-zinc-300 space-y-1 text-sm">
                  <li>Social Security numbers</li>
                  <li>Full credit card or bank account numbers</li>
                  <li>Bank passwords or login credentials</li>
                  <li>Other highly sensitive personal identifiers</li>
                </ul>
                <p className="text-zinc-300 leading-relaxed text-sm mt-3">
                  We may remove content that appears to include such information.
                </p>
              </div>
              <ul className="list-disc list-inside text-zinc-300 space-y-2">
                <li>
                  CardTool is not responsible for the loss, theft, or unauthorized access
                  of any manually entered sensitive credentials
                </li>
                <li>
                  Data is stored on encrypted infrastructure, but no method is 100% secure;
                  we recommend using a dedicated password manager for high-value credentials
                </li>
                <li>
                  You are responsible for the accuracy of any codes or PINs you enter
                </li>
                <li>
                  We are not liable for any financial loss resulting from compromised,
                  incorrect, or expired codes stored in our system
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                15. Contact Us
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
