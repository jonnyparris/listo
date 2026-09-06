-- Migration: server-side sessions + remove updated_at trigger
-- Run against production D1:
--   npx wrangler d1 execute listo-db --remote --file=scripts/2025-11-sessions-and-no-trigger.sql
--
-- Why:
-- 1. Sessions: authentication previously trusted a raw `user-id` cookie. Now the
--    cookie holds a random token and the server stores only its hash, so a
--    spoofed cookie grants nothing.
-- 2. The recommendations_update_timestamp trigger overwrote updated_at on every
--    UPDATE, which defeats last-write-wins sync (clients send their own
--    updated_at). All code paths already set updated_at explicitly.

CREATE TABLE IF NOT EXISTS sessions (
	token_hash TEXT PRIMARY KEY,
	user_id TEXT NOT NULL,
	created_at INTEGER NOT NULL DEFAULT (unixepoch()),
	expires_at INTEGER NOT NULL,
	FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- Rate limiting for costly endpoints (Workers AI, enrichment)
CREATE TABLE IF NOT EXISTS rate_limits (
	key TEXT PRIMARY KEY,
	window_start INTEGER NOT NULL,
	count INTEGER NOT NULL DEFAULT 0
);

DROP TRIGGER IF EXISTS recommendations_update_timestamp;
