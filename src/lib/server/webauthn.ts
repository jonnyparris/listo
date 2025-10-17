import {
	generateRegistrationOptions,
	verifyRegistrationResponse,
	generateAuthenticationOptions,
	verifyAuthenticationResponse,
	type VerifiedRegistrationResponse,
	type VerifiedAuthenticationResponse
} from '@simplewebauthn/server';
import type { AuthenticatorTransportFuture } from '@simplewebauthn/types';

// WebAuthn configuration
const rpName = 'Listo';
const rpID = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';

export interface StoredCredential {
	id: string;
	publicKey: Uint8Array;
	counter: number;
	transports?: AuthenticatorTransportFuture[];
}

export interface User {
	id: string;
	username?: string;
	credentials: StoredCredential[];
}

/**
 * Generate registration options for a new passkey
 */
export async function generateRegistrationOptionsForUser(user: { id: string; username?: string }) {
	const options = await generateRegistrationOptions({
		rpName,
		rpID,
		userName: user.username || user.id,
		userID: new TextEncoder().encode(user.id),
		// Don't prompt users for additional information about the authenticator
		attestationType: 'none',
		// Prevent users from re-registering existing authenticators
		excludeCredentials: [],
		authenticatorSelection: {
			// Prefer passkeys that are stored on the device
			residentKey: 'preferred',
			userVerification: 'preferred'
		}
	});

	return options;
}

/**
 * Verify a registration response from the browser
 */
export async function verifyRegistration(
	response: any,
	expectedChallenge: string
): Promise<VerifiedRegistrationResponse> {
	return await verifyRegistrationResponse({
		response,
		expectedChallenge,
		expectedOrigin: origin,
		expectedRPID: rpID
	});
}

/**
 * Generate authentication options for login
 */
export async function generateAuthenticationOptionsForUser(credentials: StoredCredential[]) {
	const options = await generateAuthenticationOptions({
		rpID,
		allowCredentials: credentials.map((cred) => ({
			id: cred.id,
			type: 'public-key',
			transports: cred.transports
		})),
		userVerification: 'preferred'
	});

	return options;
}

/**
 * Verify an authentication response from the browser
 */
export async function verifyAuthentication(
	response: any,
	expectedChallenge: string,
	credential: StoredCredential
): Promise<VerifiedAuthenticationResponse> {
	return await verifyAuthenticationResponse({
		response,
		expectedChallenge,
		expectedOrigin: origin,
		expectedRPID: rpID,
		authenticator: {
			credentialID: credential.id,
			credentialPublicKey: credential.publicKey,
			counter: credential.counter
		}
	});
}

/**
 * Helper to encode/decode base64url
 */
export const base64url = {
	encode(buffer: Uint8Array): string {
		const base64 = btoa(String.fromCharCode(...buffer));
		return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
	},
	decode(base64url: string): Uint8Array {
		const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
		const binary = atob(base64);
		return Uint8Array.from(binary, (c) => c.charCodeAt(0));
	}
};
