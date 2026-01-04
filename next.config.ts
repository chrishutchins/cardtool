import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// Clerk frontend API domain - derived from publishable key or set explicitly
// For custom domains, Clerk uses clerk.<your-domain> pattern
const clerkFrontendApi = process.env.NEXT_PUBLIC_CLERK_FRONTEND_API || "";

const nextConfig: NextConfig = {
  async headers() {
    // Build CSP Clerk domains dynamically
    const clerkDomains = [
      "https://*.clerk.accounts.dev", // Development
      clerkFrontendApi ? `https://${clerkFrontendApi}` : "", // Production custom domain
    ]
      .filter(Boolean)
      .join(" ");

    return [
      {
        source: "/:path*",
        headers: [
          // Prevent clickjacking
          { key: "X-Frame-Options", value: "DENY" },

          // MIME type sniffing protection
          { key: "X-Content-Type-Options", value: "nosniff" },

          // Referrer policy
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },

          // Force HTTPS (once you're on custom domain)
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },

          // Permissions policy (disable unused features)
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },

          // Content Security Policy
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              `script-src 'self' 'unsafe-eval' 'unsafe-inline' https://challenges.cloudflare.com ${clerkDomains}`,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: blob:",
              "font-src 'self' data:",
              `connect-src 'self' https://api.clerk.com ${clerkDomains} https://*.supabase.co https://*.sentry.io https://*.ingest.sentry.io`,
              "frame-src 'self' https://challenges.cloudflare.com https://*.clerk.accounts.dev",
              "frame-ancestors 'none'",
              "worker-src 'self' blob:",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  tunnelRoute: "/monitoring",

  // Source maps configuration
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },

  // Enables automatic instrumentation of Vercel Cron Monitors.
  // Does not yet work with App Router route handlers.
  // See: https://docs.sentry.io/product/crons/
});
