'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || 'Registration failed');
    } else {
      router.push('/login?registered=true');
    }
  };

  return (
    <div className="mx-auto max-w-md p-8">
      <h1 className="text-2xl font-semibold">Register</h1>
      <p className="mt-4 text-sm text-zinc-600">Create your account to get started</p>
      <form className="mt-6 flex flex-col gap-3" onSubmit={handleSubmit}>
        <input
          className="border px-3 py-2 rounded"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="border px-3 py-2 rounded"
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="border px-3 py-2 rounded"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <div className="text-sm text-red-600">{error}</div>}
        <button className="mt-2 rounded bg-black px-4 py-2 text-white disabled:opacity-50" disabled={loading}>
          {loading ? 'Creating account...' : 'Create account'}
        </button>
      </form>
      <p className="mt-4 text-sm text-zinc-600">
        Already have an account?{' '}
        <a href="/login" className="underline">
          Login
        </a>
      </p>
    </div>
  );
}
