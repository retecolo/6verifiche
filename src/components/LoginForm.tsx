"use client";

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: fd.get('user'), pass: fd.get('pass') }),
    });
    setLoading(false);
    if (res.ok) {
      router.push('/');
      router.refresh();
    } else {
      setError('Invalid username or password.');
    }
  }

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="user">Username</label>
        <input
          id="user"
          name="user"
          type="text"
          autoComplete="username"
          required
        />
      </div>
      <div className="form-group">
        <label htmlFor="pass">Password</label>
        <input
          id="pass"
          name="pass"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      {error && <p className="login-error">{error}</p>}
      <button
        type="submit"
        className="btn btn-primary login-submit"
        disabled={loading}
      >
        {loading ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
