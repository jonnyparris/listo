import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generateAuthenticationOptionsForUser, base64url } from '$lib/server/webauthn';

export const POST: RequestHandler = async ({ request, cookies, platform }) => {
	if (!platform?.env?.DB) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	try {
		// Get the origin from the request headers
		const origin = request.headers.get('origin') || 'http://localhost:5173';

		// For discoverable credentials (passkeys), we don't need to query credentials
		// The browser will present any saved passkey for this domain to the user
		// By completely omitting the credentials parameter, the library won't include
		// allowCredentials in the options, enabling discoverable credential flow

		// Generate authentication options for discoverable credentials
		const options = await generateAuthenticationOptionsForUser(origin);

		// Store the challenge in a cookie for verification
		cookies.set('auth-challenge', options.challenge, {
			httpOnly: true,
			secure: true,
			sameSite: 'strict',
			maxAge: 60 * 5, // 5 minutes
			path: '/'
		});

		return json(options);
	} catch (error) {
		console.error('Login options error:', error);
		return json(
			{ error: error instanceof Error ? error.message : 'Failed to generate login options' },
			{ status: 500 }
		);
	}
};
