import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from '@/middleware';
import { signToken, AUTH_COOKIE } from '@/lib/auth';

const TEST_SECRET = 'test-secret-that-is-long-enough-32ch';

function makeRequest(
  path: string,
  opts: { auth?: string; cookie?: string } = {}
): NextRequest {
  const headers: Record<string, string> = {};
  if (opts.auth) headers['authorization'] = opts.auth;
  if (opts.cookie) headers['cookie'] = `${AUTH_COOKIE}=${opts.cookie}`;
  return new NextRequest(`http://localhost${path}`, { headers });
}

describe('middleware', () => {
  beforeEach(() => {
    vi.stubEnv('AUTH_SECRET', TEST_SECRET);
    vi.stubEnv('AUTH_USER', 'admin');
    vi.stubEnv('AUTH_PASS', 'secret');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('AUTH_MODE=none (default)', () => {
    beforeEach(() => vi.stubEnv('AUTH_MODE', 'none'));

    it('passes page requests through', async () => {
      const res = await middleware(makeRequest('/'));
      expect(res.status).toBe(200);
    });

    it('passes API requests through', async () => {
      const res = await middleware(makeRequest('/api/platforms'));
      expect(res.status).toBe(200);
    });
  });

  describe('AUTH_MODE=basic', () => {
    beforeEach(() => vi.stubEnv('AUTH_MODE', 'basic'));

    it('returns 401 with no authorization header', async () => {
      const res = await middleware(makeRequest('/'));
      expect(res.status).toBe(401);
    });

    it('returns 401 with wrong password', async () => {
      const res = await middleware(makeRequest('/', { auth: `Basic ${btoa('admin:wrong')}` }));
      expect(res.status).toBe(401);
    });

    it('returns 401 with wrong username', async () => {
      const res = await middleware(makeRequest('/', { auth: `Basic ${btoa('wrong:secret')}` }));
      expect(res.status).toBe(401);
    });

    it('returns 401 for non-Basic scheme', async () => {
      const res = await middleware(makeRequest('/', { auth: 'Bearer sometoken' }));
      expect(res.status).toBe(401);
    });

    it('passes with correct credentials', async () => {
      const res = await middleware(makeRequest('/', { auth: `Basic ${btoa('admin:secret')}` }));
      expect(res.status).toBe(200);
    });

    it('includes WWW-Authenticate header on 401', async () => {
      const res = await middleware(makeRequest('/'));
      expect(res.headers.get('www-authenticate')).toContain('Basic');
    });
  });

  describe('AUTH_MODE=cookie', () => {
    beforeEach(() => vi.stubEnv('AUTH_MODE', 'cookie'));

    it('allows /login without a cookie', async () => {
      const res = await middleware(makeRequest('/login'));
      expect(res.status).toBe(200);
    });

    it('allows /api/auth/login without a cookie', async () => {
      const res = await middleware(makeRequest('/api/auth/login'));
      expect(res.status).toBe(200);
    });

    it('allows /api/auth/logout without a cookie', async () => {
      const res = await middleware(makeRequest('/api/auth/logout'));
      expect(res.status).toBe(200);
    });

    it('redirects to /login when no cookie is present', async () => {
      const res = await middleware(makeRequest('/'));
      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toContain('/login');
    });

    it('redirects to /login when cookie is invalid', async () => {
      const res = await middleware(makeRequest('/', { cookie: 'not-a-valid-jwt' }));
      expect(res.status).toBe(307);
    });

    it('passes through when cookie contains a valid token', async () => {
      const token = await signToken('admin');
      const res = await middleware(makeRequest('/', { cookie: token }));
      expect(res.status).toBe(200);
    });

    it('redirects to /login when cookie is expired / tampered', async () => {
      const token = await signToken('admin');
      const tampered = token.slice(0, -4) + 'XXXX';
      const res = await middleware(makeRequest('/', { cookie: tampered }));
      expect(res.status).toBe(307);
    });
  });
});
