import type { RequestEvent } from '@sveltejs/kit';

/**
 * Get current user from session (WebAuthn)
 * Returns user ID if authenticated, null otherwise
 */
export async function getCurrentUser(event: RequestEvent): Promise<string | null> {
	// Check both new WebAuthn cookie and session cookies (handle both naming conventions)
	const webAuthnUserId = event.cookies.get('user-id');
	const sessionUserId = event.cookies.get('session-user-id');
	const legacyUserId = event.cookies.get('session_user_id');

	return webAuthnUserId || sessionUserId || legacyUserId || null;
}

/**
 * Get or create a demo user for development
 * In production, users should authenticate via /auth page
 */
export async function getOrCreateDemoUser(event: RequestEvent): Promise<string> {
	const existingUserId = await getCurrentUser(event);

	if (existingUserId) {
		return existingUserId;
	}

	// Create a demo user for development/testing
	const userId = `demo-${crypto.randomUUID()}`;

	// Store in D1 if available
	if (event.platform?.env.DB) {
		try {
			await event.platform.env.DB.prepare(
				'INSERT OR IGNORE INTO users (id, created_at, updated_at) VALUES (?, unixepoch(), unixepoch())'
			)
				.bind(userId)
				.run();
		} catch (error) {
			console.error('Failed to create demo user in D1:', error);
		}
	}

	// Set session cookie
	event.cookies.set('user-id', userId, {
		path: '/',
		httpOnly: true,
		sameSite: 'strict',
		secure: true,
		maxAge: 60 * 60 * 24 * 30 // 30 days
	});

	return userId;
}

/**
 * Require authentication - redirect to auth page if not logged in
 */
export async function requireAuth(event: RequestEvent): Promise<string> {
	const userId = await getCurrentUser(event);

	if (!userId) {
		throw new Error('Authentication required');
	}

	return userId;
}

/**
 * Logout user
 */
export async function logout(event: RequestEvent): Promise<void> {
	event.cookies.delete('user-id', { path: '/' });
	event.cookies.delete('session_user_id', { path: '/' }); // Legacy cookie
}
