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

		// Get all credentials from the database
		// In a real app, you might want to filter by username, but for passkey
		// authentication we can allow any registered credential
		const { results } = await platform.env.DB.prepare(
			'SELECT id, user_id, public_key, counter, transports FROM credentials'
		).all();

		if (!results || results.length === 0) {
			return json({ error: 'No credentials found. Please register first.' }, { status: 404 });
		}

		// Convert credentials to the format needed by WebAuthn
		const credentials = results.map((cred: any) => ({
			id: cred.id,
			publicKey: base64url.decode(cred.public_key),
			counter: cred.counter,
			transports: cred.transports ? JSON.parse(cred.transports) : undefined
		}));

		// Generate authentication options
		const options = await generateAuthenticationOptionsForUser(credentials, origin);

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
