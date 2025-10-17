import { startRegistration, startAuthentication } from '@simplewebauthn/browser';

export class AuthService {
	/**
	 * Register a new passkey
	 */
	async register(username?: string): Promise<{ success: boolean; userId?: string; error?: string }> {
		try {
			// Get registration options from server
			const optionsResponse = await fetch('/api/auth/register/options', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username })
			});

			if (!optionsResponse.ok) {
				const error = await optionsResponse.json();
				throw new Error(error.error || 'Failed to get registration options');
			}

			const options = await optionsResponse.json();

			// Prompt user to create a passkey
			const registrationResponse = await startRegistration(options);

			// Verify registration with server
			const verificationResponse = await fetch('/api/auth/register/verify', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(registrationResponse)
			});

			if (!verificationResponse.ok) {
				const error = await verificationResponse.json();
				throw new Error(error.error || 'Registration verification failed');
			}

			const result = await verificationResponse.json();
			return { success: true, userId: result.userId };
		} catch (error) {
			console.error('Registration error:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Registration failed'
			};
		}
	}

	/**
	 * Login with passkey
	 */
	async login(): Promise<{ success: boolean; userId?: string; error?: string }> {
		try {
			// Get authentication options from server
			const optionsResponse = await fetch('/api/auth/login/options', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' }
			});

			if (!optionsResponse.ok) {
				const error = await optionsResponse.json();
				throw new Error(error.error || 'Failed to get login options');
			}

			const options = await optionsResponse.json();

			// Prompt user to authenticate with passkey
			const authenticationResponse = await startAuthentication(options);

			// Verify authentication with server
			const verificationResponse = await fetch('/api/auth/login/verify', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(authenticationResponse)
			});

			if (!verificationResponse.ok) {
				const error = await verificationResponse.json();
				throw new Error(error.error || 'Login verification failed');
			}

			const result = await verificationResponse.json();
			return { success: true, userId: result.userId };
		} catch (error) {
			console.error('Login error:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Login failed'
			};
		}
	}

	/**
	 * Get current user info
	 */
	async getCurrentUser(): Promise<{ authenticated: boolean; userId: string }> {
		try {
			const response = await fetch('/api/auth/me');

			if (!response.ok) {
				throw new Error('Failed to get current user');
			}

			return await response.json();
		} catch (error) {
			console.error('Get current user error:', error);
			// Fallback to session-only user
			return {
				authenticated: false,
				userId: `session_${crypto.randomUUID()}`
			};
		}
	}

	/**
	 * Logout
	 */
	async logout(): Promise<{ success: boolean; error?: string }> {
		try {
			const response = await fetch('/api/auth/logout', {
				method: 'POST'
			});

			if (!response.ok) {
				throw new Error('Logout failed');
			}

			return { success: true };
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Logout failed'
			};
		}
	}

	/**
	 * Check if passkeys are supported in this browser
	 */
	isSupported(): boolean {
		return typeof window !== 'undefined' &&
		       window.PublicKeyCredential !== undefined &&
		       typeof window.PublicKeyCredential === 'function';
	}
}

export const authService = new AuthService();
