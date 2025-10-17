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
		// Get the origin from the request headers
		const origin = request.headers.get('origin') || 'http://localhost:5173';

		// Verify the registration response
		const verification = await verifyRegistration(body, challenge, origin);

		if (!verification.verified || !verification.registrationInfo) {
			return json({ error: 'Verification failed' }, { status: 400 });
		}

		const { credentialID, credentialPublicKey, counter } = verification.registrationInfo;

		// Ensure username is null if undefined or empty string (D1 doesn't accept undefined)
		const username = userData.username && userData.username.trim() ? userData.username.trim() : null;

		// Create user in database
		console.log('Creating user with:', { id: userData.id, username, type: typeof username });

		await platform.env.DB.prepare(
			'INSERT INTO users (id, username, created_at, updated_at) VALUES (?, ?, unixepoch(), unixepoch())'
		)
			.bind(userData.id, username)
			.run();

		// Store credential
		const encodedCredentialID = base64url.encode(credentialID);
		const encodedPublicKey = base64url.encode(credentialPublicKey);

		console.log('Creating credential with:', {
			credentialID: encodedCredentialID,
			userId: userData.id,
			counter,
			counterType: typeof counter
		});

		await platform.env.DB.prepare(
			`INSERT INTO credentials (id, user_id, public_key, counter, created_at)
			 VALUES (?, ?, ?, ?, unixepoch())`
		)
			.bind(
				encodedCredentialID,
				userData.id,
				encodedPublicKey,
				counter ?? 0  // Ensure counter is never undefined
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
