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
		primary: 'bg-primary hover:bg-primary-dark text-text dark:text-text shadow-md hover:shadow-lg scale-100 hover:scale-[1.02]',
		secondary: 'bg-secondary/20 hover:bg-secondary/30 text-text dark:text-text shadow-sm',
		outline: 'border-2 border-primary/30 bg-transparent hover:bg-primary/10 text-text dark:text-background-light',
		ghost: 'bg-transparent hover:bg-primary/5 text-text dark:text-background-light'
	};

	const sizes = {
		sm: 'px-4 py-2 text-sm',
		md: 'px-6 py-3 text-base',
		lg: 'px-8 py-4 text-lg'
	};

	const classes = $derived(
		`inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 ease-spring focus:outline-none focus:ring-2 focus:ring-primary-dark dark:focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] ${variants[variant]} ${sizes[size]} ${className}`
	);
</script>

<button {type} {disabled} class={classes} {onclick}>
	{@render children?.()}
</button>
