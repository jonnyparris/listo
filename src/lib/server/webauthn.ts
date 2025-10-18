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
// For localhost development, we use localhost
// For production, we use the main production domain (not preview deployment URLs)
const getConfig = (requestOrigin?: string) => {
	// If we have a request origin, check if it's localhost
	if (requestOrigin) {
		const url = new URL(requestOrigin);
		// For localhost, use localhost as RP ID
		if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
			return {
				rpID: 'localhost',
				origin: requestOrigin
			};
		}
		// For production (including preview deployments), always use the main production domain
		// This ensures passkeys work across all deployments
		return {
			rpID: 'listo.jonnyparris.club',
			origin: `https://listo.jonnyparris.club`
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
 * For discoverable credentials (passkeys), we omit allowCredentials to let the browser
 * use any saved passkey for this domain. This enables the "use saved passkey" flow.
 */
export async function generateAuthenticationOptionsForUser(user?: { id: string }, requestOrigin?: string) {
	const { rpID } = getConfig(requestOrigin);

	const options = await generateAuthenticationOptions({
		rpID,
		// By COMPLETELY omitting allowCredentials (not setting it to []),
		// we enable discoverable credential authentication.
		// This allows the browser to prompt for any saved passkey for this domain.
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

	// Validate credential object has all required fields
	if (!credential || !credential.id || !credential.publicKey) {
		throw new Error('Invalid credential: missing required fields');
	}

	// Ensure counter is a valid number (never undefined)
	const counter = Number(credential.counter) || 0;

	console.log('Verifying authentication with credential:', {
		id: credential.id,
		publicKeyLength: credential.publicKey?.length,
		counter: counter,
		counterType: typeof counter
	});

	// Convert publicKey to Uint8Array if it's not already
	const publicKeyUint8 = credential.publicKey instanceof Uint8Array
		? credential.publicKey
		: new Uint8Array(Object.values(credential.publicKey));

	// WebAuthnCredential structure for the library
	const webAuthnCredential: {
		id: string;
		publicKey: Uint8Array;
		counter: number;
		transports?: AuthenticatorTransportFuture[];
	} = {
		id: credential.id, // Keep as base64url string
		publicKey: new Uint8Array(publicKeyUint8), // Ensure proper Uint8Array type
		counter: counter,
		transports: credential.transports
	};

	console.log('WebAuthnCredential object being passed:', {
		id: webAuthnCredential.id,
		publicKeyLength: webAuthnCredential.publicKey.length,
		counter: webAuthnCredential.counter,
		transports: webAuthnCredential.transports
	});

	return await verifyAuthenticationResponse({
		response,
		expectedChallenge,
		expectedOrigin: origin,
		expectedRPID: rpID,
		credential: webAuthnCredential
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
