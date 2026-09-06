import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getCurrentUser } from '$lib/server/auth';

export const GET: RequestHandler = async (event) => {
	// Validate the session token server-side (the cookie value alone proves nothing)
	const authenticatedUserId = await getCurrentUser(event);

	if (authenticatedUserId) {
		return json({
			authenticated: true,
			userId: authenticatedUserId
		});
	}

	// If not authenticated, check for or create a session-only user ID
	// (session-only users stay local to the device; they never sync to D1)
	let sessionUserId = event.cookies.get('session-user-id');

	if (!sessionUserId) {
		sessionUserId = `session_${crypto.randomUUID()}`;

		event.cookies.set('session-user-id', sessionUserId, {
			httpOnly: true,
			secure: true,
			sameSite: 'strict',
			path: '/'
			// No maxAge = session cookie (expires when browser closes)
		});
	}

	return json({
		authenticated: false,
		userId: sessionUserId
	});
};
