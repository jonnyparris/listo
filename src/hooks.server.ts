import { getCurrentUser } from '$lib/server/auth';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const userId = await getCurrentUser(event);

	if (userId) {
		event.locals.user = { id: userId };
	}

	return resolve(event);
};
