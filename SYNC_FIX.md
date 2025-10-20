# Sync Fix - October 19, 2025

## Problem
The D1 database had 12 registered users but **0 recommendations** synced. All user data was only stored locally in IndexedDB and not syncing to the server.

## Root Cause
Cookie name mismatch in the authentication system:
- `/api/auth/me` was creating session cookies named `session-user-id` (with dash)
- `getCurrentUser()` in `src/lib/server/auth.ts` was looking for `session_user_id` (with underscore)
- Result: Session users weren't recognized as authenticated for API calls, so sync endpoint returned 401 Unauthorized

## Fix Applied
Updated `getCurrentUser()` in `src/lib/server/auth.ts` to check for both cookie naming conventions:
```typescript
export async function getCurrentUser(event: RequestEvent): Promise<string | null> {
  const webAuthnUserId = event.cookies.get('user-id');
  const sessionUserId = event.cookies.get('session-user-id');  // Added this line
  const legacyUserId = event.cookies.get('session_user_id');
  return webAuthnUserId || sessionUserId || legacyUserId || null;
}
```

## Additional Improvements
- Added detailed logging to sync service to help debug future sync issues
- Logs now show:
  - Number of items being synced
  - Success/failure counts
  - Detailed error messages

## Recovery
Users with existing local data will automatically sync once they:
1. Visit the site again (triggers initial pull sync)
2. Add/edit a recommendation (triggers auto-sync)
3. Wait 30 seconds (triggers periodic background sync)

No manual intervention or data migration required.

## Verification
After users visit the site, check sync status with:
```bash
npx wrangler d1 execute listo-db --remote --command \
  "SELECT u.username, COUNT(r.id) as recs FROM users u 
   LEFT JOIN recommendations r ON u.id = r.user_id 
   GROUP BY u.id ORDER BY recs DESC"
```

## Deployed
- Fix deployed at: 2025-10-19 19:43 UTC
- Deployment URL: https://fcd84b0b.listo-a46.pages.dev
