import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyRegistration, base64url } from '$lib/server/webauthn';

export const POST: RequestHandler = async ({ request, cookies, platform }) => {
	if (!platform?.env?.DB) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	const body = await request.json();
	const challenge = cookies.get('reg-challenge');
	const userDataStr = cookies.get('reg-user');

	if (!challenge || !userDataStr) {
		return json({ error: 'Registration session expired' }, { status: 400 });
	}

	const userData = JSON.parse(userDataStr);

	try {
		// Verify the registration response
		const verification = await verifyRegistration(body, challenge);

		if (!verification.verified || !verification.registrationInfo) {
			return json({ error: 'Verification failed' }, { status: 400 });
		}

		const { credentialID, credentialPublicKey, counter } = verification.registrationInfo;

		// Create user in database
		await platform.env.DB.prepare(
			'INSERT INTO users (id, username, created_at, updated_at) VALUES (?, ?, unixepoch(), unixepoch())'
		)
			.bind(userData.id, userData.username || null)
			.run();

		// Store credential
		await platform.env.DB.prepare(
			`INSERT INTO credentials (id, user_id, public_key, counter, created_at)
			 VALUES (?, ?, ?, ?, unixepoch())`
		)
			.bind(
				base64url.encode(credentialID),
				userData.id,
				base64url.encode(credentialPublicKey),
				counter
			)
			.run();

		// Clear registration cookies
		cookies.delete('reg-challenge', { path: '/' });
		cookies.delete('reg-user', { path: '/' });

		// Set session cookie
		cookies.set('user-id', userData.id, {
			httpOnly: true,
			secure: true,
			sameSite: 'strict',
			maxAge: 60 * 60 * 24 * 30, // 30 days
			path: '/'
		});

		return json({ success: true, userId: userData.id });
	} catch (error) {
		console.error('Registration error:', error);
		return json(
			{ error: error instanceof Error ? error.message : 'Registration failed' },
			{ status: 500 }
		);
	}
};
