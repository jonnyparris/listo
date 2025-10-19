<script lang="ts">
	import { Button } from './ui';

	interface Props {
		show: boolean;
		count: number;
		onMigrate: () => void;
		onDismiss: () => void;
	}

	let { show, count, onMigrate, onDismiss }: Props = $props();
</script>

{#if show}
	<div
		role="dialog"
		aria-modal="true"
		aria-labelledby="migration-title"
		class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
	>
		<div
			role="document"
			class="bg-white dark:bg-surface-dark rounded-2xl shadow-xl max-w-md w-full p-6"
		>
			<h2 id="migration-title" class="text-xl font-semibold text-text dark:text-white mb-3">
				Save Your Recommendations?
			</h2>
			<p class="text-text-muted mb-6">
				You have {count} recommendation{count === 1 ? '' : 's'} from before you signed in. Would you like to save {count === 1 ? 'it' : 'them'} to your account?
			</p>
			<div class="flex gap-3">
				<Button onclick={onMigrate} variant="primary" class="flex-1">
					Save to Account
				</Button>
				<Button variant="ghost" onclick={onDismiss}>
					Discard
				</Button>
			</div>
		</div>
	</div>
{/if}
