import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import type { Session } from 'next-auth';

export type AuthedSession = Session & {
  user: NonNullable<Session['user']>;
};

export async function requireSession(): Promise<
  { session: AuthedSession; error: null } | { session: null; error: NextResponse }
> {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return {
      session: null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }
  return { session: session as AuthedSession, error: null };
}

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function err(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
