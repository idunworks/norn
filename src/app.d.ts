import type { Lang } from '#lib/i18n/index.ts';
import type { Caller } from '#lib/server/norn/caller.ts';

declare global {
	namespace App {
		interface Locals {
			/** The signed-in user, or null. */
			caller: Caller | null;
			lang: Lang;
		}
		interface Error {
			message: string;
		}
	}
}

export {};
