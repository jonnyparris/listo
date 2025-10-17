<script lang="ts">
	import { goto } from '$app/navigation';
</script>

<div class="min-h-screen bg-background-light dark:bg-background-dark">
	<div class="mx-auto max-w-3xl px-4 py-8">
		<!-- Back Button -->
		<button
			onclick={() => goto('/')}
			class="mb-8 flex items-center gap-2 text-text-muted hover:text-text dark:hover:text-white transition-colors"
		>
			<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<line x1="19" y1="12" x2="5" y2="12"></line>
				<polyline points="12 19 5 12 12 5"></polyline>
			</svg>
			Back to Listo
		</button>

		<!-- Logo -->
		<div class="mb-12 text-center flex justify-center">
			<img
				src="/Listo_Logo_IntentionalChill.svg"
				alt="Listo - intentional chill"
				class="w-full max-w-[280px] sm:max-w-[320px] h-auto dark:brightness-90"
			/>
		</div>

		<!-- Content -->
		<div class="bg-white dark:bg-gray-800 rounded-2xl shadow-card p-8 sm:p-12 space-y-8">
			<section>
				<h2 class="text-3xl font-semibold text-text dark:text-white mb-4">About Listo</h2>
				<p class="text-text-muted leading-relaxed">
					Listo is a personal recommendation tracker that helps you remember the good stuff—the movies your friend wouldn't stop talking about, that book you keep meaning to read, the podcast episode that changed someone's perspective.
				</p>
			</section>

			<section>
				<h3 class="text-2xl font-semibold text-text dark:text-white mb-4">Why Listo Exists</h3>
				<div class="space-y-4 text-text-muted leading-relaxed">
					<p>
						We live in an age of algorithmic recommendations. Streaming platforms, social media feeds, and content aggregators all claim to know what we'll like next. They analyze our behavior, track our patterns, and serve us endless suggestions—often keeping us scrolling but rarely leaving us fulfilled.
					</p>
					<p>
						But the best recommendations don't come from algorithms. They come from <span class="font-semibold text-text dark:text-white">people</span>—friends who know your taste, strangers whose passion for something shines through, conversations that spark genuine interest.
					</p>
					<p>
						These human-led recommendations are personal, intentional, and meaningful. They carry context, emotion, and trust. A friend's "you have to watch this" means something an algorithm can never replicate.
					</p>
				</div>
			</section>

			<section>
				<h3 class="text-2xl font-semibold text-text dark:text-white mb-4">Intentional Chill</h3>
				<div class="space-y-4 text-text-muted leading-relaxed">
					<p>
						Listo is about being intentional with your consumption. Instead of mindlessly scrolling through algorithmic feeds, you curate your own list based on real recommendations from real people.
					</p>
					<p>
						When you're ready to watch, read, listen, or explore something new, you can pull from your personally curated collection—not what an algorithm thinks will keep you engaged, but what <span class="font-semibold text-text dark:text-white">you</span> actually want to experience.
					</p>
					<p>
						This is intentional chill: mindfully choosing how you spend your leisure time, guided by human connection rather than automated suggestions.
					</p>
				</div>
			</section>

			<section>
				<h3 class="text-2xl font-semibold text-text dark:text-white mb-4">Your Data, Your Control</h3>
				<div class="space-y-4 text-text-muted leading-relaxed">
					<p>
						Listo stores your recommendations locally in your browser by default. You can use the app without creating an account—your data stays on your device and never leaves your browser.
					</p>
					<p>
						If you want to sync your recommendations across devices, you can optionally sign in with a passkey. Even then, your data belongs to you. We don't sell it, we don't train models on it, and we don't use it to show you ads.
					</p>
					<p>
						You can export your data at any time, and if you ever want to leave, you can purge everything with a single click.
					</p>
				</div>
			</section>

			<section>
				<h3 class="text-2xl font-semibold text-text dark:text-white mb-4">Built for Humans</h3>
				<div class="space-y-4 text-text-muted leading-relaxed">
					<p>
						Listo is designed to be simple, fast, and respectful of your time. No notifications, no engagement tricks, no infinite scroll. Just a clean, minimalist tool for capturing and retrieving recommendations when you need them.
					</p>
					<p>
						Whether it's a movie recommended by a colleague, a recipe your neighbor swears by, or a book you heard about on a podcast—Listo helps you save it, remember it, and actually experience it.
					</p>
				</div>
			</section>

			<section class="pt-6 border-t border-gray-200 dark:border-gray-700">
				<p class="text-sm text-text-muted text-center">
					Made with care for people who value human connection over algorithmic consumption.
				</p>
				<p class="mt-4 text-sm text-text-muted text-center">
					<a href="/" class="text-primary hover:underline">← Back to Listo</a>
				</p>
			</section>
		</div>
	</div>
</div>
