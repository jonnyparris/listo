import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyAuthentication, base64url } from '$lib/server/webauthn';

export const POST: RequestHandler = async ({ request, cookies, platform }) => {
	if (!platform?.env?.DB) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	const body = await request.json();
	const challenge = cookies.get('auth-challenge');

	if (!challenge) {
		return json({ error: 'Authentication session expired' }, { status: 400 });
	}

	try {
		// Get the origin from the request headers
		const origin = request.headers.get('origin') || 'http://localhost:5173';

		// Get the credential from database
		// body.id is already a base64url-encoded string from the browser
		const credentialId = body.id;

		const credential = await platform.env.DB.prepare(
			'SELECT id, user_id, public_key, counter, transports FROM credentials WHERE id = ?'
		)
			.bind(credentialId)
			.first();

		if (!credential) {
			return json({ error: 'Credential not found. This passkey may not be registered on this device.' }, { status: 404 });
		}

		// Verify the authentication response
		const verification = await verifyAuthentication(body, challenge, {
			id: credential.id as string,
			publicKey: base64url.decode(credential.public_key as string),
			counter: (credential.counter as number) ?? 0,
			transports: credential.transports ? JSON.parse(credential.transports as string) : undefined
		}, origin);

		if (!verification.verified) {
			return json({ error: 'Verification failed' }, { status: 400 });
		}

		// Update credential counter
		await platform.env.DB.prepare(
			'UPDATE credentials SET counter = ?, last_used_at = unixepoch() WHERE id = ?'
		)
			.bind(verification.authenticationInfo?.newCounter ?? 0, credential.id)
			.run();

		// Clear auth challenge cookie
		cookies.delete('auth-challenge', { path: '/' });

		// Set session cookie
		cookies.set('user-id', credential.user_id as string, {
			httpOnly: true,
			secure: true,
			sameSite: 'strict',
			maxAge: 60 * 60 * 24 * 30, // 30 days
			path: '/'
		});

		return json({ success: true, userId: credential.user_id });
	} catch (error) {
		console.error('Authentication error:', error);
		return json(
			{ error: error instanceof Error ? error.message : 'Authentication failed' },
			{ status: 500 }
		);
	}
};
