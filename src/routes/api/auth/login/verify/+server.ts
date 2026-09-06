import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyAuthentication, base64url, parseStoredTransports } from '$lib/server/webauthn';
import { createSession } from '$lib/server/auth';

export const POST: RequestHandler = async ({ request, cookies, platform }) => {
	if (!platform?.env?.DB) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	const body = await request.json();
	const challenge = cookies.get('auth-challenge');

	if (!challenge) {
		return json({ error: 'Authentication session expired' }, { status: 400 });
	}

	// Consume the challenge immediately: one verification attempt per challenge,
	// so failed attempts can't be retried or replayed with a stale response.
	cookies.delete('auth-challenge', { path: '/' });

	// Pin RP ID when configured (production); derive from origin otherwise (dev)
	const pinned = platform?.env?.RP_ID ? { rpID: platform.env.RP_ID, origin: platform.env.AUTH_ORIGIN } : undefined;

	try {
		// Get the origin from the request headers
		const origin = request.headers.get('origin') || 'http://localhost:5173';

		// Get the credential from database
		// body.id is already a base64url-encoded string from the browser
		const credentialId = typeof body?.id === 'string' ? body.id : '';
		if (!/^[A-Za-z0-9._-]{1,512}$/.test(credentialId)) {
			return json({ error: 'Invalid credential id' }, { status: 400 });
		}

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
			transports: credential.transports ? parseStoredTransports(credential.transports as string) : undefined
		}, origin, pinned);

		if (!verification.verified) {
			return json({ error: 'Verification failed' }, { status: 400 });
		}

		// Update credential counter
		await platform.env.DB.prepare(
			'UPDATE credentials SET counter = ?, last_used_at = unixepoch() WHERE id = ?'
		)
			.bind(verification.authenticationInfo?.newCounter ?? 0, credential.id)
			.run();

		// Challenge already consumed above

		// Create server-side session (random token, hashed in D1)
		await createSession({ cookies, platform }, credential.user_id as string);

		return json({ success: true, userId: credential.user_id });
	} catch (error) {
		console.error('Authentication error:', error);
		return json(
			{ error: error instanceof Error ? error.message : 'Authentication failed' },
			{ status: 500 }
		);
	}
};
