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
			console.error('Verification failed or no registration info:', {
				verified: verification.verified,
				hasRegistrationInfo: !!verification.registrationInfo
			});
			return json({ error: 'Verification failed' }, { status: 400 });
		}

		// Extract credential data from the nested structure
		const { credential } = verification.registrationInfo;
		const credentialID = credential.id;
		const credentialPublicKey = credential.publicKey;
		const counter = credential.counter;

		// Ensure username is null if undefined or empty string (D1 doesn't accept undefined)
		const username = userData.username && userData.username.trim() ? userData.username.trim() : null;

		// Store credential
		// credentialID is already a base64url string in the new API
		const encodedCredentialID = typeof credentialID === 'string' ? credentialID : base64url.encode(credentialID);
		// credentialPublicKey is a Uint8Array-like object, need to convert it
		const publicKeyUint8 = credentialPublicKey instanceof Uint8Array
			? credentialPublicKey
			: new Uint8Array(Object.values(credentialPublicKey));
		const encodedPublicKey = base64url.encode(publicKeyUint8);

		// Check if this credential already exists (synced passkey used on another device)
		const existingCredential = await platform.env.DB.prepare(
			'SELECT user_id FROM credentials WHERE id = ?'
		)
			.bind(encodedCredentialID)
			.first();

		let finalUserId: string;

		if (existingCredential) {
			// This passkey was already registered on another device
			// Use the existing user_id to maintain sync across devices
			finalUserId = existingCredential.user_id as string;
		} else {
			// New credential - create user and credential as normal
			finalUserId = userData.id;

			await platform.env.DB.prepare(
				'INSERT INTO users (id, username, created_at, updated_at) VALUES (?, ?, unixepoch(), unixepoch())'
			)
				.bind(finalUserId, username)
				.run();

			await platform.env.DB.prepare(
				`INSERT INTO credentials (id, user_id, public_key, counter, created_at)
				 VALUES (?, ?, ?, ?, unixepoch())`
			)
				.bind(
					encodedCredentialID,
					finalUserId,
					encodedPublicKey,
					counter ?? 0  // Ensure counter is never undefined
				)
				.run();
		}

		// Clear registration cookies
		cookies.delete('reg-challenge', { path: '/' });
		cookies.delete('reg-user', { path: '/' });

		// Set session cookie
		cookies.set('user-id', finalUserId, {
			httpOnly: true,
			secure: true,
			sameSite: 'strict',
			maxAge: 60 * 60 * 24 * 30, // 30 days
			path: '/'
		});

		return json({ success: true, userId: finalUserId });
	} catch (error) {
		console.error('Registration error:', error);

		// Check for specific error types
		let errorMessage = 'Registration failed';
		let statusCode = 500;

		if (error instanceof Error) {
			// Handle duplicate user/credential errors
			if (error.message.includes('UNIQUE constraint failed: users.username')) {
				errorMessage = 'Username already taken. Please choose a different username.';
				statusCode = 409;
			} else if (error.message.includes('UNIQUE constraint failed: credentials.id')) {
				errorMessage = 'It looks like you already have an account! Please use the "Sign In" button to access your existing account.';
				statusCode = 409;
			} else if (error.message.includes('UNIQUE constraint failed: users.id')) {
				errorMessage = 'It looks like you already have an account! Please use the "Sign In" button to access your existing account.';
				statusCode = 409;
			} else {
				errorMessage = error.message;
			}
		}

		return json({ error: errorMessage }, { status: statusCode });
	}
};
