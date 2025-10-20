-- Force sync script: Check sync status
-- Run with: npx wrangler d1 execute listo-db --remote --file scripts/force-sync.sql

-- Show users and their data
SELECT 
  u.id,
  u.username,
  COUNT(r.id) as total_recommendations
FROM users u
LEFT JOIN recommendations r ON u.id = r.user_id
GROUP BY u.id
ORDER BY total_recommendations DESC;
