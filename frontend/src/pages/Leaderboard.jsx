import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import { Card } from '../components/Card';

export default function Leaderboard() {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setErr('');
    setLoading(true);
    try {
      const d = await api.get('/api/leaderboard');
      setRows(d.leaderboard);
    } catch (e) {
      setErr(e.message || 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    const onVis = () => {
      if (!document.hidden) load();
    };
    const onFocus = () => load();
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', onFocus);
    };
  }, [load]);

  if (err) return <p className="text-red-600">{err}</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Leaderboard</h1>
        <p className="text-ink-muted mt-1">
          Final score = 0.4×Aptitude + 0.3×Interview + 0.3×Psych
        </p>
      </div>

      <Card>
        {loading && !rows.length ? (
          <p className="text-sm text-ink-muted">Loading…</p>
        ) : null}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-ink-muted border-b border-black/5">
                <th className="py-2 pr-4">Rank</th>
                <th className="py-2 pr-4">Name</th>
                <th className="py-2">Final</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.user_id} className="border-b border-black/5">
                  <td className="py-2 pr-4 tabular-nums">{r.rank}</td>
                  <td className="py-2 pr-4">{r.name}</td>
                  <td className="py-2 font-semibold tabular-nums">{r.final_score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
