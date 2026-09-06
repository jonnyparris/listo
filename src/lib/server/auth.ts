import type { Cookies, RequestEvent } from '@sveltejs/kit';

/**
 * Session model:
 * - The browser only ever holds a random 256-bit token in the `listo_session` cookie.
 * - The server stores only the SHA-256 hash of the token in D1.
 * - A spoofed cookie value grants nothing; only the holder of the real token
 *   authenticates, and sessions can be revoked server-side.
 */

const SESSION_COOKIE = '__Host-listo_session';
// __Host- prefix requires: Secure, Path=/, no Domain attribute — all satisfied
// by the cookie options below, and it blocks subdomain-injection of session
// cookies.
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

interface SessionEvent {
	cookies: Cookies;
	platform?: App.Platform | null;
}

async function hashToken(token: string): Promise<string> {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
	return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

function randomToken(): string {
	const bytes = new Uint8Array(32);
	crypto.getRandomValues(bytes);
	let binary = '';
	for (const b of bytes) binary += String.fromCharCode(b);
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Validate the session cookie against D1. Returns the user ID if valid.
 */
export async function getCurrentUser(event: SessionEvent | RequestEvent): Promise<string | null> {
	const token = event.cookies.get(SESSION_COOKIE);
	if (!token) return null;

	const db = event.platform?.env?.DB;
	if (!db) return null;

	try {
		const row = await db
			.prepare('SELECT user_id FROM sessions WHERE token_hash = ? AND expires_at > unixepoch()')
			.bind(await hashToken(token))
			.first();
		return (row?.user_id as string | undefined) ?? null;
	} catch (error) {
		console.error('Session lookup failed:', error);
		return null;
	}
}

/**
 * Create a server-side session for a user and set the session cookie.
 */
export async function createSession(event: SessionEvent, userId: string): Promise<void> {
	const db = event.platform?.env?.DB;
	const token = randomToken();

	if (db) {
		try {
			// Opportunistic cleanup of expired sessions (cheap, runs with each login)
			await db
				.prepare('DELETE FROM sessions WHERE expires_at <= unixepoch()')
				.run();
			await db
				.prepare(
					'INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, unixepoch(), unixepoch() + ?)'
				)
				.bind(await hashToken(token), userId, SESSION_TTL_SECONDS)
				.run();
		} catch (error) {
			console.error('Failed to persist session:', error);
			throw new Error('Could not create session');
		}
	} else {
		// No DB binding (local dev without D1): don't mint sessions that can't be validated
		throw new Error('Database not available');
	}

	event.cookies.set(SESSION_COOKIE, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'strict',
		secure: true,
		maxAge: SESSION_TTL_SECONDS
	});
}

/**
 * Revoke the current session and clear every auth-related cookie,
 * including legacy names from previous auth schemes.
 */
export async function destroySession(event: SessionEvent): Promise<void> {
	const db = event.platform?.env?.DB;
	const token = event.cookies.get(SESSION_COOKIE);

	if (db && token) {
		try {
			await db.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await hashToken(token)).run();
		} catch (error) {
			console.error('Failed to revoke session:', error);
		}
	}

	event.cookies.delete(SESSION_COOKIE, { path: '/' });
	// Legacy cookie names (pre-session auth scheme) — clear on logout so stale
	// values can't linger or be resurrected.
	event.cookies.delete('user-id', { path: '/' });
	event.cookies.delete('session-user-id', { path: '/' });
	event.cookies.delete('session_user_id', { path: '/' });
	event.cookies.delete('auth-challenge', { path: '/' });
	event.cookies.delete('reg-challenge', { path: '/' });
	event.cookies.delete('reg-user', { path: '/' });
}

/**
 * Require authentication - throw if not logged in
 */
export async function requireAuth(event: SessionEvent | RequestEvent): Promise<string> {
	const userId = await getCurrentUser(event);

	if (!userId) {
		throw new Error('Authentication required');
	}

	return userId;
}

/**
 * Backwards-compatible alias for the old logout() helper.
 */
export async function logout(event: SessionEvent): Promise<void> {
	await destroySession(event);
}
