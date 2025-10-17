import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies }) => {
	// Check if user is authenticated (has a user-id cookie from passkey login)
	const authenticatedUserId = cookies.get('user-id');

	if (authenticatedUserId) {
		return json({
			authenticated: true,
			userId: authenticatedUserId
		});
	}

	// If not authenticated, check for or create a session-only user ID
	let sessionUserId = cookies.get('session-user-id');

	if (!sessionUserId) {
		// Generate a new session-only user ID
		sessionUserId = `session_${crypto.randomUUID()}`;

		// Set session cookie (expires when browser closes)
		cookies.set('session-user-id', sessionUserId, {
			httpOnly: true,
			secure: true,
			sameSite: 'strict',
			path: '/',
			// No maxAge = session cookie (expires when browser closes)
		});
	}

	return json({
		authenticated: false,
		userId: sessionUserId
	});
};
