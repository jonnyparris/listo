import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generateRegistrationOptionsForUser, getConfig } from '$lib/server/webauthn';

export const POST: RequestHandler = async ({ request, cookies, platform }) => {
	let payload: { username?: unknown };
	try {
		payload = await request.json();
	} catch {
		return json({ error: 'Invalid request' }, { status: 400 });
	}

	const { username } = payload;

	// Validate username before it reaches a cookie or the database
	let cleanUsername: string | null = null;
	if (typeof username === 'string' && username.trim()) {
		const trimmed = username.trim();
		if (!/^[\p{L}\p{N} _-]{1,40}$/u.test(trimmed)) {
			return json({ error: 'Username must be 1-40 characters (letters, numbers, spaces, _ or -)' }, { status: 400 });
		}
		cleanUsername = trimmed;
	}

	// Generate a new user ID
	const userId = crypto.randomUUID();

	// Get the origin from the request headers
	const origin = request.headers.get('origin') || 'http://localhost:5173';

	// Pin RP ID when configured (production); derive from origin otherwise (dev)
	const pinned = platform?.env?.RP_ID ? { rpID: platform.env.RP_ID, origin: platform.env.AUTH_ORIGIN } : undefined;

	// Reject disallowed origins before issuing registration options or setting
	// registration cookies. Without this, an attacker-controlled Origin would
	// pick the expected RP ID and origin for the whole ceremony.
	try {
		getConfig(origin, pinned);
	} catch {
		return json({ error: 'Origin not allowed for registration' }, { status: 400 });
	}

	// Generate registration options
	const options = await generateRegistrationOptionsForUser({
		id: userId,
		username: cleanUsername || undefined
	}, origin, pinned);

	// Store the challenge in a cookie for verification
	cookies.set('reg-challenge', options.challenge, {
		httpOnly: true,
		secure: true,
		sameSite: 'strict',
		maxAge: 60 * 5, // 5 minutes
		path: '/'
	});

	// Store user info for registration completion
	// Ensure username is either a non-empty string or null (not undefined or empty string)
	cookies.set(
		'reg-user',
		JSON.stringify({ id: userId, username: cleanUsername }),
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
