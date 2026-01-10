# Architecture

## Authentication & Authorization Model

This app uses **Clerk** for authentication, **not** Supabase Auth.

### How It Works

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Browser   │────▶│   Next.js   │────▶│  Supabase   │
│   (Clerk)   │     │   Server    │     │  Database   │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       │  Clerk JWT        │  Service Role     │
       │  (auth only)      │  Key (bypasses    │
       │                   │  RLS)             │
       ▼                   ▼                   ▼
   User identity      Clerk验证 +          No RLS -
   verified           manual user_id       all access
                      filtering            granted
```

### Security Enforcement

1. **Authentication**: Clerk handles all user authentication (signup, login, sessions)
2. **Authorization**: Enforced at the application layer in Next.js:
   - Routes call `currentUser()` from Clerk to verify authentication
   - Admin routes additionally check if the user is in the admin list
   - All database queries manually filter by `user_id` (via `effectiveUserId`)

### Why Service Role Key?

We use Supabase's **service role key** which bypasses Row Level Security (RLS) because:

- Clerk tokens don't integrate with Supabase's RLS `auth.jwt()` function without additional setup
- Security is enforced at the application layer instead
- This is a valid pattern when you control all database access through your backend

### Key Files

- `src/lib/supabase/server.ts` - Creates service role clients with prominent warnings
- `src/middleware.ts` - Clerk authentication middleware
- `src/lib/admin.ts` - Admin user list and checks
- `src/lib/emulation.ts` - Admin emulation helpers (uses `effectiveUserId`)

### What NOT to Do

- ❌ Don't assume RLS policies are protecting data - they're disabled
- ❌ Don't use the anon key for server-side operations
- ❌ Don't skip `currentUser()` checks before database access
- ❌ Don't forget to filter by `effectiveUserId` for user-specific data

### Database Access Pattern

```typescript
// ✅ Correct pattern
import { currentUser } from "@clerk/nextjs/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getEffectiveUserId } from "@/lib/emulation";

export default async function MyPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  
  const effectiveUserId = await getEffectiveUserId();
  const supabase = createServiceRoleClient();
  
  const { data } = await supabase
    .from("user_wallets")
    .select("*")
    .eq("user_id", effectiveUserId);  // Always filter by user!
}
```

### Historical Note

RLS policies existed in the database but were never actually enforced (service role bypasses them). They were removed in migration `20260110000001_remove_unused_rls_policies.sql` to prevent confusion during debugging.
