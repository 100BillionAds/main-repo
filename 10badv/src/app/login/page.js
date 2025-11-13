'use client';
import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await signIn('credentials', {
      redirect: false,
      email,
      password,
    });
    setLoading(false);
    if (result?.error) {
      setError('Invalid credentials');
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div className="mx-auto max-w-md p-8">
      <h1 className="text-2xl font-semibold">Login</h1>
      <p className="mt-4 text-sm text-zinc-600">Sign in to access your workspace</p>
      <form className="mt-6 flex flex-col gap-3" onSubmit={handleSubmit}>
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
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
      <p className="mt-4 text-sm text-zinc-600">
        Don't have an account?{' '}
        <a href="/register" className="underline">
          Register
        </a>
      </p>
    </div>
  );
}
