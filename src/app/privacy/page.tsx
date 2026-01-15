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
                <li>Card open dates, close dates, and annual fee tracking</li>
                <li>Credit usage and benefit redemption history</li>
                <li>
                  <strong>We do NOT collect:</strong> Actual credit card numbers,
                  CVVs, or other payment credentials
                </li>
              </ul>

              <h3 className="text-xl font-medium text-zinc-200 mb-3">
                Multi-Player Data
              </h3>
              <p className="text-zinc-300 leading-relaxed mb-2">
                CardTool allows you to track cards and data for multiple household members
                (&quot;players&quot;). For additional players, we store:
              </p>
              <ul className="list-disc list-inside text-zinc-300 space-y-2 mb-4">
                <li>A player number (1-10)</li>
                <li>An optional description you provide</li>
              </ul>
              <p className="text-zinc-300 leading-relaxed mb-2 text-sm">
                We do not require identifying information about additional players. We recommend
                avoiding names or other identifying details in player descriptions. If you include
                identifying information in descriptions, notes, or other fields, we will store
                it as entered.
              </p>
              <p className="text-zinc-300 leading-relaxed mb-4 text-sm">
                By adding data for other household members, you represent that you have
                their consent to store their card and financial information in CardTool.
                See our Terms of Service for details.
              </p>

              <h3 className="text-xl font-medium text-zinc-200 mb-3">
                Spending Data
              </h3>
              <ul className="list-disc list-inside text-zinc-300 space-y-2 mb-4">
                <li>
                  User-entered annual spending estimates by category (e.g., &quot;I spend
                  $500/month on groceries&quot;)
                </li>
                <li>This data is optional, self-reported and not linked to actual transactions</li>
              </ul>

              <h3 className="text-xl font-medium text-zinc-200 mb-3">
                Inventory Data
              </h3>
              <p className="text-zinc-300 leading-relaxed mb-2">
                You may optionally track card benefits and items in our inventory system:
              </p>
              <ul className="list-disc list-inside text-zinc-300 space-y-2 mb-4">
                <li>Gift cards, travel credits, free night certificates</li>
                <li>Item names, brands, values, and expiration dates</li>
                <li>Optional codes and PINs (if you choose to store them)</li>
                <li>Usage notes</li>
              </ul>
              <p className="text-zinc-300 leading-relaxed mb-4 text-sm">
                Codes and PINs are stored on encrypted infrastructure (database-level encryption
                at rest), the same as other data. No method of storage is 100% secure. We
                recommend using a dedicated password manager for high-value credentials.
                Do not store Social Security numbers, full account numbers, or passwords.
                See our Terms of Service for liability limitations.
              </p>

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

            <section className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6">
              <h2 className="text-2xl font-semibold text-emerald-300 mb-4">
                4. We Do Not Sell Your Data
              </h2>
              <p className="text-zinc-300 leading-relaxed mb-4 font-medium">
                CardTool does not sell, rent, trade, or otherwise provide your personal
                information to any third parties for their marketing or commercial purposes.
              </p>
              <ul className="list-disc list-inside text-zinc-300 space-y-2">
                <li>
                  <strong>No data brokers:</strong> We never share your information with
                  data brokers or advertisers
                </li>
                <li>
                  <strong>No marketing lists:</strong> Your email and personal data are
                  never shared for third-party marketing
                </li>
                <li>
                  <strong>No profiling for others:</strong> We do not create profiles
                  about you to sell to other companies
                </li>
                <li>
                  <strong>Service providers only:</strong> The only third parties that
                  receive your data are the service providers listed below, solely to
                  operate CardTool
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                5. Third-Party Service Providers
              </h2>
              <p className="text-zinc-300 leading-relaxed mb-4">
                We use the following third-party services solely to operate CardTool.
                These providers only receive the minimum data necessary to perform their
                function:
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
                6. Data Retention
              </h2>
              <ul className="list-disc list-inside text-zinc-300 space-y-2">
                <li>
                  <strong>Active accounts:</strong> Data retained while your account is active
                </li>
                <li>
                  <strong>Deleted accounts:</strong> Data removed from active systems within
                  30 days of deletion request
                </li>
                <li>
                  <strong>Unlinked Plaid accounts:</strong> Data removed from active systems
                  promptly upon unlinking
                </li>
                <li>
                  <strong>Backups:</strong> May persist for up to 30 days after deletion/unlinking
                </li>
                <li>
                  <strong>Logs:</strong> Retained for 7-14 days for security and debugging
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                7. How We Disclose Data
              </h2>
              <p className="text-zinc-300 leading-relaxed mb-4">
                We do not sell your personal information. We may disclose data in the
                following circumstances:
              </p>
              <ul className="list-disc list-inside text-zinc-300 space-y-2">
                <li>
                  <strong>Service providers:</strong> To the third-party services listed
                  in Section 5, solely to operate CardTool
                </li>
                <li>
                  <strong>Legal requirements:</strong> When required by law, subpoena,
                  court order, or government request
                </li>
                <li>
                  <strong>Safety and fraud prevention:</strong> To protect the rights,
                  safety, or property of CardTool, our users, or others
                </li>
                <li>
                  <strong>Business transfers:</strong> In connection with a merger,
                  acquisition, or sale of assets (you would be notified)
                </li>
                <li>
                  <strong>With your direction:</strong> When you request data export
                  or authorize sharing
                </li>
              </ul>
            </section>

            <section className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6">
              <h2 className="text-2xl font-semibold text-blue-300 mb-4">
                8. Optional Bank Account Linking (Plaid)
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
                What Data Plaid May Access
              </h3>
              <p className="text-zinc-300 leading-relaxed mb-2 text-sm">
                Depending on your institution and the connection type, Plaid may access:
              </p>
              <ul className="list-disc list-inside text-zinc-300 space-y-2 mb-4">
                <li>Account and routing numbers</li>
                <li>Account balances and credit limits</li>
                <li>Account holder name</li>
                <li>Transaction history</li>
              </ul>

              <h3 className="text-xl font-medium text-zinc-200 mb-3">
                What CardTool Receives and Stores
              </h3>
              <p className="text-zinc-300 leading-relaxed mb-2">
                From the data Plaid provides, CardTool receives and stores only:
              </p>
              <ul className="list-disc list-inside text-zinc-300 space-y-2 mb-4">
                <li>Account name (e.g., &quot;Chase Sapphire Reserve&quot;)</li>
                <li>Last 4 digits of account number (masked)</li>
                <li>Current balance, available balance, and credit limit</li>
                <li>Account type (credit card, checking, etc.)</li>
                <li>Last update timestamp</li>
              </ul>
              <p className="text-zinc-300 leading-relaxed mb-4 text-sm">
                We do not receive or store full account numbers, routing numbers, or
                account holder names from Plaid.
              </p>

              <h3 className="text-xl font-medium text-zinc-200 mb-3">
                Transaction Data
              </h3>
              <p className="text-zinc-300 leading-relaxed mb-2">
                We store transaction data from your linked accounts to enable automatic
                credit detection (identifying when card benefits like Uber or airline
                credits are used). For each transaction, we store:
              </p>
              <ul className="list-disc list-inside text-zinc-300 space-y-2 mb-4">
                <li>Transaction name and merchant name</li>
                <li>Transaction amount</li>
                <li>Transaction date</li>
                <li>Plaid&apos;s category classification</li>
                <li>Pending status</li>
              </ul>
              <p className="text-zinc-300 leading-relaxed mb-4 text-sm">
                This transaction data is stored persistently on our servers and is updated
                regularly while your account remains linked. Data is retained until you
                unlink the account or delete your CardTool profile.
              </p>

              <p className="text-zinc-300 leading-relaxed mb-2 font-medium">
                We do NOT store:
              </p>
              <ul className="list-disc list-inside text-zinc-300 space-y-2 mb-4">
                <li>Full account numbers or routing numbers</li>
                <li>Your bank login credentials (these never leave Plaid)</li>
              </ul>

              <h3 className="text-xl font-medium text-zinc-200 mb-3">
                Your Control
              </h3>
              <ul className="list-disc list-inside text-zinc-300 space-y-2 mb-4">
                <li>You can unlink any account at any time in Settings</li>
                <li>Unlinking removes all associated account and transaction data from
                  active systems promptly; data may persist in backups for up to 30 days</li>
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

            <section className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-6">
              <h2 className="text-2xl font-semibold text-purple-300 mb-4">
                9. Optional Browser Extension (Tampermonkey Script)
              </h2>
              <p className="text-zinc-300 leading-relaxed mb-4 font-medium">
                This section applies ONLY if you choose to install and use our optional
                browser extension. If you do not use this feature, none of the following
                data is collected.
              </p>

              <h3 className="text-xl font-medium text-zinc-200 mb-3">
                What is the Browser Extension?
              </h3>
              <p className="text-zinc-300 leading-relaxed mb-4">
                The CardTool browser extension is a Tampermonkey userscript that allows you
                to import loyalty program balances and credit report data directly from
                program websites into CardTool.
              </p>

              <h3 className="text-xl font-medium text-zinc-200 mb-3">
                Technical Access Scope
              </h3>
              <p className="text-zinc-300 leading-relaxed mb-4">
                The extension requires broad website access permissions to function across
                different loyalty program websites. While the extension technically runs on
                all websites you visit, it only activates its data collection features on
                recognized loyalty program and credit bureau sites.
              </p>
              <div className="bg-zinc-800/50 rounded-lg p-4 mb-4">
                <p className="text-zinc-300 text-sm mb-2">
                  <strong className="text-purple-300">Why we request &quot;Read all website data&quot;:</strong>{" "}
                  To provide a seamless experience, the extension requires permission to detect
                  when you are on a supported financial or loyalty website.
                </p>
                <p className="text-zinc-300 text-sm">
                  <strong>Important:</strong> Because it runs on every site, the extension can
                  technically read page content anywhere. However, it is designed to only extract
                  data on supported sites and only transmit when you click Sync. It{" "}
                  <strong>never</strong> transmits data automatically or from unsupported sites.
                </p>
              </div>

              <h3 className="text-xl font-medium text-zinc-200 mb-3">
                Points Balance Data
              </h3>
              <p className="text-zinc-300 leading-relaxed mb-2">
                When you sync loyalty program balances, we collect:
              </p>
              <ul className="list-disc list-inside text-zinc-300 space-y-2 mb-4">
                <li>Loyalty program currency code (e.g., &quot;United MileagePlus&quot;)</li>
                <li>Point/mile balance amount</li>
                <li>Points expiration date (if available)</li>
                <li>Which player the balance is associated with</li>
              </ul>

              <h3 className="text-xl font-medium text-zinc-200 mb-3">
                Credit Report Data
              </h3>
              <p className="text-zinc-300 leading-relaxed mb-2 text-sm font-medium">
                Important: Credit report data displayed in CardTool is for your personal
                reference only. It is not intended to be used to make decisions about
                eligibility for credit, employment, housing, insurance, or other purposes
                covered by the Fair Credit Reporting Act (FCRA).
              </p>
              <p className="text-zinc-300 leading-relaxed mb-2">
                When you sync credit report data from credit bureau websites, we collect:
              </p>
              <ul className="list-disc list-inside text-zinc-300 space-y-2 mb-4">
                <li>Credit scores (FICO, VantageScore) with score type and date</li>
                <li>Credit bureau source (Equifax, Experian, TransUnion)</li>
                <li>Account information: account names, creditor names, account status
                  (open/closed), account types, date opened/closed</li>
                <li>Account balances: current balance, credit limit, high balance</li>
                <li>Masked account numbers (last 4 digits only)</li>
                <li>Hard inquiries: company name, inquiry date</li>
              </ul>

              <p className="text-zinc-300 leading-relaxed mb-2 font-medium">
                We do NOT collect via the browser extension:
              </p>
              <ul className="list-disc list-inside text-zinc-300 space-y-2 mb-4">
                <li>Social Security numbers</li>
                <li>Full account numbers</li>
                <li>Addresses or contact information</li>
                <li>Data from websites other than recognized loyalty/credit bureau sites</li>
                <li>Any data without your explicit action (clicking &quot;Sync&quot;)</li>
              </ul>

              <h3 className="text-xl font-medium text-zinc-200 mb-3">
                User Control and Transparency
              </h3>
              <ul className="list-disc list-inside text-zinc-300 space-y-2 mb-4">
                <li>Data is only sent when you explicitly click the &quot;Sync&quot; button</li>
                <li>The extension never sends data automatically or in the background</li>
                <li>The extension shows an overview of detected data before you sync</li>
                <li>The extension source code is open source and available for review</li>
                <li>You can uninstall the extension at any time</li>
              </ul>

              <h3 className="text-xl font-medium text-zinc-200 mb-3">
                Third-Party Website Terms
              </h3>
              <p className="text-zinc-300 leading-relaxed mb-4 text-sm">
                Your use of the extension to import data from third-party websites is subject
                to those websites&apos; terms of service. Some loyalty programs or credit bureaus
                may prohibit automated data collection. You are responsible for compliance
                with their terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                10. Data Security
              </h2>
              <ul className="list-disc list-inside text-zinc-300 space-y-2">
                <li>All data is encrypted in transit using HTTPS/TLS</li>
                <li>Data is stored on encrypted infrastructure (database-level encryption at rest)</li>
                <li>We use secure authentication through Clerk</li>
                <li>Access to production systems is strictly limited</li>
                <li>We conduct regular security reviews</li>
              </ul>
              <p className="text-zinc-300 leading-relaxed mt-4 text-sm">
                No method of transmission or storage is 100% secure. While we strive to
                protect your data, we cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                11. California Privacy Rights
              </h2>
              <p className="text-zinc-300 leading-relaxed mb-4">
                If you are a California resident, you have additional rights under the
                California Consumer Privacy Act (CCPA/CPRA):
              </p>
              <ul className="list-disc list-inside text-zinc-300 space-y-2 mb-4">
                <li>Right to know what personal information we collect and how it is used</li>
                <li>Right to delete your personal information</li>
                <li>Right to correct inaccurate personal information</li>
                <li>Right to opt-out of the sale or sharing of personal information</li>
                <li>Right to limit use of sensitive personal information</li>
              </ul>
              <p className="text-zinc-300 leading-relaxed mb-4">
                <strong>We do not sell or share your personal information</strong> as defined
                by California law. We do not use sensitive personal information for purposes
                other than providing the CardTool service.
              </p>
              <p className="text-zinc-300 leading-relaxed text-sm">
                To exercise your California privacy rights, visit Settings or contact us
                through the in-app feedback system. We will not discriminate against you
                for exercising your rights.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                12. Your Rights
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
                <li>
                  <strong>Limit use of sensitive information:</strong> You can opt-out of our
                  collection of transaction data or credit report data at any time by unlinking
                  Plaid accounts in Settings or uninstalling the browser extension
                </li>
              </ul>
              <p className="text-zinc-300 leading-relaxed mt-4">
                To exercise these rights, visit your Settings page or contact us through
                the in-app feedback system.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                13. Children&apos;s Privacy
              </h2>
              <p className="text-zinc-300 leading-relaxed">
                CardTool is not intended for users under 18 years of age. We do not
                knowingly collect information from children. If you believe we have
                collected data from a child, please contact us immediately.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                14. Changes to This Policy
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
                15. Contact Us
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

