# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Credit card rewards tracking and optimization app.
- **Domain**: cardtool.app
- **Production URL**: https://cardtool.app

## Stack
- Next.js 16 (App Router), TypeScript, Tailwind CSS
- Supabase PostgreSQL with Row Level Security
- Clerk for authentication
- Stripe for payments
- Plaid for bank account linking and transaction sync
- Recharts for charts
- Upstash Redis for rate limiting
- Sentry for error tracking

## Commands
- `npm run dev` — Start dev server
- `npm run build` — Build and typecheck (MUST pass before any commit)
- No test framework — `npm run build` is the quality gate

## Architecture

### Authentication & Database Access
The app uses **Clerk for authentication** but **Supabase with a service role key** for all server-side database access. RLS policies exist in the database as defense-in-depth, but the service role key bypasses them. Security is enforced at the application layer:
- Server components call `currentUser()` from Clerk to verify identity
- All queries filter by `user_id` using `getEffectiveUserId()` from `src/lib/emulation.ts`
- Admin access is checked via `isAdminEmail()` against the `ADMIN_EMAILS` env var

### Supabase Clients
- **Server**: `createServiceRoleClient()` from `@/lib/supabase/server` — bypasses RLS, used in all server code
- **Client**: `useSupabaseClient()` hook from `@/lib/supabase/client` — uses Clerk JWT, respects RLS

### Data Fetching Pattern
Pages are server components that fetch data with `Promise.all()`, then pass results as props to client components:
- **Reference data** (cards, categories, currencies): cached via `unstable_cache` with 1-hour TTL and tag-based invalidation (`src/lib/cached-data.ts`)
- **User data**: always fetched fresh from Supabase

### Cache Invalidation
After mutating reference data in admin pages, call the appropriate function from `src/lib/cache-invalidation.ts`:
- `invalidateCardCaches()`, `invalidateCategoryCaches()`, `invalidateCurrencyCaches()`, `invalidateTemplateCaches()`, `invalidateMultiplierCaches()`, `invalidateCreditCaches()`
- `invalidateAllReferenceCaches()` — nuclear option

### Server Actions
Defined inline in `page.tsx` server components (not in separate files). Pattern:
```typescript
// In page.tsx (server component)
async function doSomething() {
  "use server";
  const effectiveUserId = await getEffectiveUserId();
  const supabase = createServiceRoleClient();
  // ... mutation ...
  revalidatePath("/page");
}
// Pass to client component as prop
<ClientComponent onAction={doSomething} />
```

### Admin Emulation
`getEffectiveUserId()` in `src/lib/emulation.ts` resolves user identity in priority order:
1. Emulated user ID (admin testing via cookies)
2. Dev user ID mapping (`DEV_USER_ID_SOURCE` → `DEV_USER_ID_TARGET` env vars for local dev with prod data)
3. Current Clerk user ID

Most database queries should use `getEffectiveUserId()` instead of raw `currentUser().id`.

### Webhooks
Three webhook handlers:
- `/api/clerk/webhook` — Svix signature verification, handles `user.created`
- `/api/stripe/webhook` — Stripe HMAC verification, handles subscription events
- `/api/plaid/webhook` — handles transaction sync and item events, always returns 200 to prevent retries

### Rate Limiting
API routes use Upstash Redis rate limiting via `src/lib/rate-limit.ts`. New API endpoints handling user input should use the appropriate limiter.

### Signup & Payment Flow
1. User pays via Stripe → record created in `stripe_members`
2. User verifies email at `/api/verify-email` (checked against `stripe_members`)
3. `pending_signups` record created with optional invite code
4. User creates Clerk account → `user.created` webhook fires
5. Webhook creates `user_feature_flags` with Plaid tier from invite code

### Plaid Integration
- **Webhook-driven transaction sync** with cursor-based pagination (`user_plaid_sync_state`)
- Transactions auto-matched to card credits via `credit-matcher.ts` pattern rules
- Balance refreshes use `accountsGet()` (free cached balances), NOT `accountsBalanceGet()`
- Feature-gated by `user_feature_flags`: `plaid_transactions_enabled`, `plaid_liabilities_enabled`, `plaid_on_demand_refresh_enabled`

### Points Balance Importing (Tampermonkey Script)
Two import mechanisms in the userscript:
1. **Server-driven configs** (`site_configs` table) — scraping recipes that can be updated without pushing a new script version
2. **Hard-coded importers** — look at XHR requests or DOM; require a script update to change

