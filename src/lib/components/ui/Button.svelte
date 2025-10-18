<script lang="ts">
	type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
	type ButtonSize = 'sm' | 'md' | 'lg';

	interface Props {
		variant?: ButtonVariant;
		size?: ButtonSize;
		type?: 'button' | 'submit' | 'reset';
		disabled?: boolean;
		class?: string;
		onclick?: () => void;
		children?: import('svelte').Snippet;
	}

	let {
		variant = 'primary',
		size = 'md',
		type = 'button',
		disabled = false,
		class: className = '',
		onclick,
		children
	}: Props = $props();

	const variants = {
		primary: 'bg-primary hover:bg-primary-dark text-text dark:text-text shadow-sm hover:shadow-md',
		secondary: 'bg-secondary hover:bg-secondary-dark text-text dark:text-text shadow-sm hover:shadow-md',
		outline: 'border-2 border-primary bg-transparent hover:bg-primary/10 text-text dark:text-white',
		ghost: 'bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-text dark:text-white'
	};

	const sizes = {
		sm: 'px-4 py-2 text-sm',
		md: 'px-6 py-3 text-base',
		lg: 'px-8 py-4 text-lg'
	};

	const classes = $derived(
		`inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`
	);
</script>

<button {type} {disabled} class={classes} {onclick}>
	{@render children?.()}
</button>
