type ToastType = 'success' | 'error' | 'info';

interface Toast {
	id: string;
	message: string;
	type: ToastType;
	duration?: number;
}

class ToastStore {
	toasts = $state<Toast[]>([]);

	show(message: string, type: ToastType = 'info', duration = 3000) {
		const id = crypto.randomUUID();
		const toast: Toast = { id, message, type, duration };

		this.toasts = [...this.toasts, toast];

		return id;
	}

	success(message: string, duration?: number) {
		return this.show(message, 'success', duration);
	}

	error(message: string, duration?: number) {
		return this.show(message, 'error', duration);
	}

	info(message: string, duration?: number) {
		return this.show(message, 'info', duration);
	}

	dismiss(id: string) {
		this.toasts = this.toasts.filter((t) => t.id !== id);
	}
}

export const toastStore = new ToastStore();