The script calls `POST /api/points/import` (rate limited to 60/min per user).

### Multi-Player Support
`user_players` and `player_number` on point balances support households where one person manages cards/points for multiple family members, treating them as one optimized system.

## Domain Concepts

### Rewards Optimization Engine (`returns-calculator.ts`)
Multi-pass greedy allocation with re-ranking. For each spending category, allocates to the best card, re-ranks when caps exhaust, and recalculates. Key nuances:
- **Marginal value** for top-category selection (not absolute spend)
- **Shared cap keys** across mobile pay/PayPal categories
- **Bilt Housing Points** special logic (housing spend caps, tiered rates)
- **>$5k purchases** split into virtual categories for independent optimization
- **Post-allocation bonus calculation** (bonuses depend on total card spend)
- **Booking method preferences** for travel subcategories (direct/portal/brand)

### Card Credits vs Card Benefits
- **`card_credits`** — trackable statement credits with dollar values, matching rules, and usage tracking (e.g., "$15/month Uber credit"). Matched to Plaid transactions automatically.
- **`card_benefits`** / **`spreadsheet_card_benefits`** — broader card perks catalog (lounge access, travel insurance, purchase protection, etc.) that aren't necessarily dollar-trackable. The spreadsheet data was a one-time import and the import tooling can be removed.
- **Planned feature**: Let users assign perceived values to both credits and benefits to estimate total card value vs. annual fee.

### Kudos Data (`kudos_*` tables)
Crawled from an external card database site. Currently dormant — sitting in the DB as a reference catalog. Future use: if a user wants a card not in our database, we may build a way to add it from Kudos data.

### Issuer Billing Formulas (`billing-cycle.ts`)
Each card issuer uses a different formula to calculate statement close dates from due dates (or vice versa). 8 formula types supported: Capital One, Amex/Wells Fargo, Chase personal/business, BoA, Citi, US Bank.

## Key Files
- `src/lib/returns-calculator.ts` — Core rewards optimization algorithm (2,222 lines)
- `src/lib/billing-cycle.ts` — Issuer-specific statement date calculations (863 lines)
- `src/lib/credit-matcher.ts` — Transaction-to-credit matching (745 lines)
- `src/lib/cached-data.ts` — Reference data caching with tag invalidation
- `src/lib/emulation.ts` — Admin user impersonation and dev user mapping
- `src/lib/database.types.ts` — **Auto-generated from Supabase schema, MUST update when schema changes**

## Database Migrations
1. Create migration in `supabase/migrations/`
2. **ALWAYS update `src/lib/database.types.ts`** in the same commit
3. **ALWAYS enable RLS on new tables**

### RLS Policy Patterns

**User tables** (have `user_id` column):
```sql
CREATE POLICY "Users can manage their own data"
  ON table_name FOR ALL TO authenticated
  USING (user_id = (auth.jwt()->>'sub'))
  WITH CHECK (user_id = (auth.jwt()->>'sub'));
```

**Reference tables** (read-only shared data):
```sql
CREATE POLICY "Authenticated users can read"
  ON table_name FOR SELECT TO authenticated
  USING (true);
```

**Service-role-only tables**: Enable RLS but add NO policies.

## Date Handling (CRITICAL)
- **NEVER** use `new Date(dateString)` for date-only strings — use `parseLocalDate()`
- **NEVER** use `date.toISOString().split('T')[0]` — use `formatDateToString()`
- Import date utilities from `@/lib/utils`:
  - `parseLocalDate(str)` — parse `YYYY-MM-DD` in local timezone
  - `formatDateToString(date)` — format Date to `YYYY-MM-DD` in local timezone
  - `extractDateFromISO(str)` — extract date part from ISO string without timezone conversion
  - `formatDate(str, options?)` — display-friendly formatting
- Date-only fields: `YYYY-MM-DD` string
- Timestamps: Full ISO via `new Date().toISOString()`

## UI Patterns
- Dark theme: zinc-900/950 backgrounds, zinc-300/400 text
- Server components by default, `'use client'` only when needed
- Mutations through server actions defined inline in page.tsx
- Tooltip styling uses fixed positioning (see existing Tooltip components)

## Git Workflow
- **NEVER commit or push unless explicitly instructed**
- Run `npm run build` and verify it passes before any commit
- Always ask "Ready to push?" before pushing
