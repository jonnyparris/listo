import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generateRegistrationOptionsForUser } from '$lib/server/webauthn';

export const POST: RequestHandler = async ({ request, cookies, platform }) => {
	const { username } = await request.json();

	// Generate a new user ID
	const userId = crypto.randomUUID();

	// Generate registration options
	const options = await generateRegistrationOptionsForUser({
		id: userId,
		username: username || undefined
	});

	// Store the challenge in a cookie for verification
	cookies.set('reg-challenge', options.challenge, {
		httpOnly: true,
		secure: true,
		sameSite: 'strict',
		maxAge: 60 * 5, // 5 minutes
		path: '/'
	});

	// Store user info for registration completion
	cookies.set(
		'reg-user',
		JSON.stringify({ id: userId, username }),
		{
			httpOnly: true,
			secure: true,
			sameSite: 'strict',
			maxAge: 60 * 5,
			path: '/'
		}
	);

	return json(options);
};
