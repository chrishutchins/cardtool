# Production Launch Checklist

## ✅ Completed (Code Implementation)

### Operational Foundations (Phase 0)
- [x] Sentry error monitoring installed and configured
- [x] Pino structured logging with token redaction
- [x] Health check endpoint at `/api/health`
- [x] Database migration file created for new tables

### Critical Infrastructure (Phase 1)
- [x] Stripe webhook handler for member sync
- [x] Email verification API for signup whitelist
- [x] Rate limiting with Upstash
- [x] Security headers (CSP, HSTS, X-Frame-Options, etc.)
- [x] RLS/JWT security audit completed

### Error Handling (Phase 2)
- [x] Global error boundaries (error.tsx, not-found.tsx, global-error.tsx)
- [x] Console.log cleanup (reduced from 87 to ~30 in non-critical areas)
- [x] Rollback procedures documented

### Legal & Compliance (Phase 3)
- [x] Terms of Service page with financial disclaimer
- [x] Privacy Policy with Plaid carve-out
- [x] Cookie Policy
- [x] Footer component with legal links
- [x] Data export endpoint
- [x] Account deletion functionality

### User Experience (Phase 4)
- [x] Home page branding refresh
- [x] Empty state component created
- [x] In-app feedback system
- [x] User header with logo

### Code Quality (Phase 5)
- [x] SEO metadata on all user-facing pages

---

## ⏳ Manual Steps Required

### Verify Supabase Backups
1. Go to Supabase Dashboard > Settings > Database > Backups
2. Confirm daily backups are enabled
3. Note retention period (7 days Free, 30 days Pro)
4. [ ] Backups verified

### Apply Database Migration
1. Go to Supabase Dashboard > SQL Editor
2. Run the migration file: `supabase/migrations/20260104000000_add_stripe_members_and_feedback.sql`
3. [ ] Migration applied

### Clerk Production Migration
1. Go to dashboard.clerk.com
2. Create new production application
3. Configure allowed redirect URLs for custom domain
4. Update Vercel environment variables:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` → `pk_live_...`
   - `CLERK_SECRET_KEY` → `sk_live_...`
5. [ ] Clerk production configured

### Custom Domain Setup
1. Add domain in Vercel: Project Settings > Domains
2. Configure DNS (A/CNAME records)
3. Verify SSL certificate issued
4. Update Clerk with production domain
5. [ ] Custom domain configured

### Staging Environment Setup
1. Create preview branch: `git checkout -b preview && git push -u origin preview`
2. Configure Vercel preview deployments
3. Set preview environment variables (test keys)
4. [ ] Staging configured

### Stripe Webhook Setup
1. Go to Stripe Dashboard > Developers > Webhooks
2. Add endpoint: `https://yourdomain.com/api/stripe/webhook`
3. Select events: `customer.subscription.*`, `checkout.session.completed`
4. Copy webhook signing secret → `STRIPE_WEBHOOK_SECRET`
5. [ ] Stripe webhooks configured

### Upstash Redis Setup
1. Go to console.upstash.com
2. Create Redis database
3. Copy credentials to Vercel:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
4. [ ] Rate limiting configured

### Sentry Setup
1. Create project at sentry.io
2. Run: `npx @sentry/wizard@latest -i nextjs`
3. Add to Vercel:
   - `NEXT_PUBLIC_SENTRY_DSN`
   - `SENTRY_AUTH_TOKEN`
   - `SENTRY_ORG`
   - `SENTRY_PROJECT`
4. [ ] Sentry configured

### Uptime Monitoring
1. Sign up at uptimerobot.com (free)
2. Add monitor for `https://yourdomain.com/api/health`
3. Configure email alerts
4. [ ] Uptime monitoring configured

---

## 🧪 Testing Checklist

### Authentication
- [ ] Sign up with Stripe member email (auto-whitelisted)
- [ ] Sign up with non-member email + invite code
- [ ] Sign in / sign out
- [ ] Admin access works for admin emails
- [ ] Non-admin cannot access /admin routes

### Core Features
- [ ] Add card to wallet
- [ ] Remove card from wallet
- [ ] View total earnings
- [ ] Compare cards
- [ ] Track credit usage
- [ ] Update spending categories
- [ ] Modify point values
- [ ] Settings changes persist

### Plaid Integration (if enabled)
- [ ] Link bank account
- [ ] Unlink bank account
- [ ] Refresh account balances

### Feedback System
- [ ] Submit bug report
- [ ] Submit feature request
- [ ] Rate limiting after 3 submissions

### Mobile
- [ ] iPhone Safari
- [ ] Android Chrome
- [ ] Navigation works
- [ ] Forms usable

### Error Handling
- [ ] 404 page displays correctly
- [ ] Error boundary catches errors
- [ ] Sentry receives reports

---

## 🚀 Go/No-Go Criteria

All must pass before production deploy:

### Infrastructure
- [ ] Sentry configured and receiving events
- [ ] Uptime monitor configured
- [ ] Health check endpoint working
- [ ] Supabase backups confirmed
- [ ] All environment variables set
- [ ] Rate limiting working

### Security
- [ ] Service role key is server-only
- [ ] Plaid tokens never returned to client
- [ ] Security headers configured
- [ ] Admin routes protected

### Legal
- [ ] Terms of Service live
- [ ] Privacy Policy live
- [ ] Cookie notice live
- [ ] Footer with legal links

### User Experience
- [ ] Empty states helpful
- [ ] Mobile responsive
- [ ] Feedback button visible
- [ ] Error messages user-friendly

### Performance
- [ ] Lighthouse score >90 on key pages
- [ ] Database queries <500ms
- [ ] API responses <300ms

---

## Environment Variables Needed

### Production (Vercel)
```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Plaid
PLAID_CLIENT_ID=
PLAID_SECRET=
PLAID_ENV=production

# Sentry
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_AUTH_TOKEN=
SENTRY_ORG=
SENTRY_PROJECT=

# Upstash
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Admin
ADMIN_EMAILS=admin@example.com

# Invite Codes (fallback)
INVITE_CODES=BETA2024
```

