-- Users table
CREATE TABLE IF NOT EXISTS users (
	id TEXT PRIMARY KEY,
	username TEXT UNIQUE, -- Optional display name
	created_at INTEGER NOT NULL DEFAULT (unixepoch()),
	updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- WebAuthn credentials table
CREATE TABLE IF NOT EXISTS credentials (
	id TEXT PRIMARY KEY, -- credential ID (base64url encoded)
	user_id TEXT NOT NULL,
	public_key TEXT NOT NULL, -- public key (base64url encoded)
	counter INTEGER NOT NULL DEFAULT 0, -- signature counter for replay protection
	transports TEXT, -- JSON array of authenticator transports
	created_at INTEGER NOT NULL DEFAULT (unixepoch()),
	last_used_at INTEGER,
	FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index for credentials lookup
CREATE INDEX IF NOT EXISTS idx_credentials_user_id ON credentials(user_id);

-- Sessions table (server-side session store)
-- The cookie holds a random token; only its SHA-256 hash is stored here.
CREATE TABLE IF NOT EXISTS sessions (
	token_hash TEXT PRIMARY KEY,
	user_id TEXT NOT NULL,
	created_at INTEGER NOT NULL DEFAULT (unixepoch()),
	expires_at INTEGER NOT NULL,
	FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- Fixed-window rate limiting for costly endpoints (Workers AI, enrichment APIs)
CREATE TABLE IF NOT EXISTS rate_limits (
	key TEXT PRIMARY KEY,
	window_start INTEGER NOT NULL,
	count INTEGER NOT NULL DEFAULT 0
);

-- Recommendations table
CREATE TABLE IF NOT EXISTS recommendations (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL,
	category TEXT NOT NULL, -- e.g., 'movie', 'book', 'restaurant', etc.
	title TEXT NOT NULL,
	description TEXT,
	source TEXT, -- Where the recommendation came from (e.g., "friend", "podcast", "article")
	metadata JSON, -- Store enriched data as JSON (e.g., poster, ratings, links)
	tags TEXT, -- Comma-separated tags for search
	created_at INTEGER NOT NULL DEFAULT (unixepoch()),
	updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
	deleted_at INTEGER, -- Soft delete timestamp
	completed_at INTEGER, -- Completion timestamp
	review TEXT, -- User's review text
	rating INTEGER, -- User's rating (1-5)
	FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_recommendations_user_id ON recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_category ON recommendations(category);
CREATE INDEX IF NOT EXISTS idx_recommendations_updated_at ON recommendations(updated_at);
CREATE INDEX IF NOT EXISTS idx_recommendations_deleted_at ON recommendations(deleted_at);

-- Full-text search virtual table
CREATE VIRTUAL TABLE IF NOT EXISTS recommendations_fts USING fts5(
	title,
	description,
	tags,
	content=recommendations,
	content_rowid=rowid
);

-- Triggers to keep FTS table in sync
CREATE TRIGGER IF NOT EXISTS recommendations_ai AFTER INSERT ON recommendations BEGIN
	INSERT INTO recommendations_fts(rowid, title, description, tags)
	VALUES (new.rowid, new.title, new.description, new.tags);
END;

CREATE TRIGGER IF NOT EXISTS recommendations_ad AFTER DELETE ON recommendations BEGIN
	DELETE FROM recommendations_fts WHERE rowid = old.rowid;
END;

CREATE TRIGGER IF NOT EXISTS recommendations_au AFTER UPDATE ON recommendations BEGIN
	UPDATE recommendations_fts
	SET title = new.title, description = new.description, tags = new.tags
	WHERE rowid = new.rowid;
END;

-- NOTE: no auto-update trigger for updated_at on purpose. Sync clients send
-- their own updated_at for last-write-wins conflict resolution; a trigger that
-- overwrites updated_at on every UPDATE would silently defeat that and cause
-- sync loops/lost updates.
