/** Who is calling: a signed-in user, with their admin flag. */
export interface Caller {
	userId: string;
	email: string;
	name: string | null;
	isAdmin: boolean;
}

export interface Person {
	id: string;
	email: string;
	name: string | null;
}

export function label(person: Pick<Person, 'name' | 'email'>): string {
	return person.name?.trim() || person.email || 'unknown';
}
