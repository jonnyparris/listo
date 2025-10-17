<script lang="ts">
	interface Props {
		class?: string;
		children?: import('svelte').Snippet;
	}

	let { class: className = '', children }: Props = $props();

	const classes = $derived(
		`bg-white dark:bg-gray-800 rounded-2xl shadow-soft p-6 transition-all duration-200 hover:shadow-card ${className}`
	);
</script>

<div class={classes}>
	{@render children?.()}
</div>
