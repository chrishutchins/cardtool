# Deployment & Rollback Procedures

## Pre-Deployment Checklist

- [ ] All tests passing locally
- [ ] Health check endpoint responding
- [ ] Sentry configured and receiving events
- [ ] All environment variables set in production
- [ ] Database migrations applied
- [ ] Preview deployment tested

## Deployment Steps

1. **Merge to main branch:**
   ```bash
   git checkout main
   git merge feature-branch
   git push origin main
   ```

2. **Vercel auto-deploys** on push to main

3. **Monitor deployment:**
   - Watch Vercel dashboard for build success
   - Check `/api/health` endpoint
   - Monitor Sentry for new errors

## Rollback Procedure

### Option 1: Vercel Dashboard (Recommended)

1. Go to Vercel Dashboard > Deployments
2. Find the last known good deployment
3. Click "..." menu > "Promote to Production"
4. Deployment reverts in ~30 seconds

### Option 2: Git Revert

```bash
git revert HEAD
git push origin main
```

### Option 3: Instant Rollback (If Critical)

1. Open Vercel Dashboard
2. Click current production deployment
3. Click "..." > "Rollback"

## Database Rollback

Supabase doesn't have instant rollback. Options:

1. **Forward Fix (Preferred):**
   - Write migration to fix the issue
   - Deploy new code with fix

2. **Restore from Backup:**
   - RTO: ~30 minutes
   - Go to Supabase Dashboard > Settings > Backups
   - Download most recent backup
   - Contact Supabase support for restore

## Emergency Contacts

- **On-Call:** [Your contact method]
- **Supabase Status:** https://status.supabase.com
- **Vercel Status:** https://vercel-status.com
- **Clerk Status:** https://status.clerk.com

## Environment Variables Backup

Keep a local copy of production environment variables:

```bash
vercel env pull .env.production.local
```

## Monitoring

- **Health Check:** `/api/health`
- **Uptime Monitor:** UptimeRobot
- **Error Tracking:** Sentry
- **Analytics:** Vercel Analytics

## Post-Deployment Verification

1. Hit health check endpoint
2. Test login flow
3. Verify Stripe webhook delivery
4. Check Sentry for new errors (wait 5 min)
5. Spot-check critical features

## Known Issues Log

| Date | Issue | Resolution | Rollback Required? |
|------|-------|------------|-------------------|
| - | - | - | - |

