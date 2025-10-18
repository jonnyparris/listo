import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { logout } from '$lib/server/auth';

export const POST: RequestHandler = async ({ locals, cookies }) => {
	await logout({ locals, cookies } as any);
	throw redirect(303, '/auth');
};