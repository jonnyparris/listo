import type { RequestEvent } from '@sveltejs/kit';

// TODO: Replace with WebAuthn implementation
// This is a stubbed auth system for development

/**
 * Get or create a user session
 * For now, we'll use a simple cookie-based session
 * In production, this should be replaced with WebAuthn
 */
export async function getOrCreateUser(event: RequestEvent): Promise<string> {
	const sessionCookie = event.cookies.get('session_user_id');

	if (sessionCookie) {
		return sessionCookie;
	}

	// Generate a temporary user ID (in production, this comes from WebAuthn)
	const userId = `user_${crypto.randomUUID()}`;

	// Store in D1 if available
	if (event.platform?.env.DB) {
		try {
			await event.platform.env.DB.prepare(
				'INSERT OR IGNORE INTO users (id, created_at, updated_at) VALUES (?, unixepoch(), unixepoch())'
			)
				.bind(userId)
				.run();
		} catch (error) {
			console.error('Failed to create user in D1:', error);
		}
	}

	// Set cookie for 1 year
	event.cookies.set('session_user_id', userId, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: true,
		maxAge: 60 * 60 * 24 * 365
	});

	return userId;
}

/**
 * Get current user from session
 */
export async function getCurrentUser(event: RequestEvent): Promise<string | null> {
	return event.cookies.get('session_user_id') || null;
}

/**
 * Logout user
 */
export async function logout(event: RequestEvent): Promise<void> {
	event.cookies.delete('session_user_id', { path: '/' });
}

// TODO: Implement WebAuthn
// - Registration flow
// - Authentication flow
// - Credential storage in D1
// - Fallback to email magic link
