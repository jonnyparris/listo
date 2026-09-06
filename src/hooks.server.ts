import { getCurrentUser } from '$lib/server/auth';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const userId = await getCurrentUser(event);

	if (userId) {
		event.locals.user = { id: userId };
	}

	const response = await resolve(event);

	// Baseline hardening headers (a strict CSP needs build-time verification; not added here)
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

	return response;
};
