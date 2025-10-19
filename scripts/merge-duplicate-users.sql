-- Migration script to merge duplicate users who share the same passkey credential
-- This happens when someone clicked "Sign Up" multiple times in different browsers
-- before the fix was deployed.

-- Step 1: Find duplicate credentials (same credential_id with different user_ids)
-- This query will show you what will be merged
SELECT
    c.id as credential_id,
    GROUP_CONCAT(c.user_id) as user_ids,
    COUNT(DISTINCT c.user_id) as user_count
FROM credentials c
GROUP BY c.id
HAVING COUNT(DISTINCT c.user_id) > 1;

-- Step 2: For each duplicate, we need to:
-- 1. Pick the oldest user_id (earliest created_at) as the primary user
-- 2. Migrate all recommendations from duplicate users to the primary user
-- 3. Delete the duplicate user records
-- 4. Delete the duplicate credential records

-- This is a manual process - you'll need to run this for each duplicate found above:

-- Example for a specific credential (replace 'CREDENTIAL_ID_HERE' with actual ID):
/*
-- Find the primary user (oldest)
SELECT user_id, created_at
FROM users
WHERE id IN (
    SELECT user_id FROM credentials WHERE id = 'CREDENTIAL_ID_HERE'
)
ORDER BY created_at ASC
LIMIT 1;

-- Let's say primary_user_id is 'abc-123' and duplicate_user_id is 'def-456'

-- Migrate recommendations from duplicate to primary
UPDATE recommendations
SET user_id = 'abc-123'
WHERE user_id = 'def-456';

-- Delete duplicate credentials (keep only one for primary user)
DELETE FROM credentials
WHERE id = 'CREDENTIAL_ID_HERE'
AND user_id != 'abc-123';

-- Delete duplicate user record
DELETE FROM users WHERE id = 'def-456';
*/
