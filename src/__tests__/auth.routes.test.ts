import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST as loginPOST } from '@/app/api/auth/login/route';
import { POST as logoutPOST } from '@/app/api/auth/logout/route';
import { AUTH_COOKIE } from '@/lib/auth';

const TEST_SECRET = 'test-secret-that-is-long-enough-32ch';

function loginRequest(body: unknown): Request {
  return new Request('http://localhost/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    vi.stubEnv('AUTH_SECRET', TEST_SECRET);
    vi.stubEnv('AUTH_USER', 'admin');
    vi.stubEnv('AUTH_PASS', 'secret');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns 401 for missing credentials', async () => {
    const res = await loginPOST(loginRequest({}));
    expect(res.status).toBe(401);
  });

  it('returns 401 for wrong password', async () => {
    const res = await loginPOST(loginRequest({ user: 'admin', pass: 'wrong' }));
    expect(res.status).toBe(401);
  });

  it('returns 401 for wrong username', async () => {
    const res = await loginPOST(loginRequest({ user: 'wrong', pass: 'secret' }));
    expect(res.status).toBe(401);
  });

  it('returns 401 for non-JSON body', async () => {
    const req = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      body: 'not-json',
    });
    const res = await loginPOST(req);
    expect(res.status).toBe(401);
  });

  it('returns 200 and sets an httpOnly cookie for valid credentials', async () => {
    const res = await loginPOST(loginRequest({ user: 'admin', pass: 'secret' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    const setCookie = res.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain(AUTH_COOKIE);
    expect(setCookie.toLowerCase()).toContain('httponly');
  });

  it('returns a cookie containing a valid JWT', async () => {
    const res = await loginPOST(loginRequest({ user: 'admin', pass: 'secret' }));
    const setCookie = res.headers.get('set-cookie') ?? '';
    // Cookie value is the first segment: auth-session=<token>; ...
    const match = setCookie.match(new RegExp(`${AUTH_COOKIE}=([^;]+)`));
    expect(match).not.toBeNull();
    // JWT has three base64url segments separated by dots
    expect(match![1].split('.').length).toBe(3);
  });
});

describe('POST /api/auth/logout', () => {
  it('returns 200 with ok:true', async () => {
    const res = await logoutPOST();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it('clears the session cookie', async () => {
    const res = await logoutPOST();
    const setCookie = res.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain(AUTH_COOKIE);
  });
});
