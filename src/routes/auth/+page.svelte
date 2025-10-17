<script lang="ts">
	import { Button, Input } from '$lib/components/ui';
	import { authService } from '$lib/services/auth';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	let mode: 'login' | 'register' = $state('login');
	let username = $state('');
	let loading = $state(false);
	let error = $state<string | null>(null);
	let supported = $state(true);

	onMount(() => {
		supported = authService.isSupported();
		if (!supported) {
			error = 'Passkeys are not supported in your browser. Please use a modern browser with WebAuthn support.';
		}
	});

	async function handleLogin() {
		if (!supported) return;

		loading = true;
		error = null;

		const result = await authService.login();

		if (result.success) {
			goto('/');
		} else {
			error = result.error || 'Login failed';
		}

		loading = false;
	}

	async function handleRegister() {
		if (!supported) return;

		loading = true;
		error = null;

		const result = await authService.register(username || undefined);

		if (result.success) {
			goto('/');
		} else {
			error = result.error || 'Registration failed';
		}

		loading = false;
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		if (mode === 'login') {
			await handleLogin();
		} else {
			await handleRegister();
		}
	}
</script>

<div class="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center px-4">
	<div class="w-full max-w-md">
		<!-- Logo -->
		<div class="mb-12 text-center flex justify-center">
			<img
				src="/Listo_Logo_IntentionalChill.svg"
				alt="Listo - intentional chill"
				class="w-full max-w-[280px] h-auto dark:brightness-90"
			/>
		</div>

		<!-- Auth Card -->
		<div class="bg-white dark:bg-gray-800 rounded-2xl shadow-card p-8">
			<h2 class="text-2xl font-semibold text-text dark:text-white mb-6 text-center">
				{mode === 'login' ? 'Welcome Back' : 'Create Account'}
			</h2>

			{#if error}
				<div class="mb-6 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
					{error}
				</div>
			{/if}

			<form onsubmit={handleSubmit} class="space-y-6">
				{#if mode === 'register'}
					<div>
						<label for="username" class="mb-2 block text-sm font-medium text-text dark:text-white">
							Display Name (optional)
						</label>
						<Input
							id="username"
							bind:value={username}
							placeholder="Enter your name..."
							disabled={loading}
						/>
						<p class="mt-1 text-xs text-text-muted">
							This helps you identify your passkey later
						</p>
					</div>
				{/if}

				<Button
					type="submit"
					variant="primary"
					class="w-full"
					disabled={loading || !supported}
				>
					{#if loading}
						<span class="flex items-center justify-center gap-2">
							<svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
								<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
								<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
							</svg>
							{mode === 'login' ? 'Signing in...' : 'Creating account...'}
						</span>
					{:else}
						{mode === 'login' ? 'Sign in with Passkey' : 'Create Passkey'}
					{/if}
				</Button>
			</form>

			<div class="mt-6 text-center">
				<button
					type="button"
					onclick={() => {
						mode = mode === 'login' ? 'register' : 'login';
						error = null;
					}}
					class="text-sm text-primary hover:underline"
					disabled={loading}
				>
					{mode === 'login' ? "Don't have an account? Create one" : 'Already have an account? Sign in'}
				</button>
			</div>

			<div class="mt-8 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
				<h3 class="text-sm font-medium text-text dark:text-white mb-2">What are passkeys?</h3>
				<p class="text-xs text-text-muted leading-relaxed">
					Passkeys are a secure, passwordless way to sign in using your device's biometric authentication (Face ID, Touch ID, Windows Hello) or security key. They're more secure than passwords and can't be phished.
				</p>
			</div>
		</div>
	</div>
</div>
