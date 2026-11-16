import { api } from '#lib/server/http.ts';

export const GET = api((caller) => ({ id: caller.userId, name: caller.name, email: caller.email, is_admin: caller.isAdmin }));
