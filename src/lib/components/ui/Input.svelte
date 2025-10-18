<script lang="ts">
	interface Props {
		value?: string;
		placeholder?: string;
		type?: string;
		disabled?: boolean;
		autofocus?: boolean;
		class?: string;
		oninput?: (event: Event) => void;
		onblur?: (event: FocusEvent) => void;
		onfocus?: (event: FocusEvent) => void;
		onkeydown?: (event: KeyboardEvent) => void;
	}

	let {
		value = $bindable(''),
		placeholder = '',
		type = 'text',
		disabled = false,
		autofocus = false,
		class: className = '',
		oninput,
		onblur,
		onfocus,
		onkeydown
	}: Props = $props();

	const classes = $derived(
		`w-full rounded-xl bg-background-light dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-3 text-text dark:text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-200 ${className}`
	);
</script>

<input
	bind:value
	{type}
	{placeholder}
	{disabled}
	{autofocus}
	class={classes}
	{oninput}
	{onblur}
	{onfocus}
	{onkeydown}
/>
