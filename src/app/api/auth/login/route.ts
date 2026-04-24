import { NextResponse } from 'next/server';
import { signToken, AUTH_COOKIE, AUTH_COOKIE_MAX_AGE } from '@/lib/auth';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { user, pass } = body as { user?: string; pass?: string };

  if (
    !user ||
    !pass ||
    user !== process.env.AUTH_USER ||
    pass !== process.env.AUTH_PASS
  ) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const token = await signToken(user);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: AUTH_COOKIE_MAX_AGE,
    path: '/',
  });
  return res;
}
