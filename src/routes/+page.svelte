<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { Button, Input, Card } from '$lib/components/ui';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import TMDBAutocomplete from '$lib/components/TMDBAutocomplete.svelte';
	import EnrichmentAutocomplete from '$lib/components/EnrichmentAutocomplete.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import ToastContainer from '$lib/components/ToastContainer.svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import InstallPrompt from '$lib/components/InstallPrompt.svelte';
	import { dbOperations } from '$lib/db';
	import { syncService } from '$lib/services/sync';
	import { authService } from '$lib/services/auth';
	import { toastStore } from '$lib/stores/toast.svelte';
	import type { LocalRecommendation, Category } from '$lib/types';
	import type { SearchSuggestion } from '$lib/services/enrichment/types';

	let recommendations = $state<LocalRecommendation[]>([]);
	let completedRecs = $state<LocalRecommendation[]>([]);
	let filteredRecommendations = $state<LocalRecommendation[]>([]);
	let filteredCompletedRecs = $state<LocalRecommendation[]>([]);
	let showAddForm = $state(false);
	let showCompleted = $state(false);
	let editingId = $state<string | null>(null);
	let completingId = $state<string | null>(null);
	let userId = $state('');
	let isAuthenticated = $state(false);

	// Search state
	let searchQuery = $state('');
	let selectedCategory = $state<Category | 'all'>('all');

	// Form state
	let formTitle = $state('');
	let formCategory = $state<Category>('movie');
	let formDescription = $state('');
	let formSource = $state('');
	let formMetadata = $state<any>(undefined);

	// Review form state
	let reviewText = $state('');
	let reviewRating = $state(0);

	// Card navigation state
	let selectedCardIndex = $state(-1);
	let expandedCardId = $state<string | null>(null);

	// Keyboard shortcuts help
	let showKeyboardHelp = $state(false);

	// Settings menu
	let showSettingsMenu = $state(false);

	// Sync state
	let syncing = $state(false);
	let lastSyncError = $state<string | null>(null);

	// AI state
	let aiSuggesting = $state(false);

	// Category matches state
	let categoryMatches = $state<{ category: Category; count: number }[]>([]);

	// Confirm modal state
	let confirmModal = $state<{
		show: boolean;
		title: string;
		message: string;
		onConfirm: () => void;
	} | null>(null);

	// Migration state
	let showMigrationPrompt = $state(false);
	let sessionRecommendations = $state<LocalRecommendation[]>([]);

	// Source suggestions - get unique sources from all recommendations
	let sourceSuggestions = $derived.by(() => {
		const sources = new Set<string>();
		[...recommendations, ...completedRecs].forEach(rec => {
			if (rec.source && rec.source.trim()) {
				sources.add(rec.source.trim());
			}
		});
		return Array.from(sources).sort();
	});

	const categories: Category[] = [
		'movie',
		'show',
		'youtube',
		'podcast',
		'artist',
		'song',
		'genre',
		'restaurant',
		'recipe',
		'cuisine',
		'activity',
		'video-game',
		'board-game',
		'book',
		'graphic-novel',
		'quote'
	];

	onMount(async () => {
		// Get current user (authenticated or session-only)
		const user = await authService.getCurrentUser();

		// Check if we have session recommendations before login
		const hadSessionRecommendations = localStorage.getItem('had_session_recommendations') === 'true';
		const previousSessionId = localStorage.getItem('previous_session_id');

		// If user just authenticated and had session recommendations, offer to migrate
		if (user.authenticated && hadSessionRecommendations && previousSessionId && previousSessionId !== user.userId) {
			// Load recommendations from previous session
			sessionRecommendations = await dbOperations.getAllRecommendations(previousSessionId);
			const completedSessionRecs = await dbOperations.getCompletedRecommendations(previousSessionId);
			sessionRecommendations = [...sessionRecommendations, ...completedSessionRecs];

			if (sessionRecommendations.length > 0) {
				showMigrationPrompt = true;
			} else {
				// Clear flags if no recommendations found
				localStorage.removeItem('had_session_recommendations');
				localStorage.removeItem('previous_session_id');
			}
		}

		userId = user.userId;
		isAuthenticated = user.authenticated;

		await loadRecommendations();

		// Track if this session has recommendations (for future migration)
		if (!user.authenticated && recommendations.length > 0) {
			localStorage.setItem('had_session_recommendations', 'true');
			localStorage.setItem('previous_session_id', user.userId);
		}

		// Global keyboard shortcuts
		const handleKeydown = (e: KeyboardEvent) => {
			// Don't trigger shortcuts when typing in input fields or textareas
			const target = e.target as HTMLElement;
			const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';

			// Escape - close forms/modals
			if (e.key === 'Escape') {
				if (showKeyboardHelp) {
					showKeyboardHelp = false;
				} else if (showAddForm) {
					resetForm();
				} else if (completingId) {
					completingId = null;
				}
				return;
			}

			// ? - Show keyboard shortcuts help
			if (e.key === '?' && !isTyping) {
				e.preventDefault();
				showKeyboardHelp = !showKeyboardHelp;
			}

			// Don't trigger other shortcuts when typing
			if (isTyping && e.key !== 'Escape') return;

			// N - New recommendation (when not in completed view)
			if (e.key === 'n' && !showCompleted && !showAddForm) {
				e.preventDefault();
				showAddForm = true;
			}

			// / - Focus search
			if (e.key === '/') {
				e.preventDefault();
				const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
				if (searchInput) searchInput.focus();
			}

			// T - Toggle between active/completed
			if (e.key === 't') {
				e.preventDefault();
				showCompleted = !showCompleted;
			}

			// Cmd/Ctrl + S - Save form (when form is open)
			if ((e.metaKey || e.ctrlKey) && e.key === 's' && showAddForm) {
				e.preventDefault();
				saveRecommendation();
			}

			// Arrow keys - Navigate cards
			const currentList = showCompleted ? filteredCompletedRecs : filteredRecommendations;
			if (e.key === 'ArrowDown' && !showAddForm && !completingId) {
				e.preventDefault();
				selectedCardIndex = Math.min(selectedCardIndex + 1, currentList.length - 1);
				scrollToSelectedCard();
			}
			if (e.key === 'ArrowUp' && !showAddForm && !completingId) {
				e.preventDefault();
				selectedCardIndex = Math.max(selectedCardIndex - 1, -1);
				scrollToSelectedCard();
			}

			// Enter - Perform action on selected card
			if (e.key === 'Enter' && selectedCardIndex >= 0 && !showAddForm && !completingId) {
				e.preventDefault();
				const selectedRec = currentList[selectedCardIndex];
				if (selectedRec) {
					if (showCompleted) {
						uncompleteRecommendation(selectedRec.id);
					} else {
						startComplete(selectedRec);
					}
				}
			}

			// E - Edit selected card
			if (e.key === 'e' && selectedCardIndex >= 0 && !showAddForm && !completingId && !showCompleted) {
				e.preventDefault();
				const selectedRec = filteredRecommendations[selectedCardIndex];
				if (selectedRec) startEdit(selectedRec);
			}

			// D - Delete selected card
			if (e.key === 'd' && selectedCardIndex >= 0 && !showAddForm && !completingId) {
				e.preventDefault();
				const selectedRec = currentList[selectedCardIndex];
				if (selectedRec) deleteRecommendation(selectedRec.id);
			}
		};

		function scrollToSelectedCard() {
			setTimeout(() => {
				const selectedCard = document.querySelector('.card-selected');
				if (selectedCard) {
					selectedCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
				}
			}, 50);
		}

		window.addEventListener('keydown', handleKeydown);

		// Close settings menu when clicking outside
		const handleClickOutside = (e: MouseEvent) => {
			const target = e.target as HTMLElement;
			if (showSettingsMenu && !target.closest('.relative')) {
				showSettingsMenu = false;
			}
		};

		window.addEventListener('click', handleClickOutside);

		return () => {
			window.removeEventListener('keydown', handleKeydown);
			window.removeEventListener('click', handleClickOutside);
		};
	});

	async function loadRecommendations() {
		recommendations = await dbOperations.getAllRecommendations(userId);
		completedRecs = await dbOperations.getCompletedRecommendations(userId);
		applyFilters();

		// Track if session has recommendations
		if (!isAuthenticated && (recommendations.length > 0 || completedRecs.length > 0)) {
			localStorage.setItem('had_session_recommendations', 'true');
			localStorage.setItem('previous_session_id', userId);
		}
	}

	async function migrateSessionRecommendations() {
		try {
			for (const rec of sessionRecommendations) {
				// Update user_id to current authenticated user
				const migratedRec = { ...rec, user_id: userId, synced: false };
				await dbOperations.addRecommendation(migratedRec);
			}

			// Clear session data
			const previousSessionId = localStorage.getItem('previous_session_id');
			if (previousSessionId) {
				// Delete old session recommendations
				for (const rec of sessionRecommendations) {
					await dbOperations.deleteRecommendation(rec.id);
				}
			}

			localStorage.removeItem('had_session_recommendations');
			localStorage.removeItem('previous_session_id');

			await loadRecommendations();
			showMigrationPrompt = false;
			toastStore.success(`Migrated ${sessionRecommendations.length} recommendations to your account`);
		} catch (error) {
			console.error('Migration failed:', error);
			toastStore.error('Failed to migrate recommendations');
		}
	}

	function dismissMigrationPrompt() {
		localStorage.removeItem('had_session_recommendations');
		localStorage.removeItem('previous_session_id');
		showMigrationPrompt = false;
	}

	function applyFilters() {
		const query = searchQuery.toLowerCase().trim();

		// Filter active recommendations
		filteredRecommendations = recommendations.filter((rec) => {
			const matchesCategory = selectedCategory === 'all' || rec.category === selectedCategory;
			const genresText = rec.metadata?.genres?.join(' ').toLowerCase() || '';
			const matchesSearch =
				!query ||
				rec.title.toLowerCase().includes(query) ||
				rec.description?.toLowerCase().includes(query) ||
				rec.tags?.toLowerCase().includes(query) ||
				genresText.includes(query);
			return matchesCategory && matchesSearch;
		});

		// Filter completed recommendations
		filteredCompletedRecs = completedRecs.filter((rec) => {
			const matchesCategory = selectedCategory === 'all' || rec.category === selectedCategory;
			const genresText = rec.metadata?.genres?.join(' ').toLowerCase() || '';
			const matchesSearch =
				!query ||
				rec.title.toLowerCase().includes(query) ||
				rec.description?.toLowerCase().includes(query) ||
				rec.review?.toLowerCase().includes(query) ||
				rec.tags?.toLowerCase().includes(query) ||
				genresText.includes(query);
			return matchesCategory && matchesSearch;
		});
	}

	function handleSearch(query: string) {
		searchQuery = query;
		applyFilters();
	}

	function handleCategoryChange(category: Category | 'all') {
		selectedCategory = category;
		applyFilters();
	}

	async function saveRecommendation() {
		// Validate title
		if (!formTitle.trim()) {
			toastStore.error('Please enter a title');
			return;
		}

		// Convert metadata to plain object to avoid Proxy serialization issues
		const plainMetadata = formMetadata ? JSON.parse(JSON.stringify(formMetadata)) : undefined;

		if (editingId) {
			// Update existing
			await dbOperations.updateRecommendation(editingId, {
				title: formTitle.trim(),
				category: formCategory,
				description: formDescription.trim() || undefined,
				source: formSource.trim() || undefined,
				metadata: plainMetadata,
				synced: false
			});
			toastStore.success('Recommendation updated');
		} else {
			// Create new
			const recommendation: LocalRecommendation = {
				id: crypto.randomUUID(),
				user_id: userId,
				category: formCategory,
				title: formTitle.trim(),
				description: formDescription.trim() || undefined,
				source: formSource.trim() || undefined,
				metadata: plainMetadata,
				created_at: Math.floor(Date.now() / 1000),
				updated_at: Math.floor(Date.now() / 1000),
				synced: false
			};
			await dbOperations.addRecommendation(recommendation);
			toastStore.success('Recommendation added');
		}

		await loadRecommendations();
		resetForm();
	}

	function startEdit(rec: LocalRecommendation) {
		editingId = rec.id;
		formTitle = rec.title;
		formCategory = rec.category;
		formDescription = rec.description || '';
		formSource = rec.source || '';
		formMetadata = rec.metadata;
		showAddForm = true;
	}

	function deleteRecommendation(id: string) {
		confirmModal = {
			show: true,
			title: 'Delete Recommendation',
			message: 'Are you sure you want to delete this recommendation? This action cannot be undone.',
			onConfirm: async () => {
				await dbOperations.deleteRecommendation(id);
				await loadRecommendations();
				confirmModal = null;
				toastStore.success('Recommendation deleted');
			}
		};
	}

	function startComplete(rec: LocalRecommendation) {
		completingId = rec.id;
		reviewText = '';
		reviewRating = 0;
	}

	async function saveComplete() {
		if (!completingId) return;

		await dbOperations.updateRecommendation(completingId, {
			completed_at: Math.floor(Date.now() / 1000),
			review: reviewText.trim() || undefined,
			rating: reviewRating || undefined,
			synced: false
		});

		await loadRecommendations();
		completingId = null;
		reviewText = '';
		reviewRating = 0;
	}

	async function uncompleteRecommendation(id: string) {
		await dbOperations.updateRecommendation(id, {
			completed_at: undefined,
			review: undefined,
			rating: undefined,
			synced: false
		});
		await loadRecommendations();
	}

	function resetForm() {
		formTitle = '';
		formDescription = '';
		formSource = '';
		formCategory = 'movie';
		formMetadata = undefined;
		showAddForm = false;
		editingId = null;
	}

	function formatCategory(cat: string): string {
		return cat
			.split('-')
			.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
			.join(' ');
	}

	function formatDate(timestamp: number): string {
		return new Date(timestamp * 1000).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	function handleEnrichmentSelect(suggestion: any) {
		formTitle = suggestion.title;
		formMetadata = suggestion.metadata;

		// Auto-fill description if available
		if (suggestion.metadata?.overview && !formDescription) {
			formDescription = suggestion.metadata.overview;
		} else if (suggestion.metadata?.description && !formDescription) {
			formDescription = suggestion.metadata.description;
		}

		// Ensure we have an image for the recommendation
		if (suggestion.thumbnail) {
			if (!formMetadata) {
				formMetadata = {};
			}
			if (!formMetadata.poster_url && !formMetadata.thumbnail_url && !formMetadata.cover_url) {
				formMetadata.thumbnail_url = suggestion.thumbnail;
			}
		}
	}

	async function handleSync() {
		if (syncing) return;

		// Only allow sync for authenticated users
		if (!isAuthenticated) {
			toastStore.error('Please sign in to sync your recommendations');
			return;
		}

		syncing = true;
		lastSyncError = null;

		const result = await syncService.fullSync(userId);

		if (result.success) {
			await loadRecommendations();
			toastStore.success('Synced successfully');
		} else {
			lastSyncError = result.error || 'Sync failed';
		}

		syncing = false;
	}

	async function shareRecommendation(rec: LocalRecommendation) {
		const shareText = formatShareText(rec);

		// Get image URL if available
		const imageUrl = rec.metadata?.poster_url ||
		                 rec.metadata?.thumbnail_url ||
		                 rec.metadata?.cover_url ||
		                 rec.metadata?.album_art;

		// Try Web Share API if available
		if (navigator.share) {
			try {
				const shareData: ShareData = {
					title: `Recommendation: ${rec.title}`,
					text: shareText
				};

				// If there's an image and the browser supports sharing files
				if (imageUrl && navigator.canShare) {
					try {
						// Fetch the image and convert to blob
						const response = await fetch(imageUrl);
						const blob = await response.blob();
						const file = new File([blob], 'recommendation.jpg', { type: blob.type });

						// Check if we can share files
						if (navigator.canShare({ files: [file] })) {
							shareData.files = [file];
						}
					} catch (imgError) {
						console.warn('Failed to fetch image for sharing:', imgError);
						// Continue without image
					}
				}

				await navigator.share(shareData);
				toastStore.success('Shared successfully!');
				return;
			} catch (error) {
				// User cancelled - don't show error
				if (error instanceof Error && error.name === 'AbortError') {
					return;
				}
				// Fall back to clipboard for other errors
			}
		}

		// Fallback to clipboard
		try {
			let clipboardText = shareText;

			// Add image URL to clipboard text if available
			if (imageUrl) {
				clipboardText += `\n\nImage: ${imageUrl}`;
			}

			await navigator.clipboard.writeText(clipboardText);
			toastStore.success('Copied to clipboard!');
		} catch (error) {
			console.error('Failed to share:', error);
			toastStore.error('Failed to copy to clipboard');
		}
	}

	function formatShareText(rec: LocalRecommendation): string {
		let text = `📌 ${rec.title}\n`;
		text += `Category: ${formatCategory(rec.category)}\n`;

		if (rec.source) {
			text += `Recommended by: ${rec.source}\n`;
		}

		if (rec.metadata?.year) {
			text += `Year: ${rec.metadata.year}\n`;
		}

		if (rec.metadata?.genres && rec.metadata.genres.length > 0) {
			text += `Genres: ${rec.metadata.genres.join(', ')}\n`;
		}

		if (rec.rating) {
			text += `Rating: ${'★'.repeat(rec.rating)}${'☆'.repeat(5 - rec.rating)}\n`;
		}

		if (rec.description) {
			text += `\n${rec.description}\n`;
		}

		if (rec.review) {
			text += `\nReview: ${rec.review}\n`;
		}

		// Add relevant links
		if (rec.metadata?.spotify_url) {
			text += `\n🎵 Spotify: ${rec.metadata.spotify_url}`;
		}
		if (rec.metadata?.youtube_url) {
			text += `\n📺 YouTube: ${rec.metadata.youtube_url}`;
		}
		if (rec.metadata?.google_maps_link) {
			text += `\n📍 Location: ${rec.metadata.google_maps_link}`;
		}

		text += `\n\nShared from Listo`;

		return text;
	}

	function handlePurgeAll() {
		const totalCount = recommendations.length + completedRecs.length;

		if (totalCount === 0) {
			toastStore.error('No recommendations to delete');
			return;
		}

		confirmModal = {
			show: true,
			title: 'Purge All Recommendations?',
			message: `This will permanently delete all ${totalCount} recommendations (${recommendations.length} active, ${completedRecs.length} completed). This action cannot be undone. Are you absolutely sure?`,
			onConfirm: async () => {
				// Second confirmation
				confirmModal = {
					show: true,
					title: 'Final Confirmation',
					message: 'This is your last chance. Do you really want to delete everything?',
					onConfirm: async () => {
						try {
							// Delete all recommendations from IndexedDB
							for (const rec of [...recommendations, ...completedRecs]) {
								await dbOperations.deleteRecommendation(rec.id);
							}
							await loadRecommendations();
							confirmModal = null;
							toastStore.success('All recommendations deleted');
						} catch (error) {
							console.error('Failed to purge recommendations:', error);
							toastStore.error('Failed to delete recommendations');
							confirmModal = null;
						}
					}
				};
			}
		};
	}

	async function handleExport() {
		try {
			const allRecs = [...recommendations, ...completedRecs];
			if (allRecs.length === 0) {
				toastStore.error('No recommendations to export');
				return;
			}

			const exportData = {
				version: '1.0',
				exported_at: new Date().toISOString(),
				user_id: userId,
				recommendations: allRecs
			};

			const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `listo-export-${new Date().toISOString().split('T')[0]}.json`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);

			toastStore.success('Recommendations exported successfully');
		} catch (error) {
			console.error('Export failed:', error);
			toastStore.error('Failed to export recommendations');
		}
	}

	async function handleImport() {
		try {
			const input = document.createElement('input');
			input.type = 'file';
			input.accept = 'application/json';

			input.onchange = async (e) => {
				const file = (e.target as HTMLInputElement).files?.[0];
				if (!file) return;

				try {
					const text = await file.text();
					const importData = JSON.parse(text);

					if (!importData.recommendations || !Array.isArray(importData.recommendations)) {
						throw new Error('Invalid export file format');
					}

					let imported = 0;
					for (const rec of importData.recommendations) {
						// Update user_id to current user
						const newRec = { ...rec, user_id: userId, synced: false };

						// Check if recommendation already exists
						const existing = await dbOperations.getRecommendation(rec.id);
						if (!existing) {
							await dbOperations.addRecommendation(newRec);
							imported++;
						}
					}

					await loadRecommendations();
					toastStore.success(`Imported ${imported} recommendations`);
				} catch (error) {
					console.error('Import failed:', error);
					toastStore.error('Failed to import recommendations');
				}
			};

			input.click();
		} catch (error) {
			console.error('Import failed:', error);
			toastStore.error('Failed to import recommendations');
		}
	}

	async function suggestCategory() {
		if (!formTitle.trim()) {
			toastStore.error('Please enter a title first');
			return;
		}

		aiSuggesting = true;

		try {
			const response = await fetch('/api/ai/suggest-category', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ text: formTitle })
			});

			if (!response.ok) {
				throw new Error('Failed to suggest category');
			}

			const { category } = await response.json();
			formCategory = category;
			toastStore.success(`Suggested: ${formatCategory(category)}`);
		} catch (error) {
			console.error('AI suggestion failed:', error);
			toastStore.error('Failed to suggest category');
		} finally{
			aiSuggesting = false;
		}
	}

	function toggleCardExpansion(id: string) {
		expandedCardId = expandedCardId === id ? null : id;
	}

	// Search for similar recommendations across categories
	function searchSimilarRecommendations(title: string) {
		if (!title || title.trim().length < 2) {
			categoryMatches = [];
			return;
		}

		const searchTerm = title.toLowerCase().trim();
		const matchesByCategory = new Map<Category, number>();

		// Search through all recommendations
		const allRecs = [...recommendations, ...completedRecs];

		for (const rec of allRecs) {
			// Skip if it's the current category
			if (rec.category === formCategory) continue;

			// Check if title matches (fuzzy search)
			if (rec.title.toLowerCase().includes(searchTerm)) {
				const count = matchesByCategory.get(rec.category) || 0;
				matchesByCategory.set(rec.category, count + 1);
			}
		}

		// Convert to array and sort by count
		categoryMatches = Array.from(matchesByCategory.entries())
			.map(([category, count]) => ({ category, count }))
			.sort((a, b) => b.count - a.count)
			.slice(0, 3); // Show top 3 categories only
	}

	// Watch formTitle changes to update category matches
	$effect(() => {
		searchSimilarRecommendations(formTitle);
	});
