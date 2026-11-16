/** Short messages at the corner of the screen: a save that failed, a done action. */
import { writable } from 'svelte/store';

export type ToastType = 'success' | 'error' | 'info';
export interface ToastItem {
	id: number;
	type: ToastType;
	message: string;
}

const ERROR_MS = 6000;
const OTHER_MS = 3000;

function createToastStore() {
	const { subscribe, update } = writable<ToastItem[]>([]);
	let next = 0;

	function push(type: ToastType, message: string): void {
		const id = ++next;
		update((list) => [...list, { id, type, message }]);
		setTimeout(() => dismiss(id), type === 'error' ? ERROR_MS : OTHER_MS);
	}

	function dismiss(id: number): void {
		update((list) => list.filter((t) => t.id !== id));
	}

	return {
		subscribe,
		dismiss,
		success: (message: string) => push('success', message),
		error: (message: string) => push('error', message),
		info: (message: string) => push('info', message)
	};
}

export const toast = createToastStore();
