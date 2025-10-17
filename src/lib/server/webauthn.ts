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
// Note: This runs on the server, so we use environment-based detection
// For localhost development, we'll get the origin from the request
// For production, we'll use the deployed domain
const getConfig = (requestOrigin?: string) => {
	// If we have a request origin, use it
	if (requestOrigin) {
		const url = new URL(requestOrigin);
		return {
			rpID: url.hostname,
			origin: requestOrigin
		};
	}
	// Default for development
	return {
		rpID: 'localhost',
		origin: 'http://localhost:5173'
	};
};

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
export async function generateRegistrationOptionsForUser(user: { id: string; username?: string }, requestOrigin?: string) {
	const { rpID } = getConfig(requestOrigin);

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
			// Require platform authenticators (Touch ID, Face ID, Windows Hello)
			authenticatorAttachment: 'platform',
			// Require passkeys that are stored on the device
			residentKey: 'required',
			// Require user verification (biometric or PIN)
			userVerification: 'required'
		}
	});

	return options;
}

/**
 * Verify a registration response from the browser
 */
export async function verifyRegistration(
	response: any,
	expectedChallenge: string,
	requestOrigin?: string
): Promise<VerifiedRegistrationResponse> {
	const { rpID, origin } = getConfig(requestOrigin);

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
export async function generateAuthenticationOptionsForUser(credentials: StoredCredential[], requestOrigin?: string) {
	const { rpID } = getConfig(requestOrigin);

	const options = await generateAuthenticationOptions({
		rpID,
		allowCredentials: credentials.map((cred) => ({
			id: cred.id,
			type: 'public-key',
			transports: cred.transports
		})),
		// Require user verification to trigger Touch ID/Face ID
		userVerification: 'required'
	});

	return options;
}

/**
 * Verify an authentication response from the browser
 */
export async function verifyAuthentication(
	response: any,
	expectedChallenge: string,
	credential: StoredCredential,
	requestOrigin?: string
): Promise<VerifiedAuthenticationResponse> {
	const { rpID, origin } = getConfig(requestOrigin);

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
	encode(buffer: Uint8Array | ArrayBuffer): string {
		// Convert ArrayBuffer to Uint8Array if needed
		const uint8Array = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);

		// Convert to binary string
		let binary = '';
		const len = uint8Array.byteLength;
		for (let i = 0; i < len; i++) {
			binary += String.fromCharCode(uint8Array[i]);
		}

		// Encode to base64 and convert to base64url
		const base64 = btoa(binary);
		return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
	},
	decode(base64url: string): Uint8Array {
		const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
		const binary = atob(base64);
		return Uint8Array.from(binary, (c) => c.charCodeAt(0));
	}
};
