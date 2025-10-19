# Merge Duplicate User Accounts

## Background

Before the fix was deployed, if you clicked "Sign Up" multiple times in different browsers with the same synced passkey (e.g., iCloud Keychain), it created multiple user accounts. This migration will merge them into a single account.

## What This Migration Does

1. Finds all duplicate credentials (same passkey with different user IDs)
2. Keeps the oldest user account (based on `created_at`)
3. Migrates all recommendations from duplicate accounts to the primary account
4. Deletes duplicate credentials and user records

## How to Run the Migration

### Step 1: Set Admin Key (One-time setup)

You need to set an admin key secret in Cloudflare:

```bash
# Generate a random admin key (save this!)
ADMIN_KEY=$(openssl rand -base64 32)
echo "Your admin key: $ADMIN_KEY"

# Set it as a secret in Cloudflare
CLOUDFLARE_ACCOUNT_ID=4b430e167a301330d13a9bb42f3986a2 npx wrangler pages secret put ADMIN_KEY --project-name=listo
# When prompted, paste the admin key you generated above
```

### Step 2: Deploy the Migration Endpoint

```bash
npm run build
npm run deploy
```

### Step 3: Run the Migration

Replace `YOUR_ADMIN_KEY` with the key you generated in Step 1:

```bash
curl -X POST https://listo.pages.dev/api/admin/merge-duplicate-users \
  -H "Content-Type: application/json" \
  -d '{"adminKey": "YOUR_ADMIN_KEY"}'
```

Or use this one-liner (replace the admin key):

```bash
curl -X POST https://listo.pages.dev/api/admin/merge-duplicate-users \
  -H "Content-Type: application/json" \
  -d "{\"adminKey\": \"$(echo YOUR_ADMIN_KEY)\"}"
```

### Step 4: Review the Results

The response will show:
- How many duplicate accounts were merged
- Which user IDs were consolidated
- Any errors encountered

Example successful response:
```json
{
  "success": true,
  "mergedCount": 2,
  "mergedUsers": ["def-456", "ghi-789"],
  "errors": [],
  "message": "Successfully merged 2 duplicate user accounts"
}
```

## After Migration

Once the migration is complete:
1. Log out of all browsers
2. Sign in again with your passkey
3. You should now see all your recommendations in one account across all devices!

## Troubleshooting

**Q: I get "Unauthorized" error**
A: Make sure you set the ADMIN_KEY secret correctly in Step 1, and you're using the exact same key in the curl request.

**Q: Nothing was merged**
A: This is normal if you didn't have any duplicate accounts. The response will show `"mergedCount": 0`.

**Q: I see errors in the response**
A: Check the `errors` array in the response for details. You may need to manually fix those cases using the SQL script.
