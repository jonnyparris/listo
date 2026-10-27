// Shared sync contract between the browser SyncService and the server routes
// under /api/recommendations. Both sides must agree on these caps: the client
// chunks pushes to MAX_PUSH_BATCH and drains pulls PULL_PAGE_SIZE rows at a time,
// while the server enforces the same limits.
export const MAX_PUSH_BATCH = 500;
export const PULL_PAGE_SIZE = 2000;
