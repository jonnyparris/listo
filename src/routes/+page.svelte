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
	import KeyboardShortcutsModal from '$lib/components/KeyboardShortcutsModal.svelte';
	import MigrationPrompt from '$lib/components/MigrationPrompt.svelte';
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
	let showMobileSearch = $state(false);
	
	// Sort state
	type SortOption = 'date-added' | 'alphabetical' | 'category';
	let sortBy = $state<SortOption>('date-added');
	let sortAscending = $state(false);
	
	// Layout state
	type LayoutOption = 'normal' | 'compact' | 'grid';
	let layoutMode = $state<LayoutOption>('normal');
	
	// Scroll state for mobile header
	let isScrolled = $state(false);

	// Form state
	let formTitle = $state('');
	let formCategory = $state<Category>('series');
	let formDescription = $state('');
	let formSource = $state('');
	let formMetadata = $state<any>(undefined);
	let bulkMode = $state(false);
	let bulkTitles = $state('');

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
	
	// Mobile menu
	let showMobileMenu = $state(false);
	
	// Back to top button
	let showBackToTop = $state(false);

	// Sync state
	let syncing = $state(false);
	let lastSyncError = $state<string | null>(null);

	// AI state
	let aiSuggesting = $state(false);
	
	// Enrichment state
	let enrichmentLoading = $state(false);
	let previousCategory = $state<Category>(formCategory);

	// Category matches state
	let categoryMatches = $state<{ category: Category; count: number }[]>([]);
	
	// Category card collapsed state
	let categoriesCollapsed = $state(false);

	// Confirm modal state
	let confirmModal = $state<{
		show: boolean;
		title: string;
		message: string;
		confirmLabel?: string;
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

	// Duplicate detection - set of existing title+category combinations
	let existingRecommendations = $derived.by(() => {
		const existing = new Set<string>();
		[...recommendations, ...completedRecs].forEach(rec => {
			// Create a normalized key for duplicate detection
			const key = `${rec.title.toLowerCase().trim()}::${rec.category}`;
			existing.add(key);
		});
		return existing;
	});

	// Helper function to check if a recommendation already exists
	function isDuplicate(title: string, category: Category): boolean {
		const key = `${title.toLowerCase().trim()}::${category}`;
		return existingRecommendations.has(key);
	}

	const categories: Category[] = [
		'series',
		'movie',
		'youtube',
		'podcast',
		'artist',
		'song',
		'genre',
		'restaurant',
		'recipe',
		'activity',
		'video-game',
		'board-game',
		'book',
		'graphic-novel',
		'quote'
	];

	onMount(() => {
		// Scroll detection for mobile header and back to top
		const handleScroll = () => {
			isScrolled = window.scrollY > 100;
			showBackToTop = window.scrollY > 400;
		};
		
		window.addEventListener('scroll', handleScroll);
		
		async function setup() {
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

			// For authenticated users, sync with server to get latest data
			if (user.authenticated) {
				// Do an initial sync in the background to pull server data
				syncService.pullFromServer(userId).then(async (result) => {
					if (result.success) {
						// Reload recommendations to show server data
						await loadRecommendations();
					} else {
						console.warn('Initial sync failed:', result.error);
					}
				});
			}

			// Track if this session has recommendations (for future migration)
			if (!user.authenticated && recommendations.length > 0) {
				localStorage.setItem('had_session_recommendations', 'true');
				localStorage.setItem('previous_session_id', user.userId);
			}
		}

		setup().then(() => {
			// Periodic background sync for authenticated users (every 30 seconds)
			if (isAuthenticated) {
				const syncInterval = setInterval(async () => {
					if (isAuthenticated && !syncing) {
						const result = await syncService.fullSync(userId);
						if (result.success) {
							await loadRecommendations();
						}
					}
				}, 30000); // 30 seconds

				// Cleanup on unmount
				return () => {
					if (syncInterval) clearInterval(syncInterval);
				};
			}
		});

		// Handle browser back button for closing add form
		const handlePopState = (e: PopStateEvent) => {
			if (showAddForm && !e.state?.formOpen) {
				resetForm();
			}
		};
		window.addEventListener('popstate', handlePopState);

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
					closeAddForm();
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
				openAddForm();
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

		// Close settings/mobile menu when clicking outside
		const handleClickOutside = (e: MouseEvent) => {
			const target = e.target as HTMLElement;
			if (showSettingsMenu && !target.closest('.settings-menu-container')) {
				showSettingsMenu = false;
			}
			if (showMobileMenu && !target.closest('.mobile-menu-container')) {
				showMobileMenu = false;
			}
		};

		window.addEventListener('click', handleClickOutside);

		return () => {
			window.removeEventListener('keydown', handleKeydown);
			window.removeEventListener('click', handleClickOutside);
			window.removeEventListener('scroll', handleScroll);
			window.removeEventListener('popstate', handlePopState);
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

	// Auto-sync helper for authenticated users (non-blocking)
	async function autoSync() {
		if (isAuthenticated && !syncing) {
			syncService.syncToServer(userId).catch((error) => {
				console.warn('Auto-sync failed:', error);
			});
		}
	}

	async function migrateSessionRecommendations() {
		try {
			const previousSessionId = localStorage.getItem('previous_session_id');
			
			for (const rec of sessionRecommendations) {
				// Create a new recommendation with the current user's ID
				const migratedRec = { 
					...rec, 
					user_id: userId, 
					synced: false,
					// Generate new ID to avoid conflicts
					id: crypto.randomUUID()
				};
				await dbOperations.addRecommendation(migratedRec);
				
				// Delete the old session recommendation if it has a different user_id
				if (previousSessionId && rec.user_id === previousSessionId) {
					await dbOperations.deleteRecommendation(rec.id);
				}
			}

			localStorage.removeItem('had_session_recommendations');
			localStorage.removeItem('previous_session_id');

			await loadRecommendations();
			showMigrationPrompt = false;

			// Trigger sync to save to server (but don't let sync errors override migration success)
			if (isAuthenticated) {
				try {
					const result = await syncService.fullSync(userId);
					if (result.success) {
						toastStore.success(`Migrated and synced ${sessionRecommendations.length} recommendations`);
						await loadRecommendations(); // Reload to reflect synced state
					} else {
						// Migration succeeded but sync failed - show partial success message
						toastStore.warning(`Migrated ${sessionRecommendations.length} recommendations. Sync will retry automatically.`);
						console.warn('Migration succeeded but sync failed:', result.error);
					}
				} catch (syncError) {
					// Migration succeeded but sync threw error
					toastStore.warning(`Migrated ${sessionRecommendations.length} recommendations. Sync will retry automatically.`);
					console.warn('Migration succeeded but sync error:', syncError);
				}
			} else {
				toastStore.success(`Migrated ${sessionRecommendations.length} recommendations to your account`);
			}
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

	function scrollToTop() {
		window.scrollTo({ top: 0, behavior: 'smooth' });
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
		
		// Apply sorting
		applySorting();
	}
	
	function applySorting() {
		const sortFn = getSortFunction();
		filteredRecommendations.sort(sortFn);
		filteredCompletedRecs.sort(sortFn);
	}
	
	function getSortFunction() {
		const multiplier = sortAscending ? 1 : -1;
		
		switch (sortBy) {
			case 'alphabetical':
				return (a: LocalRecommendation, b: LocalRecommendation) => 
					multiplier * a.title.localeCompare(b.title);
			
			case 'category':
				return (a: LocalRecommendation, b: LocalRecommendation) => {
					const catCompare = multiplier * a.category.localeCompare(b.category);
					if (catCompare !== 0) return catCompare;
					return a.title.localeCompare(b.title);
				};
			
			case 'date-added':
			default:
				return (a: LocalRecommendation, b: LocalRecommendation) => 
					multiplier * (a.created_at - b.created_at);
		}
	}

	function handleSearch(query: string) {
		searchQuery = query;
		applyFilters();
	}

	function handleCategoryChange(category: Category | 'all') {
		// Toggle: if clicking the same category, clear the filter
		if (selectedCategory === category) {
			selectedCategory = 'all';
		} else {
			selectedCategory = category;
		}
		applyFilters();
	}

	/**
	 * Smart parsing of title input to extract hashtags for category selection
	 * Supports patterns like:
	 * - "#movie Inception" -> category: movie, title: "Inception"
	 * - "Dune #book" -> category: book, title: "Dune"
	 * - "#series Breaking Bad" -> category: series, title: "Breaking Bad"
	 */
	function parseSmartTitle(input: string): { title: string; category: Category | null } {
		// Category aliases map
		const categoryAliases: Record<string, Category> = {
			'movie': 'movie',
			'movies': 'movie',
			'film': 'movie',
			'series': 'series',
			'show': 'series',
			'tv': 'series',
			'youtube': 'youtube',
			'yt': 'youtube',
			'video': 'youtube',
			'podcast': 'podcast',
			'pod': 'podcast',
			'artist': 'artist',
			'musician': 'artist',
			'song': 'song',
			'track': 'song',
			'music': 'song',
			'genre': 'genre',
			'restaurant': 'restaurant',
			'resto': 'restaurant',
			'food': 'restaurant',
			'recipe': 'recipe',
			'activity': 'activity',
			'videogame': 'video-game',
			'game': 'video-game',
			'boardgame': 'board-game',
			'book': 'book',
			'graphicnovel': 'graphic-novel',
			'comic': 'graphic-novel',
			'quote': 'quote'
		};

		// Extract hashtags (supports #tag at start, middle, or end)
		const hashtagPattern = /#(\w+)/g;
		const hashtags = Array.from(input.matchAll(hashtagPattern), m => m[1].toLowerCase());

		// Try to find a matching category from hashtags
		let detectedCategory: Category | null = null;
		for (const tag of hashtags) {
			if (categoryAliases[tag]) {
				detectedCategory = categoryAliases[tag];
				break; // Use first matching hashtag
			}
		}

		// Remove all hashtags from the title
		const cleanTitle = input.replace(hashtagPattern, '').trim().replace(/\s+/g, ' ');

		return {
			title: cleanTitle,
			category: detectedCategory
		};
	}

	// Watch for title changes and auto-detect category
	$effect(() => {
		if (formTitle && formTitle.includes('#')) {
			const { title, category } = parseSmartTitle(formTitle);
			if (category && category !== formCategory) {
				// Update category and clean title
				formCategory = category;
				// Delay title update to avoid input cursor jumping
				setTimeout(() => {
					formTitle = title;
				}, 0);
			}
		}
	});

	async function saveRecommendation() {
		// Handle bulk mode
		if (bulkMode) {
			const titles = bulkTitles.split('\n').filter(t => t.trim());
			if (titles.length === 0) {
				toastStore.error('Please enter at least one title');
				return;
			}

			// Save all titles in the same category
			let count = 0;
			for (const title of titles) {
				const recommendation: LocalRecommendation = {
					id: crypto.randomUUID(),
					user_id: userId,
					category: formCategory,
					title: title.trim(),
					description: formDescription.trim() || undefined,
					source: formSource.trim() || undefined,
					created_at: Math.floor(Date.now() / 1000),
					updated_at: Math.floor(Date.now() / 1000),
					synced: false
				};
				await dbOperations.addRecommendation(recommendation);
				count++;
			}

			await loadRecommendations();
			toastStore.success(`Added ${count} recommendations`);
			resetForm();
			autoSync(); // Sync in background
			return;
		}

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
		autoSync(); // Sync in background
	}

	function startEdit(rec: LocalRecommendation) {
		editingId = rec.id;
		formTitle = rec.title;
		formCategory = rec.category;
		formDescription = rec.description || '';
		formSource = rec.source || '';
		formMetadata = rec.metadata;
		openAddForm();
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
				autoSync(); // Sync in background
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
		autoSync(); // Sync in background
	}

	async function uncompleteRecommendation(id: string) {
		await dbOperations.updateRecommendation(id, {
			completed_at: undefined,
			review: undefined,
			rating: undefined,
			synced: false
		});
		await loadRecommendations();
		autoSync(); // Sync in background
	}

	function openAddForm() {
		showAddForm = true;
		// Push a history state so mobile back button can close the form
		if (typeof window !== 'undefined') {
			window.history.pushState({ formOpen: true }, '');
		}
	}

	function closeAddForm() {
		resetForm();
		// If we pushed a history state, go back
		if (typeof window !== 'undefined' && window.history.state?.formOpen) {
			window.history.back();
		}
	}

	function resetForm() {
		formTitle = '';
		formDescription = '';
		formSource = '';
		formCategory = 'series';
		formMetadata = undefined;
		bulkMode = false;
		bulkTitles = '';
		showAddForm = false;
		editingId = null;
	}

	function formatCategory(cat: string): string {
		return cat
			.split('-')
			.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
			.join(' ');
	}

	function getCategoryIcon(cat: Category): string {
		const icons: Record<Category, string> = {
			'series': '📺',
			'movie': '🎬',
			'youtube': '📹',
			'podcast': '🎙️',
			'artist': '🎤',
			'song': '🎵',
			'genre': '🎶',
			'restaurant': '🍽️',
			'recipe': '👨‍🍳',
			'activity': '⚡',
			'video-game': '🎮',
			'board-game': '🎲',
			'book': '📚',
			'graphic-novel': '📖',
			'quote': '💭'
		};
		return icons[cat] || '📌';
	}

	function getCategoryColor(cat: Category): string {
		const colors: Record<Category, string> = {
			'series': 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700',
			'movie': 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700',
			'youtube': 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700',
			'podcast': 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-700',
			'artist': 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-700',
			'song': 'bg-fuchsia-100 dark:bg-fuchsia-900/30 text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-200 dark:border-fuchsia-700',
			'genre': 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-700',
			'restaurant': 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-700',
			'recipe': 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700',
			'activity': 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700',
			'video-game': 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-700',
			'board-game': 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-700',
			'book': 'bg-lime-100 dark:bg-lime-900/30 text-lime-700 dark:text-lime-300 border-lime-200 dark:border-lime-700',
			'graphic-novel': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700',
			'quote': 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-700'
		};
		return colors[cat] || 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700';
	}

	function formatDate(timestamp: number): string {
		return new Date(timestamp * 1000).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	async function handleEnrichmentSelect(suggestion: any) {
		formTitle = suggestion.title;
		formMetadata = suggestion.metadata;

		// Auto-fill description if available - don't override existing description
		if (!formDescription) {
			let rawDescription = '';
			if (suggestion.metadata?.overview) {
				rawDescription = suggestion.metadata.overview;
			} else if (suggestion.metadata?.description) {
				rawDescription = suggestion.metadata.description;
			} else if (suggestion.metadata?.artist || (suggestion.metadata?.genres && suggestion.metadata.genres.length > 0)) {
				// For songs and artists, build a rich description
				const parts = [];
				
				if (suggestion.metadata.artist) {
					parts.push(`Artist: ${suggestion.metadata.artist}`);
				}
				
				if (suggestion.subtitle && !suggestion.subtitle.includes(suggestion.metadata?.artist || '')) {
					parts.push(suggestion.subtitle);
				}
				
				if (suggestion.metadata.genres && suggestion.metadata.genres.length > 0) {
					parts.push(`Genres: ${suggestion.metadata.genres.join(', ')}`);
				}
				
				if (suggestion.metadata.year) {
					parts.push(`Year: ${suggestion.metadata.year}`);
				}
				
				if (parts.length > 0) {
					rawDescription = parts.join(' • ');
				}
			}

			if (rawDescription && rawDescription.length > 156) {
				try {
					const response = await fetch('/api/ai/condense-summary', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ text: rawDescription })
					});
					
					if (response.ok) {
						const { condensed } = await response.json();
						if (condensed && condensed.trim()) {
							formDescription = condensed;
						}
					}
				} catch (error) {
					console.error('Failed to condense description:', error);
				}
			} else if (rawDescription) {
				formDescription = rawDescription;
			}
		}

		// Ensure we have an image for the recommendation
		if (suggestion.thumbnail) {
			if (!formMetadata) {
				formMetadata = {};
			}
			if (!formMetadata.poster_url && !formMetadata.thumbnail_url && !formMetadata.cover_url && !formMetadata.album_art) {
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

		try {
			const result = await syncService.fullSync(userId);

			if (result.success) {
				// Reload recommendations to reflect synced state
				await loadRecommendations();
				toastStore.success('Synced successfully');
			} else {
				lastSyncError = result.error || 'Sync failed';
				toastStore.error(result.error || 'Sync failed');
			}
		} catch (error) {
			console.error('Sync error:', error);
			lastSyncError = error instanceof Error ? error.message : 'Sync failed';
			toastStore.error('Sync failed');
		} finally {
			syncing = false;
		}
	}

	async function shareRecommendation(rec: LocalRecommendation) {
		const shareText = formatShareText(rec);

		// Get image URL if available (includes album_art from Spotify)
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
						// Use our proxy endpoint to fetch the image and avoid CORS issues
						const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;
						const response = await fetch(proxyUrl);

						if (response.ok) {
							const blob = await response.blob();

							// Determine file extension from content type or default to jpg
							const contentType = response.headers.get('content-type') || 'image/jpeg';
							const ext = contentType.split('/')[1]?.split('+')[0] || 'jpg';
							const fileName = `${rec.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${ext}`;

							const file = new File([blob], fileName, { type: contentType });

							// Check if we can share files
							if (navigator.canShare({ files: [file] })) {
								shareData.files = [file];
							}
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
			await navigator.clipboard.writeText(shareText);
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

		// Add image
		const imageUrl = rec.metadata?.poster_url || rec.metadata?.thumbnail_url || rec.metadata?.cover_url || rec.metadata?.album_art;
		if (imageUrl) {
			text += `\n🖼️ Image: ${imageUrl}`;
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
		if (rec.category === 'restaurant' && !rec.metadata?.google_maps_link) {
			text += `\n📍 Search: https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(rec.title)}`;
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
	
	// Watch for category changes and trigger enrichment if title exists
	$effect(() => {
		if (formCategory !== previousCategory && formTitle.trim() && !editingId) {
			// Category changed and we have a title - try to enrich
			tryEnrichOnCategoryChange();
		}
		previousCategory = formCategory;
	});
	
	async function tryEnrichOnCategoryChange() {
		// Only enrich if the new category supports enrichment
		const enrichableCategories: Category[] = ['movie', 'series', 'book', 'graphic-novel', 'youtube', 'artist', 'song'];
		if (!enrichableCategories.includes(formCategory)) {
			return;
		}
		
		enrichmentLoading = true;
		try {
			const response = await fetch(`/api/enrichment/search?query=${encodeURIComponent(formTitle)}&category=${formCategory}`);
			
			if (response.ok) {
				const suggestions = await response.json();
				if (suggestions && suggestions.length > 0) {
					// Auto-select the top match if it's a close match
					const topMatch = suggestions[0];
					const titleSimilarity = formTitle.toLowerCase() === topMatch.title.toLowerCase();
					if (titleSimilarity) {
						handleEnrichmentSelect(topMatch);
						toastStore.success(`Auto-enriched from ${formatCategory(formCategory)}`);
					}
				}
			}
		} catch (error) {
			console.error('Auto-enrichment failed:', error);
			// Silent fail - don't interrupt user flow
		} finally {
			enrichmentLoading = false;
		}
	}

	// Note: Removed scroll effect as categories now wrap and are all visible

	// Sign out functionality
	async function handleSignOut() {
		confirmModal = {
			show: true,
			title: 'Sign Out',
			message: 'Are you sure you want to sign out? Your local data will remain on this device.',
			confirmLabel: 'Sign Out',
			onConfirm: async () => {
				const result = await authService.logout();
				if (result.success) {
					toastStore.success('Signed out successfully');
					// Reload the page to reset state
					window.location.reload();
				} else {
					toastStore.error(result.error || 'Failed to sign out');
				}
				confirmModal = null;
			}
		};
	}
</script>

<div class="min-h-screen bg-background-light dark:bg-background-dark">
	<!-- Mobile Sticky Header with Logo -->
	{#if isScrolled}
		<div class="md:hidden fixed top-0 left-0 right-0 z-50 bg-white dark:bg-surface-dark shadow-md border-b border-black/5 dark:border-white/5 px-4 py-3 flex items-center justify-between">
			<img
				src="/Listo_Logo.svg"
				alt="Listo"
				class="h-8"
			/>
			<div class="flex items-center gap-2">
				<ThemeToggle />
			</div>
		</div>
	{/if}
	
	<div class="mx-auto max-w-4xl px-4 py-8 pb-20 {isScrolled ? 'pt-20 md:pt-8' : ''}">
		<!-- Theme Toggle, Sync, Help, Settings, and Auth (top right) -->
		<div class="sticky top-0 z-40 bg-background-light dark:bg-background-dark py-4 mb-4 md:static md:py-0 md:mb-0">
			<div class="flex items-center justify-end gap-2">
				<!-- Desktop: show all controls -->
				<div class="hidden md:flex items-center gap-2">
					<button
						onclick={() => (showKeyboardHelp = true)}
						class="p-3 rounded-lg text-text-muted hover:text-text dark:hover:text-white hover:bg-primary/5 dark:hover:bg-primary/5 transition-colors flex items-center justify-center min-h-[44px] min-w-[44px]"
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
						class="p-3 rounded-lg text-text-muted hover:text-text dark:hover:text-white hover:bg-primary/5 dark:hover:bg-primary/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-h-[44px] min-w-[44px]"
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

					<!-- Desktop Settings Menu -->
					<div class="relative settings-menu-container">
						<button
							onclick={() => (showSettingsMenu = !showSettingsMenu)}
							class="p-3 rounded-lg text-text-muted hover:text-text dark:hover:text-white hover:bg-primary/5 dark:hover:bg-primary/5 transition-colors flex items-center justify-center min-h-[44px] min-w-[44px]"
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
								class="absolute right-0 mt-2 w-56 bg-white dark:bg-surface-dark rounded-xl shadow-lg border border-black/5 dark:border-white/5 py-2 z-50"
								onclick={(e) => e.stopPropagation()}
								onkeydown={(e) => {
									if (e.key === 'Escape') {
										showSettingsMenu = false;
									}
								}}
							>
								{#if isAuthenticated}
									<div class="px-4 py-2 text-xs text-text-muted border-b border-black/5 dark:border-white/5">
										Signed in
									</div>
									<button
										onclick={() => {
											handleSignOut();
											showSettingsMenu = false;
										}}
										class="w-full text-left px-4 py-2 text-sm text-text dark:text-white hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors"
									>
										Sign Out
									</button>
									<div class="border-t border-black/5 dark:border-white/5 my-2"></div>
								{/if}
								<button
									onclick={() => {
										goto('/about');
										showSettingsMenu = false;
									}}
									class="w-full text-left px-4 py-2 text-sm text-text dark:text-white hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors"
								>
									About Listo
								</button>
								<div class="border-t border-black/5 dark:border-white/5 my-2"></div>
								<div class="px-4 py-2">
									<div class="text-xs font-semibold text-text dark:text-white mb-1">Data Management</div>
									<div class="text-xs text-text-muted mb-3">Backup your recommendations or migrate between devices</div>
									<button
										onclick={() => {
											handleExport();
											showSettingsMenu = false;
										}}
										class="w-full text-left px-4 py-2 text-sm text-text dark:text-white hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors rounded-lg mb-1"
									>
										Export Data
										<div class="text-xs text-text-muted mt-0.5">Download all your recommendations as JSON</div>
									</button>
									<button
										onclick={() => {
											handleImport();
											showSettingsMenu = false;
										}}
										class="w-full text-left px-4 py-2 text-sm text-text dark:text-white hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors rounded-lg"
									>
										Import Data
										<div class="text-xs text-text-muted mt-0.5">Restore from a previous export file</div>
									</button>
								</div>
								<div class="border-t border-black/5 dark:border-white/5 my-2"></div>
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

				<!-- Mobile: hamburger menu -->
				<div class="md:hidden flex items-center gap-2">
					<ThemeToggle />
					<div class="relative mobile-menu-container">
						<button
							onclick={() => (showMobileMenu = !showMobileMenu)}
							class="p-3 rounded-lg text-text-muted hover:text-text dark:hover:text-white hover:bg-primary/5 dark:hover:bg-primary/5 transition-colors flex items-center justify-center min-h-[44px] min-w-[44px]"
							title="Menu"
						>
							<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<line x1="3" y1="12" x2="21" y2="12"></line>
								<line x1="3" y1="6" x2="21" y2="6"></line>
								<line x1="3" y1="18" x2="21" y2="18"></line>
							</svg>
						</button>

						{#if showMobileMenu}
							<div
								role="menu"
								tabindex="-1"
								class="absolute right-0 mt-2 w-64 bg-white dark:bg-surface-dark rounded-xl shadow-lg border border-black/5 dark:border-white/5 py-2 z-50"
								onclick={(e) => e.stopPropagation()}
							>
								{#if isAuthenticated}
									<div class="px-4 py-2 text-xs text-text-muted border-b border-black/5 dark:border-white/5">
										Signed in
									</div>
									<button
										onclick={() => {
											handleSync();
											showMobileMenu = false;
										}}
										disabled={syncing}
										class="w-full text-left px-4 py-3 text-sm text-text dark:text-white hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors flex items-center gap-3 disabled:opacity-50"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											width="18"
											height="18"
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
										{syncing ? 'Syncing...' : 'Sync'}
									</button>
									<button
										onclick={() => {
											handleSignOut();
											showMobileMenu = false;
										}}
										class="w-full text-left px-4 py-3 text-sm text-text dark:text-white hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors"
									>
										Sign Out
									</button>
									<div class="border-t border-black/5 dark:border-white/5 my-2"></div>
								{:else}
									<button
										onclick={() => {
											goto('/auth');
											showMobileMenu = false;
										}}
										class="w-full text-left px-4 py-3 text-sm font-medium text-primary hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors"
									>
										Sign In
									</button>
									<div class="border-t border-black/5 dark:border-white/5 my-2"></div>
								{/if}
								
								<button
									onclick={() => {
										goto('/about');
										showMobileMenu = false;
									}}
									class="w-full text-left px-4 py-3 text-sm text-text dark:text-white hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors"
								>
									About Listo
								</button>
								
								<div class="border-t border-black/5 dark:border-white/5 my-2"></div>
								
								<div class="px-4 py-2">
									<div class="text-xs font-semibold text-text dark:text-white mb-2">Data Management</div>
									<button
										onclick={() => {
											handleExport();
											showMobileMenu = false;
										}}
										class="w-full text-left px-4 py-2 text-sm text-text dark:text-white hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors rounded-lg mb-1"
									>
										Export Data
									</button>
									<button
										onclick={() => {
											handleImport();
											showMobileMenu = false;
										}}
										class="w-full text-left px-4 py-2 text-sm text-text dark:text-white hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors rounded-lg"
									>
										Import Data
									</button>
								</div>
								
								<div class="border-t border-black/5 dark:border-white/5 my-2"></div>
								
								<button
									onclick={() => {
										handlePurgeAll();
										showMobileMenu = false;
									}}
									class="w-full text-left px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
								>
									Purge All Data
								</button>
							</div>
						{/if}
					</div>
				</div>
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
		<header class="mb-4 text-center flex justify-center">
			<a href="/" class="hover:opacity-80 transition-opacity">
					<img
						src="/Listo_Logo_IntentionalChill.svg"
						alt="Listo - intentional chill"
						class="w-full max-w-[200px] sm:max-w-[260px] md:max-w-[300px] h-auto text-text dark:text-white"
					/>

			</a>
		</header>

		<!-- Category Filters with Active/Completed Toggle -->
		{#if recommendations.length > 0 || completedRecs.length > 0}
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
				<div class="mb-6">
					<!-- Header with Active/Completed Toggle -->
					<div class="flex items-center justify-between mb-3 px-1 flex-wrap gap-3">
						<h3 class="text-sm font-semibold text-text dark:text-white">By Category</h3>
						<div class="flex gap-2">
							<button
								onclick={() => (showCompleted = false)}
								class="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors {!showCompleted ? 'bg-primary/20 text-text dark:text-white font-medium' : 'text-text-muted hover:bg-primary/5 dark:hover:bg-primary/5'}"
								title="Active recommendations"
							>
								<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
									<path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
								</svg>
								<span class="hidden sm:inline">Active</span>
								<span class="opacity-75">({recommendations.length})</span>
							</button>
							<button
								onclick={() => (showCompleted = true)}
								class="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors {showCompleted ? 'bg-primary/20 text-text dark:text-white font-medium' : 'text-text-muted hover:bg-primary/5 dark:hover:bg-primary/5'}"
								title="Completed recommendations"
							>
								<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
									<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
									<polyline points="22 4 12 14.01 9 11.01"></polyline>
								</svg>
								<span class="hidden sm:inline">Completed</span>
								<span class="opacity-75">({completedRecs.length})</span>
							</button>
						</div>
					</div>
					<div class="flex flex-wrap gap-2">
						{#each categoryCounts as { category, active, completed, total }}
							{@const isSelected = selectedCategory === category}
							<button
								onclick={() => handleCategoryChange(category as Category)}
								class="
									{getCategoryColor(category as Category)}
									border rounded-full
									transition-all duration-300 ease-out
									hover:scale-105 hover:shadow-md
									{isSelected ? 'px-4 py-2 text-sm font-semibold shadow-md' : 'px-3 py-1.5 text-xs font-medium opacity-70 hover:opacity-100'}
								"
							>
								<span class="mr-1.5">{getCategoryIcon(category as Category)}</span>
								<span>{formatCategory(category)}</span>
								{#if isSelected}
									<span class="ml-2 opacity-75">{total} total · {active} active</span>
								{/if}
							</button>
						{/each}
					</div>
				</div>
			{/if}
		{/if}

		<!-- Search and Filter -->
		<div class="mb-8 space-y-4">
			<!-- Mobile: Show search icon button or search input -->
			<div class="md:hidden">
				{#if showMobileSearch}
					<div class="flex gap-2 items-center">
						<div class="flex-1">
							<SearchBar
								bind:value={searchQuery}
								bind:selectedCategory={selectedCategory}
								onSearch={handleSearch}
								onCategoryChange={handleCategoryChange}
								placeholder={showCompleted ? 'Search completed items...' : 'Search recommendations...'}
								autofocus={true}
								showCategoryFilter={false}
								onBlur={() => {
									// Close search if empty when losing focus
									setTimeout(() => {
										if (!searchQuery.trim()) {
											showMobileSearch = false;
										}
									}, 150);
								}}
							/>
						</div>
						{#if searchQuery.trim()}
							<button
								onclick={() => {
									searchQuery = '';
									handleSearch('');
									showMobileSearch = false;
								}}
								class="p-3 rounded-xl bg-surface-light dark:bg-surface-dark text-text-muted hover:text-text dark:hover:text-white transition-colors flex-shrink-0"
								title="Clear search"
							>
								<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
									<line x1="18" y1="6" x2="6" y2="18"></line>
									<line x1="6" y1="6" x2="18" y2="18"></line>
								</svg>
							</button>
						{/if}
					</div>
				{:else}
					<button
						onclick={() => showMobileSearch = true}
						class="flex items-center justify-center p-2.5 bg-surface-light dark:bg-surface-dark rounded-xl text-text-muted hover:text-text dark:hover:text-white transition-colors"
						title="Search"
						aria-label="Open search"
					>
						<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<circle cx="11" cy="11" r="8"></circle>
							<path d="m21 21-4.35-4.35"></path>
						</svg>
					</button>
				{/if}
			</div>

			<!-- Desktop: Show full search bar -->
			<div class="hidden md:block">
				<SearchBar
					bind:value={searchQuery}
					bind:selectedCategory={selectedCategory}
					onSearch={handleSearch}
					onCategoryChange={handleCategoryChange}
					placeholder={showCompleted ? 'Search completed items...' : 'Search recommendations...'}
				/>
			</div>
			
			<!-- Sort and Layout Controls -->
			<div class="flex items-center justify-between gap-4 text-sm">
				<div class="flex items-center gap-2">
					<span class="text-text-muted hidden sm:inline">Layout:</span>
					<div class="flex gap-1 bg-surface-light dark:bg-surface-dark rounded-lg p-1">
						<button
							onclick={() => layoutMode = 'compact'}
							class="p-1.5 rounded {layoutMode === 'compact' ? 'bg-primary/20 text-primary' : 'text-text-muted hover:text-text dark:hover:text-white'} transition-colors"
							title="Compact list"
						>
							<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<line x1="8" y1="6" x2="21" y2="6"></line>
								<line x1="8" y1="12" x2="21" y2="12"></line>
								<line x1="8" y1="18" x2="21" y2="18"></line>
								<line x1="3" y1="6" x2="3.01" y2="6"></line>
								<line x1="3" y1="12" x2="3.01" y2="12"></line>
								<line x1="3" y1="18" x2="3.01" y2="18"></line>
							</svg>
						</button>
						<button
							onclick={() => layoutMode = 'normal'}
							class="p-1.5 rounded {layoutMode === 'normal' ? 'bg-primary/20 text-primary' : 'text-text-muted hover:text-text dark:hover:text-white'} transition-colors"
							title="Normal view"
						>
							<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<line x1="8" y1="6" x2="21" y2="6"></line>
								<line x1="8" y1="12" x2="21" y2="12"></line>
								<line x1="8" y1="18" x2="21" y2="18"></line>
								<rect x="3" y="4" width="3" height="4"></rect>
								<rect x="3" y="10" width="3" height="4"></rect>
								<rect x="3" y="16" width="3" height="4"></rect>
							</svg>
						</button>
						<button
							onclick={() => layoutMode = 'grid'}
							class="p-1.5 rounded {layoutMode === 'grid' ? 'bg-primary/20 text-primary' : 'text-text-muted hover:text-text dark:hover:text-white'} transition-colors"
							title="Grid view"
						>
							<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<rect x="3" y="3" width="7" height="7"></rect>
								<rect x="14" y="3" width="7" height="7"></rect>
								<rect x="14" y="14" width="7" height="7"></rect>
								<rect x="3" y="14" width="7" height="7"></rect>
							</svg>
						</button>
					</div>
				</div>
				
				<div class="flex items-center gap-2">
					<span class="text-text-muted hidden sm:inline">Sort:</span>
					<select
						bind:value={sortBy}
						onchange={() => applyFilters()}
						class="px-3 py-1.5 rounded-lg bg-surface-light dark:bg-surface-dark text-text dark:text-white border border-black/5 dark:border-white/5 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
					>
						<option value="date-added">Date Added</option>
						<option value="alphabetical">A-Z</option>
						<option value="category">Category</option>
					</select>
					<button
						onclick={() => { sortAscending = !sortAscending; applyFilters(); }}
						class="p-1.5 rounded-lg text-text-muted hover:text-text dark:hover:text-white hover:bg-primary/5 dark:hover:bg-primary/5 transition-colors"
						title={sortAscending ? 'Ascending' : 'Descending'}
					>
						<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="transition-transform {sortAscending ? '' : 'rotate-180'}">
							<path d="M12 5v14M19 12l-7 7-7-7"/>
						</svg>
					</button>
				</div>
			</div>
		</div>

		<!-- Floating Action Button -->
		{#if !showCompleted && !showAddForm}
			<button
				onclick={() => {
					openAddForm();
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

		<!-- Back to Top Button -->
		{#if showBackToTop}
			<button
				onclick={scrollToTop}
				class="fixed bottom-8 left-8 h-12 w-12 rounded-full bg-surface-light dark:bg-surface-dark shadow-lg hover:shadow-xl transition-all hover:scale-110 flex items-center justify-center z-50 border border-black/5 dark:border-white/5"
				aria-label="Back to top"
				title="Back to top"
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-text dark:text-white">
					<path d="M12 19V5M5 12l7-7 7 7"/>
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
					<div class="sticky top-0 z-50 bg-white dark:bg-surface-dark border-b border-black/5 dark:border-white/5 px-4 py-4 sm:px-6">
						<div class="flex items-center justify-between max-w-2xl mx-auto">
							<div class="flex items-center gap-3">
								<h2 class="text-xl sm:text-2xl font-semibold text-text dark:text-white">
									{editingId ? 'Edit Recommendation' : bulkMode ? 'Add Multiple' : 'Add Recommendation'}
								</h2>
								{#if !editingId}
									<button
										type="button"
										onclick={() => bulkMode = !bulkMode}
										class="text-xs px-3 py-1.5 rounded-lg bg-primary/20 text-primary font-semibold hover:bg-primary/30 transition-colors flex items-center gap-1 shadow-sm"
										title="Toggle bulk add mode"
									>
										{bulkMode ? 'Single' : 'Bulk'}
									</button>
								{/if}
							</div>
							<button
								onclick={() => resetForm()}
								class="p-3 text-text-muted hover:text-text dark:hover:text-white transition-colors rounded-lg hover:bg-primary/5 dark:hover:bg-primary/10 min-h-[44px] min-w-[44px] flex items-center justify-center"
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
					<div class="flex-1 px-4 py-6 sm:px-6 pb-32">
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
												class="text-xs px-2.5 py-1.5 rounded-lg bg-primary/20 text-primary font-semibold hover:bg-primary/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 shadow-sm"
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
										<div class="relative z-10">
											<div class="flex flex-wrap gap-2 justify-center">
												{#each categories as cat}
													<button
														type="button"
														data-category={cat}
														onclick={() => formCategory = cat}
														class="rounded-full font-semibold transition-all duration-300 ease-out {formCategory === cat ? 'bg-primary text-white shadow-lg scale-110 ring-2 ring-primary/30 px-6 py-3 text-base' : 'bg-surface-light dark:bg-surface-dark text-text dark:text-white hover:bg-primary/10 dark:hover:bg-primary/10 scale-75 px-3 py-1.5 text-xs opacity-70 hover:opacity-100'}"
													>
														{formatCategory(cat)}
													</button>
												{/each}
											</div>
										</div>
									</div>

									<div>
										{#if bulkMode}
											<label for="bulk-titles" class="mb-2 block text-sm font-medium text-text dark:text-white">
												Titles (one per line)
											</label>
											<textarea
												id="bulk-titles"
												bind:value={bulkTitles}
												placeholder="Enter multiple titles, one per line...&#10;Example:&#10;The Matrix&#10;Inception&#10;Interstellar"
												class="w-full rounded-xl border border-black/5 dark:border-white/5 bg-background-light dark:bg-gray-800 px-4 py-3 text-text dark:text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary resize-none text-base"
												rows="10"
											></textarea>
											<p class="mt-1 text-xs text-text-muted">
												Enter one title per line. They'll all be saved in the {formatCategory(formCategory)} category.
											</p>
										{:else}
											<div class="relative">
												<label for="title" class="mb-2 block text-sm font-medium text-text dark:text-white">
													Title
													{#if enrichmentLoading}
														<span class="ml-2 inline-flex items-center gap-1 text-xs text-primary">
															<svg class="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
																<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
																<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
															</svg>
															Loading...
														</span>
													{/if}
												</label>
											{#if formCategory === 'movie' || formCategory === 'series'}
												<TMDBAutocomplete
													bind:value={formTitle}
													category={formCategory}
													onSelect={handleEnrichmentSelect}
													placeholder={`Search for a ${formCategory}...`}
													autofocus={true}
													isDuplicate={isDuplicate}
													onkeydown={(e) => {
														if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
															e.preventDefault();
															saveRecommendation();
														}
													}}
														/>
											{:else if formCategory === 'book' || formCategory === 'graphic-novel' || formCategory === 'youtube' || formCategory === 'artist' || formCategory === 'song'}
												<EnrichmentAutocomplete
													bind:value={formTitle}
													category={formCategory}
													onSelect={handleEnrichmentSelect}
													placeholder={`Search for a ${formatCategory(formCategory).toLowerCase()}...`}
													autofocus={true}
													isDuplicate={isDuplicate}
													onkeydown={(e) => {
														if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
															e.preventDefault();
															saveRecommendation();
														}
													}}
														/>
											{:else}
												<Input 
													id="title" 
													bind:value={formTitle} 
													placeholder="Enter title..." 
													autofocus={true}
													onkeydown={(e) => {
														if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
															e.preventDefault();
															saveRecommendation();
														}
													}}
												/>
											{/if}
											</div>
										{/if}

										<!-- Category matches subtotal -->
										{#if categoryMatches.length > 0}
											<div class="mt-2 text-xs text-text-muted flex items-center gap-1 flex-wrap">
												<span>Also found in:</span>
												{#each categoryMatches as match, i}
													<button
														type="button"
														onclick={() => formCategory = match.category}
														class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-light dark:bg-surface-dark hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors"
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
											onkeydown={(e) => {
												if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
													e.preventDefault();
													saveRecommendation();
												}
											}}
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
										<div class="flex items-center justify-between mb-2">
											<label
												for="description"
												class="block text-sm font-medium text-text dark:text-white"
											>
												Notes (optional)
											</label>
											{#if formDescription.trim()}
												<button
													type="button"
													onclick={() => formDescription = ''}
													class="text-xs text-text-muted hover:text-text dark:hover:text-white transition-colors"
													title="Clear notes"
												>
													Clear
												</button>
											{/if}
										</div>
										<textarea
											id="description"
											bind:value={formDescription}
											placeholder="Add some notes..."
											class="w-full rounded-xl border border-black/5 dark:border-white/5 bg-background-light dark:bg-gray-800 px-4 py-3 text-text dark:text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary resize-none text-base"
											rows="6"
											onfocus={(e) => {
												setTimeout(() => {
													(e.target as HTMLTextAreaElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
												}, 300);
											}}
											onkeydown={(e) => {
												if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
													e.preventDefault();
													saveRecommendation();
												}
											}}
										></textarea>
									</div>

									{#if formMetadata && (formMetadata.poster_url || formMetadata.thumbnail_url || formMetadata.cover_url || formMetadata.album_art || formMetadata.year || formMetadata.genres || formMetadata.rating || formMetadata.artist)}
										<div class="p-4 rounded-xl bg-surface-light dark:bg-surface-dark border border-black/5 dark:border-white/5">
											<div class="text-sm font-medium text-text dark:text-white mb-3">Preview</div>
											<div class="flex gap-4">
												{#if formMetadata.poster_url || formMetadata.thumbnail_url || formMetadata.cover_url || formMetadata.album_art}
													<img
														src={formMetadata.poster_url || formMetadata.thumbnail_url || formMetadata.cover_url || formMetadata.album_art}
														alt="Preview"
														class="h-32 w-24 rounded object-cover flex-shrink-0"
													/>
												{/if}
												<div class="flex-1 text-sm space-y-2">
													{#if formMetadata.artist}
														<div class="text-text dark:text-white">
															<span class="text-text-muted">Artist:</span> {formMetadata.artist}
														</div>
													{/if}
													{#if formMetadata.year}
														<div class="text-text dark:text-white">
															<span class="text-text-muted">Year:</span> {formMetadata.year}
														</div>
													{/if}
													{#if formMetadata.rating}
														<div class="text-text dark:text-white">
															<span class="text-text-muted">Rating:</span> {formMetadata.rating}/100
														</div>
													{/if}
													{#if formMetadata.genres && formMetadata.genres.length > 0}
														<div class="text-text dark:text-white">
															<span class="text-text-muted">Genres:</span>
															<div class="flex gap-1 flex-wrap mt-1">
																{#each formMetadata.genres.slice(0, 5) as genre}
																	<span class="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
																		{genre}
																	</span>
																{/each}
															</div>
														</div>
													{/if}
													{#if formMetadata.runtime}
														<div class="text-text dark:text-white">
															<span class="text-text-muted">Runtime:</span> {formMetadata.runtime} min
														</div>
													{/if}
												</div>
											</div>
										</div>
									{/if}
								</div>
							</form>
						</div>
					</div>

					<!-- Footer with Save Button -->
					<div class="sticky bottom-0 bg-white dark:bg-surface-dark border-t border-black/5 dark:border-white/5 px-4 py-4 sm:px-6 safe-area-inset-bottom">
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
			<div class="{layoutMode === 'grid' ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4' : 'space-y-4'}">
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
									openAddForm();
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
						<Card class="{layoutMode === 'grid' ? 'hover:shadow-lg' : 'hover:scale-[1.01]'} transition-all {selectedCardIndex === index ? 'card-selected ring-2 ring-primary' : ''} {layoutMode === 'compact' ? '!p-3' : ''}">
							{#if completingId === rec.id}
								<!-- Complete Form -->
								<div class="space-y-4">
									<div class="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-3">
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
											class="w-full rounded-xl border border-black/5 dark:border-white/5 bg-background-light dark:bg-gray-800 px-4 py-3 text-text dark:text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
											rows="3"
											onfocus={(e) => {
												setTimeout(() => {
													(e.target as HTMLTextAreaElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
												}, 300);
											}}
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
									class="flex items-start gap-4 cursor-pointer {layoutMode === 'grid' ? 'flex-col' : ''} {layoutMode === 'compact' ? 'gap-3' : ''}"
									onclick={() => toggleCardExpansion(rec.id)}
									onkeydown={(e) => {
										if (e.key === 'Enter' || e.key === ' ') {
											e.preventDefault();
											toggleCardExpansion(rec.id);
										}
									}}
								>
									{#if layoutMode === 'grid' && expandedCardId !== rec.id}
										<!-- Grid collapsed view: only image/placeholder -->
										{#if rec.metadata?.poster_url || rec.metadata?.thumbnail_url || rec.metadata?.album_art}
											<img
												src={rec.metadata.poster_url || rec.metadata.thumbnail_url || rec.metadata.album_art}
												alt={rec.title}
												class="w-full h-48 rounded object-cover flex-shrink-0"
												loading="lazy"
												decoding="async"
											/>
										{:else}
											<!-- Placeholder for grid mode without image -->
											<div class="w-full h-48 rounded bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
												<div class="text-center p-4">
													<span class="text-4xl mb-2 block opacity-60">
														{getCategoryIcon(rec.category)}
													</span>
													<h3 class="text-sm font-semibold text-text dark:text-white line-clamp-2">
														{rec.title}
													</h3>
												</div>
											</div>
										{/if}
									{:else if layoutMode === 'compact' && expandedCardId !== rec.id}
										<!-- Compact collapsed view: only icon and title -->
										<div class="flex items-center gap-2 flex-1">
											<span class="rounded-full bg-primary/20 px-2 py-1 text-sm flex-shrink-0" title={formatCategory(rec.category)}>
												{getCategoryIcon(rec.category)}
											</span>
											<h3 class="text-sm font-semibold text-text dark:text-white truncate">
												{rec.title}
											</h3>
										</div>
									{:else}
										<!-- Full card view (grid expanded, normal, or compact+expanded) -->
										{#if rec.metadata?.poster_url || rec.metadata?.thumbnail_url || rec.metadata?.album_art}
											<img
												src={rec.metadata.poster_url || rec.metadata.thumbnail_url || rec.metadata.album_art}
												alt={rec.title}
												class="{layoutMode === 'grid' ? 'w-full h-48' : layoutMode === 'compact' ? 'h-16 w-12' : 'h-32 w-24'} rounded object-cover flex-shrink-0"
												loading="lazy"
												decoding="async"
											/>
										{/if}
										<div class="flex-1 min-w-0 {layoutMode === 'grid' ? 'w-full' : ''}">
											<div class="mb-1 flex items-center gap-2 flex-wrap">
												<span class="rounded-full bg-primary/20 px-2 py-1 text-sm" title={formatCategory(rec.category)}>
													{getCategoryIcon(rec.category)}
												</span>
												{#if rec.metadata?.year}
													<span class="text-xs text-text-muted">
														{rec.metadata.year}
													</span>
												{/if}
											</div>
											<h3 class="mb-1 text-lg font-semibold text-text dark:text-white">
												{rec.title}
											</h3>
										{#if rec.source && layoutMode !== 'compact'}
											<div class="mb-2 text-xs text-text-muted flex items-center gap-1">
												<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
													<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
												</svg>
												Recommended by {rec.source}
											</div>
										{/if}
										{#if rec.metadata?.genres && rec.metadata.genres.length > 0 && layoutMode !== 'compact'}
											<div class="mb-2 flex gap-1 flex-wrap">
												{#each rec.metadata.genres.slice(0, 3) as genre}
													<span class="text-xs bg-surface-light dark:bg-surface-dark px-2 py-1 rounded">
														{genre}
													</span>
												{/each}
											</div>
										{/if}
									{#if (rec.metadata?.spotify_url || rec.metadata?.youtube_url || rec.category === 'restaurant') && layoutMode !== 'compact'}
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
								{#if rec.description && (layoutMode !== 'compact' || expandedCardId === rec.id)}
											<p class="text-sm text-text-muted {expandedCardId === rec.id ? '' : layoutMode === 'compact' ? 'line-clamp-1' : 'line-clamp-3'}">
												{rec.description}
											</p>
										{/if}
										{#if expandedCardId === rec.id && rec.metadata}
											<!-- Additional metadata shown when expanded -->
											{#if rec.metadata?.runtime}
												<p class="text-xs text-text-muted mt-2">Runtime: {rec.metadata.runtime} min</p>
											{/if}
						<div class="flex gap-3 mt-2 text-xs flex-wrap">
							{#if (rec.category === 'movie' || rec.category === 'series') && (rec.metadata as any)?.imdb_rating}
								<span class="text-text-muted">TMDB: {(rec.metadata as any).imdb_rating.toFixed(1)}/10</span>
							{/if}
							{#if (rec.category === 'movie' || rec.category === 'series') && ((rec.metadata as any)?.rt_score || (rec.metadata as any)?.rt_critic_score)}
								<span class="text-text-muted" title="Rotten Tomatoes Tomatometer">🍅 {((rec.metadata as any)?.rt_critic_score || (rec.metadata as any)?.rt_score)}%</span>
							{/if}
							{#if (rec.category === 'movie' || rec.category === 'series') && (rec.metadata as any)?.rt_audience_score}
								<span class="text-text-muted" title="Rotten Tomatoes Audience Score">🍿 {(rec.metadata as any).rt_audience_score}%</span>
							{/if}
						</div>
						{#if rec.category === 'movie' || rec.category === 'series'}
							<div class="flex gap-3 mt-2">
								{#if (rec.metadata as any)?.tmdb_id}
									<a
										href="https://www.themoviedb.org/{rec.category === 'movie' ? 'movie' : 'tv'}/{(rec.metadata as any).tmdb_id}"
										target="_blank"
										rel="noopener noreferrer"
										class="text-xs text-primary hover:underline"
										onclick={(e) => e.stopPropagation()}
									>
										View on TMDB →
									</a>
								{/if}
								<a
									href={`https://www.rottentomatoes.com/search?search=${encodeURIComponent(rec.title)}`}
									target="_blank"
									rel="noopener noreferrer"
									class="text-xs text-primary hover:underline"
									onclick={(e) => e.stopPropagation()}
								>
									Search on Rotten Tomatoes →
								</a>
							</div>
						{/if}
											{#if rec.metadata?.overview && rec.metadata.overview !== rec.description}
												<p class="text-sm text-text-muted mt-2 pt-2 border-t border-black/5 dark:border-white/5">
													{rec.metadata.overview}
												</p>
											{/if}
										{/if}
									</div>

									<div class="flex gap-2 flex-shrink-0 items-start flex-col sm:flex-row">
										<!-- Expand/Collapse indicator -->
										<button
											onclick={(e) => { e.stopPropagation(); toggleCardExpansion(rec.id); }}
											class="rounded-lg p-2.5 sm:p-1.5 text-text-muted hover:bg-primary/5 dark:hover:bg-primary/5 transition-colors min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center"
											title={expandedCardId === rec.id ? "Show less" : "Show more"}
										>
											<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" class="sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
												<polyline points="6 9 12 15 18 9" class="transition-transform {expandedCardId === rec.id ? 'rotate-180' : ''}"></polyline>
											</svg>
										</button>
										<button
											onclick={(e) => { e.stopPropagation(); startComplete(rec); }}
											class="rounded-lg p-2.5 sm:p-1.5 text-lg sm:text-sm text-primary hover:bg-primary/10 transition-colors min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center"
											title="Mark as completed"
										>
											✓
										</button>
										<button
											onclick={(e) => { e.stopPropagation(); shareRecommendation(rec); }}
											class="rounded-lg p-2.5 sm:p-1.5 text-text-muted hover:bg-primary/5 dark:hover:bg-primary/5 transition-colors min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center"
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
										class="rounded-lg p-2.5 sm:p-1.5 text-text-muted hover:bg-primary/5 dark:hover:bg-primary/5 transition-colors min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center"
										title="Edit"
									>
										<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" class="sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
											<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
											<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
										</svg>
									</button>
										{#if expandedCardId === rec.id}
											<button
												onclick={(e) => { e.stopPropagation(); deleteRecommendation(rec.id); }}
												class="rounded-lg p-2.5 sm:p-1.5 text-lg sm:text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center"
												title="Delete"
											>
												🗑
											</button>
										{/if}
									</div>
									{/if}
								</div>
							{/if}
						</Card>
					{/each}
				{/if}
			</div>
		{:else}
			<!-- Completed Recommendations -->
			<div class="{layoutMode === 'grid' ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4' : 'space-y-4'}">
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
										<span class="rounded-full bg-primary/20 px-2 py-1 text-sm" title={formatCategory(rec.category)}>
											{getCategoryIcon(rec.category)}
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
									{#if rec.metadata?.genres && rec.metadata.genres.length > 0 && layoutMode !== 'compact'}
										<div class="mb-2 flex gap-1 flex-wrap">
											{#each rec.metadata.genres.slice(0, 3) as genre}
												<span class="text-xs bg-surface-light dark:bg-surface-dark px-2 py-1 rounded">
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
									{#if expandedCardId === rec.id && rec.metadata}
										<!-- Additional metadata shown when expanded -->
										{#if rec.metadata?.runtime}
											<p class="text-xs text-text-muted mt-2">Runtime: {rec.metadata.runtime} min</p>
										{/if}
						<div class="flex gap-3 mt-2 text-xs flex-wrap">
							{#if (rec.category === 'movie' || rec.category === 'series') && (rec.metadata as any)?.imdb_rating}
								<span class="text-text-muted">TMDB: {(rec.metadata as any).imdb_rating.toFixed(1)}/10</span>
							{/if}
							{#if (rec.category === 'movie' || rec.category === 'series') && ((rec.metadata as any)?.rt_score || (rec.metadata as any)?.rt_critic_score)}
								<span class="text-text-muted" title="Rotten Tomatoes Tomatometer">🍅 {((rec.metadata as any)?.rt_critic_score || (rec.metadata as any)?.rt_score)}%</span>
							{/if}
							{#if (rec.category === 'movie' || rec.category === 'series') && (rec.metadata as any)?.rt_audience_score}
								<span class="text-text-muted" title="Rotten Tomatoes Audience Score">🍿 {(rec.metadata as any).rt_audience_score}%</span>
							{/if}
						</div>
						{#if rec.category === 'movie' || rec.category === 'series'}
							<div class="flex gap-3 mt-2">
								{#if (rec.metadata as any)?.tmdb_id}
									<a
										href="https://www.themoviedb.org/{rec.category === 'movie' ? 'movie' : 'tv'}/{(rec.metadata as any).tmdb_id}"
										target="_blank"
										rel="noopener noreferrer"
										class="text-xs text-primary hover:underline"
										onclick={(e) => e.stopPropagation()}
									>
										View on TMDB →
									</a>
								{/if}
								<a
									href={`https://www.rottentomatoes.com/search?search=${encodeURIComponent(rec.title)}`}
									target="_blank"
									rel="noopener noreferrer"
									class="text-xs text-primary hover:underline"
									onclick={(e) => e.stopPropagation()}
								>
									Search on Rotten Tomatoes →
								</a>
							</div>
						{/if}
										{#if rec.metadata?.overview && rec.metadata.overview !== rec.description}
											<p class="text-sm text-text-muted mt-2 pt-2 border-t border-black/5 dark:border-white/5">
												{rec.metadata.overview}
											</p>
										{/if}
									{/if}
								</div>

								<div class="flex gap-2 flex-shrink-0 items-start flex-col sm:flex-row">
									<!-- Expand/Collapse indicator -->
									<button
										onclick={(e) => { e.stopPropagation(); toggleCardExpansion(rec.id); }}
										class="rounded-lg p-2.5 sm:p-1.5 text-text-muted hover:bg-primary/5 dark:hover:bg-primary/5 transition-colors min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center"
										title={expandedCardId === rec.id ? "Show less" : "Show more"}
									>
										<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" class="sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
											<polyline points="6 9 12 15 18 9" class="transition-transform {expandedCardId === rec.id ? 'rotate-180' : ''}"></polyline>
										</svg>
									</button>
									<button
										onclick={(e) => { e.stopPropagation(); shareRecommendation(rec); }}
										class="rounded-lg p-2.5 sm:p-1.5 text-text-muted hover:bg-primary/5 dark:hover:bg-primary/5 transition-colors min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center"
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
										class="rounded-lg p-2.5 sm:p-1.5 text-lg sm:text-sm text-text-muted hover:bg-primary/5 dark:hover:bg-primary/5 transition-colors min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center"
										title="Move back to active"
									>
										↶
									</button>
									{#if expandedCardId === rec.id}
										<button
											onclick={(e) => { e.stopPropagation(); deleteRecommendation(rec.id); }}
											class="rounded-lg p-2.5 sm:p-1.5 text-lg sm:text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center"
											title="Delete"
										>
											🗑
										</button>
									{/if}
								</div>
							</div>
						</Card>
					{/each}
				{/if}
			</div>
		{/if}

		<!-- Keyboard Shortcuts Help -->
		<KeyboardShortcutsModal show={showKeyboardHelp} onClose={() => (showKeyboardHelp = false)} />
	</div>

	<!-- Toast Notifications -->
	<ToastContainer />

	<!-- Confirm Modal -->
	{#if confirmModal}
		<ConfirmModal
			title={confirmModal.title}
			message={confirmModal.message}
			confirmLabel={confirmModal.confirmLabel || "Delete"}
			cancelLabel="Cancel"
			variant="danger"
			onConfirm={confirmModal.onConfirm}
			onCancel={() => (confirmModal = null)}
		/>
	{/if}

	<!-- PWA Install Prompt -->
	<InstallPrompt />

	<!-- Migration Prompt -->
	<MigrationPrompt
		show={showMigrationPrompt}
		count={sessionRecommendations.length}
		onMigrate={migrateSessionRecommendations}
		onDismiss={dismissMigrationPrompt}
	/>

	<!-- Footer -->
	<footer class="mt-20 pt-8 pb-8 border-t border-black/5 dark:border-white/5">
		<div class="max-w-4xl mx-auto px-4">
			<div class="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-text-muted">
				<div class="flex items-center gap-4">
					<a href="/about" class="hover:text-text dark:hover:text-white transition-colors">
						About
					</a>
					<span class="text-xs hidden md:inline">·</span>
					<button
						onclick={() => showKeyboardHelp = true}
						class="hidden md:inline hover:text-text dark:hover:text-white transition-colors"
					>
						Keyboard Shortcuts
					</button>
					<span class="text-xs hidden md:inline">·</span>
					<button
						onclick={() => showSettingsMenu = true}
						class="hover:text-text dark:hover:text-white transition-colors"
					>
						Settings
					</button>
				</div>
				<div class="text-xs flex items-center gap-2">
					<span>Made by <a href="https://ruskinconstant.com" target="_blank" rel="noopener noreferrer" class="underline hover:opacity-80 transition-opacity">jonnyparris</a></span>
					<span class="opacity-50">·</span>
					<span>Listo © 2025</span>
				</div>
			</div>
		</div>
	</footer>
</div>
