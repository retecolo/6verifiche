import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { signToken, verifyToken } from '@/lib/auth';

const TEST_SECRET = 'test-secret-that-is-long-enough-32ch';

describe('auth helpers', () => {
  beforeEach(() => {
    vi.stubEnv('AUTH_SECRET', TEST_SECRET);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('signToken + verifyToken round-trip succeeds', async () => {
    const token = await signToken('alice');
    expect(await verifyToken(token)).toBe(true);
  });

  it('verifyToken returns false for token signed with a different secret', async () => {
    const token = await signToken('alice');
    vi.stubEnv('AUTH_SECRET', 'completely-different-secret-also-long-enough');
    expect(await verifyToken(token)).toBe(false);
  });

  it('verifyToken returns false for a tampered token', async () => {
    const token = await signToken('alice');
    const tampered = token.slice(0, -4) + 'XXXX';
    expect(await verifyToken(tampered)).toBe(false);
  });

  it('verifyToken returns false for completely invalid input', async () => {
    expect(await verifyToken('not.a.valid.jwt')).toBe(false);
  });

  it('verifyToken returns false for empty string', async () => {
    expect(await verifyToken('')).toBe(false);
  });

  it('signToken throws when AUTH_SECRET is missing', async () => {
    vi.stubEnv('AUTH_SECRET', '');
    await expect(signToken('alice')).rejects.toThrow('AUTH_SECRET');
  });
});