</script>

<div class="min-h-screen bg-background-light dark:bg-background-dark">
	<div class="mx-auto max-w-4xl px-4 py-8 pb-20">
		<!-- Theme Toggle, Sync, Help, Settings, and Auth (top right) -->
		<div class="sticky top-0 z-40 bg-background-light dark:bg-background-dark py-4 -mt-4 mb-4 sm:static sm:py-0 sm:mt-0">
			<div class="flex items-center justify-end gap-2">
			<button
				onclick={() => (showKeyboardHelp = true)}
				class="p-2 rounded-lg text-text-muted hover:text-text dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center justify-center"
				title="Keyboard shortcuts (?)"
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<circle cx="12" cy="12" r="10"></circle>
					<path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
					<line x1="12" y1="17" x2="12.01" y2="17"></line>
				</svg>
			</button>
			<button
				onclick={handleSync}
				disabled={syncing || !isAuthenticated}
				class="p-2 rounded-lg text-text-muted hover:text-text dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
				title={!isAuthenticated ? 'Sign in to sync' : syncing ? 'Syncing...' : lastSyncError ? `Sync error: ${lastSyncError}` : 'Sync with server'}
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					class={syncing ? 'animate-spin' : ''}
				>
					<path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
				</svg>
			</button>

			<!-- Settings Menu -->
			<div class="relative">
				<button
					onclick={() => (showSettingsMenu = !showSettingsMenu)}
					class="p-2 rounded-lg text-text-muted hover:text-text dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center justify-center"
					title="Settings"
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
						<circle cx="12" cy="12" r="3"></circle>
					</svg>
				</button>

				{#if showSettingsMenu}
					<div
						role="menu"
						tabindex="-1"
						class="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50"
						onclick={(e) => e.stopPropagation()}
						onkeydown={(e) => {
							if (e.key === 'Escape') {
								showSettingsMenu = false;
							}
						}}
					>
						<button
							onclick={() => {
								goto('/about');
								showSettingsMenu = false;
							}}
							class="w-full text-left px-4 py-2 text-sm text-text dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
						>
							About Listo
						</button>
						<div class="border-t border-gray-200 dark:border-gray-700 my-2"></div>
						<div class="px-4 py-2">
							<div class="text-xs font-semibold text-text dark:text-white mb-1">Data Management</div>
							<div class="text-xs text-text-muted mb-3">Backup your recommendations or migrate between devices</div>
							<button
								onclick={() => {
									handleExport();
									showSettingsMenu = false;
								}}
								class="w-full text-left px-4 py-2 text-sm text-text dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors rounded-lg mb-1"
							>
								Export Data
								<div class="text-xs text-text-muted mt-0.5">Download all your recommendations as JSON</div>
							</button>
							<button
								onclick={() => {
									handleImport();
									showSettingsMenu = false;
								}}
								class="w-full text-left px-4 py-2 text-sm text-text dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors rounded-lg"
							>
								Import Data
								<div class="text-xs text-text-muted mt-0.5">Restore from a previous export file</div>
							</button>
						</div>
						<div class="border-t border-gray-200 dark:border-gray-700 my-2"></div>
						<button
							onclick={() => {
								handlePurgeAll();
								showSettingsMenu = false;
							}}
							class="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
						>
							Purge All Data
						</button>
					</div>
				{/if}
			</div>

			{#if !isAuthenticated}
				<button
					onclick={() => goto('/auth')}
					class="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 shadow-sm hover:shadow-md transition-all"
					title="Sign in to sync across devices"
				>
					Sign In
				</button>
			{:else}
				<div class="flex items-center gap-2">
					<span class="text-xs text-text-muted px-2">Signed In</span>
				</div>
			{/if}
				<ThemeToggle />
			</div>
		</div>

		{#if lastSyncError}
			<div class="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
				<div class="flex items-center justify-between">
					<span>Sync error: {lastSyncError}</span>
					<button
						onclick={() => (lastSyncError = null)}
						class="text-red-500 hover:text-red-700 dark:hover:text-red-400"
					>
						✕
					</button>
				</div>
			</div>
		{/if}

		<!-- Header -->
		<header class="mb-12 text-center flex justify-center">
			<a href="/" class="hover:opacity-80 transition-opacity">
				<img
					src="/Listo_Logo_IntentionalChill.svg"
					alt="Listo - intentional chill"
					class="w-full max-w-[280px] sm:max-w-[320px] md:max-w-[400px] h-auto text-text dark:text-white"
				/>
			</a>
		</header>

		<!-- View Toggle -->
		<div class="mb-8 flex justify-center gap-2">
			<button
				onclick={() => (showCompleted = false)}
				class="px-4 py-2 text-sm rounded-lg transition-colors {!showCompleted ? 'bg-primary/20 text-text dark:text-white font-medium' : 'text-text-muted hover:bg-gray-100 dark:hover:bg-gray-800'}"
			>
				Active ({recommendations.length})
			</button>
			<button
				onclick={() => (showCompleted = true)}
				class="px-4 py-2 text-sm rounded-lg transition-colors {showCompleted ? 'bg-primary/20 text-text dark:text-white font-medium' : 'text-text-muted hover:bg-gray-100 dark:hover:bg-gray-800'}"
			>
				Completed ({completedRecs.length})
			</button>
		</div>

		<!-- Category Subtotals -->
		{#if selectedCategory === 'all' && (recommendations.length > 0 || completedRecs.length > 0)}
			{@const categoryCounts = categories.reduce((acc, cat) => {
				const activeCount = recommendations.filter(r => r.category === cat).length;
				const completedCount = completedRecs.filter(r => r.category === cat).length;
				const total = activeCount + completedCount;
				if (total > 0) {
					acc.push({ category: cat, active: activeCount, completed: completedCount, total });
				}
				return acc;
			}, [] as Array<{ category: string; active: number; completed: number; total: number }>)}
			{#if categoryCounts.length > 0}
				<div class="mb-6 p-4 rounded-xl bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700">
					<h3 class="text-sm font-semibold text-text dark:text-white mb-3">By Category</h3>
					<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
						{#each categoryCounts as { category, active, completed, total }}
							<button
								onclick={() => handleCategoryChange(category)}
								class="text-left p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
							>
								<div class="text-xs font-medium text-text dark:text-white mb-1">
									{formatCategory(category)}
								</div>
								<div class="text-xs text-text-muted">
									{total} total · {active} active
								</div>
							</button>
						{/each}
					</div>
				</div>
			{/if}
		{/if}

		<!-- Search and Filter -->
		<div class="mb-8">
			<SearchBar
				bind:value={searchQuery}
				bind:selectedCategory={selectedCategory}
				onSearch={handleSearch}
				onCategoryChange={handleCategoryChange}
				placeholder={showCompleted ? 'Search completed items...' : 'Search recommendations...'}
			/>
		</div>

		<!-- Floating Action Button -->
		{#if !showCompleted && !showAddForm}
			<button
				onclick={() => {
					showAddForm = true;
				}}
				class="fixed bottom-8 right-8 h-14 w-14 rounded-full bg-secondary shadow-lg hover:shadow-xl transition-all hover:scale-110 flex items-center justify-center z-50"
				aria-label="Add recommendation"
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
					<line x1="12" y1="5" x2="12" y2="19"></line>
					<line x1="5" y1="12" x2="19" y2="12"></line>
				</svg>
			</button>
		{/if}

		<!-- Add/Edit Form Modal -->
		{#if showAddForm && !showCompleted}
			<div
				class="fixed inset-0 bg-background-light dark:bg-background-dark z-50 overflow-y-auto"
			>
				<div class="min-h-screen flex flex-col">
					<!-- Header -->
					<div class="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-4 sm:px-6">
						<div class="flex items-center justify-between max-w-2xl mx-auto">
							<h2 class="text-xl sm:text-2xl font-semibold text-text dark:text-white">
								{editingId ? 'Edit Recommendation' : 'Add Recommendation'}
							</h2>
							<button
								onclick={() => resetForm()}
								class="p-2 text-text-muted hover:text-text dark:hover:text-white transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
								aria-label="Close"
							>
								<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
									<line x1="18" y1="6" x2="6" y2="18"></line>
									<line x1="6" y1="6" x2="18" y2="18"></line>
								</svg>
							</button>
						</div>
					</div>

					<!-- Form Content -->
					<div class="flex-1 px-4 py-6 sm:px-6">
						<div class="max-w-2xl mx-auto">
							<form
								onsubmit={(e) => {
									e.preventDefault();
									saveRecommendation();
								}}
							>
								<div class="space-y-6">
									<div>
										<div class="mb-3 flex items-center justify-between">
											<span class="block text-sm font-medium text-text dark:text-white">
												Category
											</span>
											<button
												type="button"
												onclick={suggestCategory}
												disabled={aiSuggesting || !formTitle.trim()}
												class="text-xs px-2 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
												title="AI suggest category based on title"
											>
												{#if aiSuggesting}
													<svg class="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
														<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
														<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
													</svg>
													Suggesting...
												{:else}
													<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
														<path d="m8 3 4 8 5-5-5 5 8 4"></path>
													</svg>
													AI Suggest
												{/if}
											</button>
										</div>
										<!-- Category button cluster -->
										<div class="relative -mx-4 px-4 sm:mx-0 sm:px-0">
											<div class="flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory touch-pan-x" style="scroll-behavior: smooth; -webkit-overflow-scrolling: touch;">
												{#each categories as cat}
													<button
														type="button"
														onclick={() => formCategory = cat}
														class="flex-shrink-0 snap-start px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200 {formCategory === cat ? 'bg-primary text-white shadow-md scale-105' : 'bg-gray-100 dark:bg-gray-800 text-text dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700'}"
													>
														{formatCategory(cat)}
													</button>
												{/each}
											</div>
											<!-- Fade edges for scroll indication -->
											<div class="absolute left-0 top-0 bottom-2 w-8 bg-gradient-to-r from-white dark:from-gray-900 to-transparent pointer-events-none sm:hidden"></div>
											<div class="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-white dark:from-gray-900 to-transparent pointer-events-none sm:hidden"></div>
										</div>
									</div>

									<div>
										<label for="title" class="mb-2 block text-sm font-medium text-text dark:text-white">
											Title
										</label>
										{#if formCategory === 'movie' || formCategory === 'show'}
											<TMDBAutocomplete
												bind:value={formTitle}
												category={formCategory}
												onSelect={handleEnrichmentSelect}
												placeholder={`Search for a ${formCategory}...`}
												autofocus
											/>
										{:else if formCategory === 'book' || formCategory === 'graphic-novel' || formCategory === 'youtube' || formCategory === 'artist' || formCategory === 'song'}
											<EnrichmentAutocomplete
												bind:value={formTitle}
												category={formCategory}
												onSelect={handleEnrichmentSelect}
												placeholder={`Search for a ${formatCategory(formCategory).toLowerCase()}...`}
												autofocus
											/>
										{:else}
											<Input id="title" bind:value={formTitle} placeholder="Enter title..." autofocus />
										{/if}

										<!-- Category matches subtotal -->
										{#if categoryMatches.length > 0}
											<div class="mt-2 text-xs text-text-muted flex items-center gap-1 flex-wrap">
												<span>Also found in:</span>
												{#each categoryMatches as match, i}
													<button
														type="button"
														onclick={() => formCategory = match.category}
														class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors"
													>
														<span class="font-medium">{formatCategory(match.category)}</span>
														<span class="text-text-muted">({match.count})</span>
													</button>
													{#if i < categoryMatches.length - 1}
														<span>·</span>
													{/if}
												{/each}
											</div>
										{/if}
									</div>

									<div>
										<label
											for="source"
											class="mb-2 block text-sm font-medium text-text dark:text-white"
										>
											Source (optional)
										</label>
										<Input
											id="source"
											bind:value={formSource}
											placeholder="Who recommended this? (friend, podcast, article...)"
											list="source-suggestions"
										/>
										<datalist id="source-suggestions">
											{#each sourceSuggestions as source}
												<option value={source}></option>
											{/each}
										</datalist>
										<p class="mt-1 text-xs text-text-muted">
											Keep track of where you heard about this
										</p>
									</div>

									<div>
										<label
											for="description"
											class="mb-2 block text-sm font-medium text-text dark:text-white"
										>
											Notes (optional)
										</label>
										<textarea
											id="description"
											bind:value={formDescription}
											placeholder="Add some notes..."
											class="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-background-light dark:bg-gray-800 px-4 py-3 text-text dark:text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary resize-none text-base"
											rows="6"
											onkeydown={(e) => {
												if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
													e.preventDefault();
													saveRecommendation();
												}
											}}
										></textarea>
									</div>
								</div>
							</form>
						</div>
					</div>

					<!-- Footer with Save Button -->
					<div class="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-4 sm:px-6 safe-area-inset-bottom">
						<div class="max-w-2xl mx-auto">
							<Button
								onclick={() => saveRecommendation()}
								variant="primary"
								class="w-full text-base py-3"
							>
								{editingId ? 'Update' : 'Save'} Recommendation
							</Button>
						</div>
					</div>
				</div>
			</div>
		{/if}

		<!-- Active Recommendations -->
		{#if !showCompleted}
			<div class="space-y-4">
				{#if filteredRecommendations.length === 0}
					<div class="py-16 text-center">
						<div class="mb-4">
							<svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto text-text-muted opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
							</svg>
						</div>
						{#if recommendations.length === 0}
							<h3 class="text-lg font-medium text-text dark:text-white mb-2">No recommendations yet</h3>
							<p class="text-text-muted mb-4">Start building your list of things to watch, read, listen to, and more.</p>
							<button
								onclick={() => {
									showAddForm = true;
								}}
								class="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-white hover:bg-primary/90 transition-all shadow-sm hover:shadow-md font-medium"
							>
								<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
									<line x1="12" y1="5" x2="12" y2="19"></line>
									<line x1="5" y1="12" x2="19" y2="12"></line>
								</svg>
								Add Your First Recommendation
							</button>
						{:else}
							<h3 class="text-lg font-medium text-text dark:text-white mb-2">No matches found</h3>
							<p class="text-text-muted">Try adjusting your search or filters.</p>
						{/if}
					</div>
				{:else}
					{#each filteredRecommendations as rec, index (rec.id)}
						<Card class="hover:scale-[1.01] transition-transform {selectedCardIndex === index ? 'card-selected ring-2 ring-primary' : ''}">
							{#if completingId === rec.id}
								<!-- Complete Form -->
								<div class="space-y-4">
									<div class="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-3">
										<h3 class="text-lg font-semibold text-text dark:text-white">
											Mark as Completed
										</h3>
										<button onclick={() => (completingId = null)} class="text-text-muted hover:text-text">
											✕
										</button>
									</div>

									<div>
										<p class="mb-2 text-sm font-medium text-text dark:text-white">
											{rec.title}
										</p>
										<p class="mb-4 text-xs text-text-muted">{formatCategory(rec.category)}</p>

										<div class="mb-2 text-sm font-medium text-text dark:text-white">
											Rating (optional)
										</div>
										<div class="mb-4 flex gap-2">
											{#each [1, 2, 3, 4, 5] as star}
												<button
													type="button"
													onclick={() => (reviewRating = star)}
													class="text-2xl transition-all hover:scale-110"
													class:text-secondary={reviewRating >= star}
													class:text-gray-300={reviewRating < star}
												>
													★
												</button>
											{/each}
										</div>

										<label for="review" class="mb-2 block text-sm font-medium text-text dark:text-white">
											Review (optional)
										</label>
										<textarea
											id="review"
											bind:value={reviewText}
											placeholder="What did you think?"
											class="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-background-light dark:bg-gray-800 px-4 py-3 text-text dark:text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
											rows="3"
											onkeydown={(e) => {
												if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
													e.preventDefault();
													saveComplete();
												}
											}}
										></textarea>
									</div>

									<div class="flex gap-3">
										<Button onclick={saveComplete} variant="primary" class="flex-1">
											Complete
										</Button>
										<Button variant="ghost" onclick={() => (completingId = null)}>Cancel</Button>
									</div>
								</div>
							{:else}
								<!-- Normal View -->
								<div
									role="button"
									tabindex="0"
									class="flex items-start gap-4 cursor-pointer"
									onclick={() => toggleCardExpansion(rec.id)}
									onkeydown={(e) => {
										if (e.key === 'Enter' || e.key === ' ') {
											e.preventDefault();
											toggleCardExpansion(rec.id);
										}
									}}
								>
									{#if rec.metadata?.poster_url || rec.metadata?.thumbnail_url}
										<img
											src={rec.metadata.poster_url || rec.metadata.thumbnail_url}
											alt={rec.title}
											class="h-32 w-24 rounded object-cover flex-shrink-0"
											loading="lazy"
											decoding="async"
										/>
									{/if}
									<div class="flex-1 min-w-0">
										<div class="mb-1 flex items-center gap-2 flex-wrap">
											<span class="rounded-full bg-primary/20 px-3 py-1 text-xs font-medium text-text">
												{formatCategory(rec.category)}
											</span>
											{#if rec.metadata?.year}
												<span class="text-xs text-text-muted">
													{rec.metadata.year}
												</span>
											{/if}
											<span
												class="rounded-full px-2 py-1 text-xs {rec.synced ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-secondary/20 text-text-muted'}"
												title={rec.synced ? 'Synced' : 'Not synced'}
											>
												{rec.synced ? '✓' : '⏱'}
											</span>
										</div>
										<h3 class="mb-1 text-lg font-semibold text-text dark:text-white">
											{rec.title}
										</h3>
										{#if rec.source}
											<div class="mb-2 text-xs text-text-muted flex items-center gap-1">
												<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
													<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
												</svg>
												Recommended by {rec.source}
											</div>
										{/if}
										{#if rec.metadata?.genres && rec.metadata.genres.length > 0}
											<div class="mb-2 flex gap-1 flex-wrap">
												{#each rec.metadata.genres.slice(0, 3) as genre}
													<span class="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
														{genre}
													</span>
												{/each}
											</div>
										{/if}
										{#if rec.metadata?.spotify_url || rec.metadata?.youtube_url}
											<div class="mb-2 flex gap-2 items-center">
												{#if rec.metadata?.spotify_url}
													<a
														href={rec.metadata.spotify_url}
														target="_blank"
														rel="noopener noreferrer"
														class="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 hover:underline"
														onclick={(e) => e.stopPropagation()}
													>
														<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
															<path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
														</svg>
														Listen
													</a>
												{/if}
												{#if rec.metadata?.youtube_url}
													<a
														href={rec.metadata.youtube_url}
														target="_blank"
														rel="noopener noreferrer"
														class="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400 hover:underline"
														onclick={(e) => e.stopPropagation()}
													>
														<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
															<path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
														</svg>
														Watch
													</a>
												{/if}
											</div>
										{/if}
										{#if rec.description}
											<p class="text-sm text-text-muted {expandedCardId === rec.id ? '' : 'line-clamp-3'}">
												{rec.description}
											</p>
										{/if}
										{#if expandedCardId === rec.id && rec.metadata}
											<!-- Additional metadata shown when expanded -->
											{#if rec.metadata?.runtime}
												<p class="text-xs text-text-muted mt-2">Runtime: {rec.metadata.runtime} min</p>
											{/if}
											{#if rec.metadata?.rating}
												<p class="text-xs text-text-muted mt-1">Rating: {rec.metadata.rating}/10</p>
											{/if}
											{#if rec.metadata?.overview && rec.metadata.overview !== rec.description}
												<p class="text-sm text-text-muted mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
													{rec.metadata.overview}
												</p>
											{/if}
										{/if}
									</div>

									<div class="flex gap-1 sm:gap-2 flex-shrink-0 items-start flex-col sm:flex-row">
										<!-- Expand/Collapse indicator -->
										<button
											onclick={(e) => { e.stopPropagation(); toggleCardExpansion(rec.id); }}
											class="rounded-lg p-2 sm:p-1.5 text-text-muted hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
											title={expandedCardId === rec.id ? "Show less" : "Show more"}
										>
											<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" class="sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
												<polyline points="6 9 12 15 18 9" class="transition-transform {expandedCardId === rec.id ? 'rotate-180' : ''}"></polyline>
											</svg>
										</button>
										<button
											onclick={(e) => { e.stopPropagation(); startComplete(rec); }}
											class="rounded-lg p-2 sm:p-1.5 text-lg sm:text-sm text-primary hover:bg-primary/10 transition-colors"
											title="Mark as completed"
										>
											✓
										</button>
										<button
											onclick={(e) => { e.stopPropagation(); shareRecommendation(rec); }}
											class="rounded-lg p-2 sm:p-1.5 text-text-muted hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
											title="Share"
										>
											<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" class="sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
												<circle cx="18" cy="5" r="3"></circle>
												<circle cx="6" cy="12" r="3"></circle>
												<circle cx="18" cy="19" r="3"></circle>
												<line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
												<line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
											</svg>
										</button>
										<button
											onclick={(e) => { e.stopPropagation(); startEdit(rec); }}
											class="rounded-lg p-2 sm:p-1.5 text-lg sm:text-sm text-text-muted hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
											title="Edit"
										>
											✎
										</button>
										<button
											onclick={(e) => { e.stopPropagation(); deleteRecommendation(rec.id); }}
											class="rounded-lg p-2 sm:p-1.5 text-lg sm:text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
											title="Delete"
										>
											🗑
										</button>
									</div>
								</div>
							{/if}
						</Card>
					{/each}
				{/if}
			</div>
		{:else}
			<!-- Completed Recommendations -->
			<div class="space-y-4">
				{#if filteredCompletedRecs.length === 0}
					<div class="py-16 text-center">
						<div class="mb-4">
							<svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto text-text-muted opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
						</div>
						{#if completedRecs.length === 0}
							<h3 class="text-lg font-medium text-text dark:text-white mb-2">No completed items yet</h3>
							<p class="text-text-muted">Mark recommendations as completed to see them here.</p>
						{:else}
							<h3 class="text-lg font-medium text-text dark:text-white mb-2">No matches found</h3>
							<p class="text-text-muted">Try adjusting your search or filters.</p>
						{/if}
					</div>
				{:else}
					{#each filteredCompletedRecs as rec, index (rec.id)}
						<Card class="{selectedCardIndex === index ? 'card-selected ring-2 ring-primary' : ''} cursor-pointer hover:shadow-lg transition-shadow">
							<div
								role="button"
								tabindex="0"
								class="flex items-start gap-4"
								onclick={() => toggleCardExpansion(rec.id)}
								onkeydown={(e) => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault();
										toggleCardExpansion(rec.id);
									}
								}}
							>
								{#if rec.metadata?.poster_url || rec.metadata?.thumbnail_url}
									<img
										src={rec.metadata.poster_url || rec.metadata.thumbnail_url}
										alt={rec.title}
										class="h-32 w-24 rounded object-cover flex-shrink-0"
										loading="lazy"
										decoding="async"
									/>
								{/if}
								<div class="flex-1 min-w-0">
									<div class="mb-1 flex items-center gap-2 flex-wrap">
										<span class="rounded-full bg-primary/20 px-3 py-1 text-xs font-medium text-text">
											{formatCategory(rec.category)}
										</span>
										{#if rec.metadata?.year}
											<span class="text-xs text-text-muted">
												{rec.metadata.year}
											</span>
										{/if}
										{#if rec.completed_at}
											<span class="text-xs text-text-muted">
												· Completed {formatDate(rec.completed_at)}
											</span>
										{/if}
									</div>
									<h3 class="mb-1 text-lg font-semibold text-text dark:text-white">
										{rec.title}
									</h3>
									{#if rec.source}
										<div class="mb-2 text-xs text-text-muted flex items-center gap-1">
											<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
												<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
											</svg>
											Recommended by {rec.source}
										</div>
									{/if}
									{#if rec.rating}
										<div class="mb-2 flex gap-1 text-secondary">
											{#each Array(rec.rating) as _}
												<span>★</span>
											{/each}
										</div>
									{/if}
									{#if rec.metadata?.genres && rec.metadata.genres.length > 0}
										<div class="mb-2 flex gap-1 flex-wrap">
											{#each rec.metadata.genres.slice(0, 3) as genre}
												<span class="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
													{genre}
												</span>
											{/each}
										</div>
									{/if}
									{#if rec.metadata?.spotify_url || rec.metadata?.youtube_url || rec.category === 'restaurant'}
										<div class="mb-2 flex gap-2 items-center flex-wrap">
											{#if rec.metadata?.spotify_url}
												<a
													href={rec.metadata.spotify_url}
													target="_blank"
													rel="noopener noreferrer"
													class="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 hover:underline"
													onclick={(e) => e.stopPropagation()}
												>
													<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
														<path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
													</svg>
													Listen
												</a>
											{/if}
											{#if rec.metadata?.youtube_url}
												<a
													href={rec.metadata.youtube_url}
													target="_blank"
													rel="noopener noreferrer"
													class="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400 hover:underline"
													onclick={(e) => e.stopPropagation()}
												>
													<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
														<path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
													</svg>
													Watch
												</a>
											{/if}
											{#if rec.category === 'restaurant'}
												<a
													href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(rec.title)}`}
													target="_blank"
													rel="noopener noreferrer"
													class="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
													onclick={(e) => e.stopPropagation()}
												>
													<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
														<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
														<circle cx="12" cy="10" r="3"></circle>
													</svg>
													Search in Maps
												</a>
											{/if}
										</div>
									{/if}
									{#if rec.review}
										<p class="text-sm italic text-text-muted mb-2">"{rec.review}"</p>
									{/if}
									{#if rec.description}
										<p class="text-sm text-text-muted {expandedCardId === rec.id ? '' : 'line-clamp-3'}">
											{rec.description}
										</p>
									{/if}
									{#if expandedCardId === rec.id}
										<!-- Additional metadata shown when expanded -->
										{#if rec.metadata?.runtime}
											<p class="text-xs text-text-muted mt-2">Runtime: {rec.metadata.runtime} min</p>
										{/if}
										{#if rec.metadata?.rating}
											<p class="text-xs text-text-muted mt-1">Rating: {rec.metadata.rating}/10</p>
										{/if}
										{#if rec.metadata?.overview && rec.metadata.overview !== rec.description}
											<p class="text-sm text-text-muted mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
												{rec.metadata.overview}
											</p>
										{/if}
									{/if}
								</div>

								<div class="flex gap-1 sm:gap-2 flex-shrink-0 items-start flex-col sm:flex-row">
									<!-- Expand/Collapse indicator -->
									<button
										onclick={(e) => { e.stopPropagation(); toggleCardExpansion(rec.id); }}
										class="rounded-lg p-2 sm:p-1.5 text-text-muted hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
										title={expandedCardId === rec.id ? "Show less" : "Show more"}
									>
										<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" class="sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
											<polyline points="6 9 12 15 18 9" class="transition-transform {expandedCardId === rec.id ? 'rotate-180' : ''}"></polyline>
										</svg>
									</button>
									<button
										onclick={(e) => { e.stopPropagation(); shareRecommendation(rec); }}
										class="rounded-lg p-2 sm:p-1.5 text-text-muted hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
										title="Share"
									>
										<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" class="sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
											<circle cx="18" cy="5" r="3"></circle>
											<circle cx="6" cy="12" r="3"></circle>
											<circle cx="18" cy="19" r="3"></circle>
											<line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
											<line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
										</svg>
									</button>
									<button
										onclick={(e) => { e.stopPropagation(); uncompleteRecommendation(rec.id); }}
										class="rounded-lg p-2 sm:p-1.5 text-lg sm:text-sm text-text-muted hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
										title="Move back to active"
									>
										↶
									</button>
									<button
										onclick={(e) => { e.stopPropagation(); deleteRecommendation(rec.id); }}
										class="rounded-lg p-2 sm:p-1.5 text-lg sm:text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
										title="Delete"
									>
										🗑
									</button>
								</div>
							</div>
						</Card>
					{/each}
				{/if}
			</div>
		{/if}

		<!-- Keyboard Shortcuts Help -->
		{#if showKeyboardHelp}
			<div
				role="dialog"
				aria-modal="true"
				aria-labelledby="keyboard-shortcuts-title"
				class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
				onclick={() => (showKeyboardHelp = false)}
				onkeydown={(e) => {
					if (e.key === 'Escape') {
						showKeyboardHelp = false;
					}
				}}
			>
				<div
					role="document"
					class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-2xl w-full p-8 max-h-[80vh] overflow-y-auto"
					onclick={(e) => e.stopPropagation()}
					onkeydown={(e) => e.stopPropagation()}
				>
					<div class="flex items-center justify-between mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
						<h2 id="keyboard-shortcuts-title" class="text-2xl font-semibold text-text dark:text-white">Keyboard Shortcuts</h2>
						<button
							onclick={() => (showKeyboardHelp = false)}
							class="text-text-muted hover:text-text dark:hover:text-white transition-colors"
							aria-label="Close"
						>
							<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<line x1="18" y1="6" x2="6" y2="18"></line>
								<line x1="6" y1="6" x2="18" y2="18"></line>
							</svg>
						</button>
					</div>

					<div class="space-y-6">
						<div>
							<h3 class="text-lg font-semibold text-text dark:text-white mb-3">General</h3>
							<div class="space-y-2">
								<div class="flex justify-between items-center">
									<span class="text-text-muted">Show this help</span>
									<kbd class="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm font-mono">?</kbd>
								</div>
								<div class="flex justify-between items-center">
									<span class="text-text-muted">Close dialog/form</span>
									<kbd class="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm font-mono">Esc</kbd>
								</div>
								<div class="flex justify-between items-center">
									<span class="text-text-muted">Focus search</span>
									<kbd class="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm font-mono">/</kbd>
								</div>
								<div class="flex justify-between items-center">
									<span class="text-text-muted">Toggle active/completed</span>
									<kbd class="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm font-mono">T</kbd>
								</div>
							</div>
						</div>

						<div>
							<h3 class="text-lg font-semibold text-text dark:text-white mb-3">Recommendations</h3>
							<div class="space-y-2">
								<div class="flex justify-between items-center">
									<span class="text-text-muted">New recommendation</span>
									<kbd class="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm font-mono">N</kbd>
								</div>
								<div class="flex justify-between items-center">
									<span class="text-text-muted">Navigate down</span>
									<kbd class="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm font-mono">↓</kbd>
								</div>
								<div class="flex justify-between items-center">
									<span class="text-text-muted">Navigate up</span>
									<kbd class="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm font-mono">↑</kbd>
								</div>
								<div class="flex justify-between items-center">
									<span class="text-text-muted">Complete/uncomplete selected</span>
									<kbd class="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm font-mono">Enter</kbd>
								</div>
								<div class="flex justify-between items-center">
									<span class="text-text-muted">Edit selected</span>
									<kbd class="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm font-mono">E</kbd>
								</div>
								<div class="flex justify-between items-center">
									<span class="text-text-muted">Delete selected</span>
									<kbd class="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm font-mono">D</kbd>
								</div>
							</div>
						</div>

						<div>
							<h3 class="text-lg font-semibold text-text dark:text-white mb-3">Forms</h3>
							<div class="space-y-2">
								<div class="flex justify-between items-center">
									<span class="text-text-muted">Save form</span>
									<kbd class="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm font-mono">⌘S / Ctrl+S</kbd>
								</div>
								<div class="flex justify-between items-center">
									<span class="text-text-muted">Save from textarea</span>
									<kbd class="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm font-mono">⌘Enter / Ctrl+Enter</kbd>
								</div>
							</div>
						</div>
					</div>

					<div class="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 text-center">
						<p class="text-sm text-text-muted">
							Press <kbd class="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm font-mono">?</kbd> anytime to toggle this help
						</p>
					</div>
				</div>
			</div>
		{/if}
	</div>

	<!-- Toast Notifications -->
	<ToastContainer />

	<!-- Confirm Modal -->
	{#if confirmModal}
		<ConfirmModal
			title={confirmModal.title}
			message={confirmModal.message}
			confirmLabel="Delete"
			cancelLabel="Cancel"
			variant="danger"
			onConfirm={confirmModal.onConfirm}
			onCancel={() => (confirmModal = null)}
		/>
	{/if}

	<!-- PWA Install Prompt -->
	<InstallPrompt />

	<!-- Migration Prompt -->
	{#if showMigrationPrompt}
		<div
			role="dialog"
			aria-modal="true"
			aria-labelledby="migration-title"
			class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
		>
			<div
				role="document"
				class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6"
			>
				<h2 id="migration-title" class="text-xl font-semibold text-text dark:text-white mb-3">
					Save Your Recommendations?
				</h2>
				<p class="text-text-muted mb-6">
					You have {sessionRecommendations.length} recommendation{sessionRecommendations.length === 1 ? '' : 's'} from before you signed in. Would you like to save {sessionRecommendations.length === 1 ? 'it' : 'them'} to your account?
				</p>
				<div class="flex gap-3">
					<Button onclick={migrateSessionRecommendations} variant="primary" class="flex-1">
						Save to Account
					</Button>
					<Button variant="ghost" onclick={dismissMigrationPrompt}>
						Discard
					</Button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Footer -->
	<footer class="mt-20 pt-8 pb-8 border-t border-gray-200 dark:border-gray-700">
		<div class="max-w-4xl mx-auto px-4">
			<div class="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-text-muted">
				<div class="flex items-center gap-4">
					<a href="/about" class="hover:text-text dark:hover:text-white transition-colors">
						About
					</a>
					<span class="text-xs">·</span>
					<button
						onclick={() => showKeyboardHelp = true}
						class="hover:text-text dark:hover:text-white transition-colors"
					>
						Keyboard Shortcuts
					</button>
					<span class="text-xs">·</span>
					<button
						onclick={() => showSettingsMenu = true}
						class="hover:text-text dark:hover:text-white transition-colors"
					>
						Settings
					</button>
				</div>
				<div class="text-xs flex items-center gap-2">
					<span>Made with intentional chill</span>
					<span class="opacity-50">·</span>
					<span>Listo © 2025</span>
				</div>
			</div>
		</div>
	</footer>
</div>
