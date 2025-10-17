import { Buffer } from 'node:buffer';
import { headers } from 'next/headers';

export interface AuthenticatedUser {
  id: string;
  email: string;
}

/**
 * Minimal placeholder authentication hook.
 *
 * TODO: Replace with real authentication (e.g. Clerk, NextAuth, Supabase Auth).
 */
export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const headerStore = headers();
  const demoUser = headerStore.get('x-demo-user');

  if (!demoUser) {
    return null;
  }

  const email = demoUser.trim().toLowerCase();

  if (!email) {
    return null;
  }

  return {
    id: `demo-${Buffer.from(email).toString('hex')}`,
    email,
  };
}
