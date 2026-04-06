import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/Card';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      nav('/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed');
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <Card title="Sign in" subtitle="Local account for Placement OS">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm text-ink-muted mb-1">Email</label>
            <input
              className="w-full rounded-xl border border-black/10 px-3 py-2 bg-white"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-ink-muted mb-1">Password</label>
            <input
              type="password"
              className="w-full rounded-xl border border-black/10 px-3 py-2 bg-white"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            className="w-full rounded-full bg-ink text-white py-2.5 font-medium hover:opacity-90"
          >
            Continue
          </button>
        </form>
        <p className="text-sm text-ink-muted mt-4 text-center">
          New here?{' '}
          <Link className="text-accent hover:underline" to="/register">
            Create an account
          </Link>
        </p>
      </Card>
    </div>
  );
}
