import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { AUTH_COOKIE } from '@/lib/auth';

// ── Helpers ───────────────────────────────────────────────────────────────────

function jwtSecret() {
  return new TextEncoder().encode(process.env.AUTH_SECRET ?? '');
}

// ── Basic Auth ────────────────────────────────────────────────────────────────

function unauthorized(): NextResponse {
  return new NextResponse('Unauthorized', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="IPv6 Compliance Tracker"' },
  });
}

function handleBasic(req: NextRequest): NextResponse {
  const auth = req.headers.get('authorization') ?? '';
  const [scheme, encoded] = auth.split(' ');
  if (scheme !== 'Basic' || !encoded) return unauthorized();
  const decoded = atob(encoded);
  const colon = decoded.indexOf(':');
  if (colon === -1) return unauthorized();
  const user = decoded.slice(0, colon);
  const pass = decoded.slice(colon + 1);
  if (
    user !== process.env.AUTH_USER ||
    pass !== process.env.AUTH_PASS
  ) return unauthorized();
  return NextResponse.next();
}

// ── Cookie / Session Auth ─────────────────────────────────────────────────────

const PUBLIC_PATHS = ['/login', '/api/auth/login', '/api/auth/logout'];

async function handleCookie(req: NextRequest): Promise<NextResponse> {
  const path = req.nextUrl.pathname;
  if (PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + '/')))
    return NextResponse.next();

  const token = req.cookies.get(AUTH_COOKIE)?.value;
  if (!token) return NextResponse.redirect(new URL('/login', req.url));

  try {
    await jwtVerify(token, jwtSecret());
    return NextResponse.next();
  } catch {
    const res = NextResponse.redirect(new URL('/login', req.url));
    res.cookies.delete(AUTH_COOKIE);
    return res;
  }
}

// ── Dispatch ──────────────────────────────────────────────────────────────────

export async function middleware(req: NextRequest) {
  const mode = process.env.AUTH_MODE ?? 'none';
  if (mode === 'basic') return handleBasic(req);
  if (mode === 'cookie') return handleCookie(req);
  // AUTH_MODE=none (default) — open access, suitable for trusted networks / dev
  return NextResponse.next();
  // AUTH_MODE=nextauth — stub: wire up next-auth@5 here and protect routes via
  // the Auth.js middleware helper. Requires next-auth@5, a database adapter, and
  // User/Session/Account tables added to prisma/schema.prisma.
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
