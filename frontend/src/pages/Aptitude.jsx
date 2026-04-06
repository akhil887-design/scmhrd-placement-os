import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Card } from '../components/Card';

export default function Aptitude() {
  const [attempts, setAttempts] = useState([]);

  useEffect(() => {
    api.get('/api/aptitude/attempts').then((d) => setAttempts(d.attempts));
  }, []);

  const cats = ['Quant', 'Logical', 'Verbal'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Aptitude tests</h1>
        <p className="text-ink-muted mt-1">Timer-based MCQs with solutions after submit.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {cats.map((c) => (
          <Card key={c} title={c}>
            <p className="text-sm text-ink-muted mb-4">Full-length section practice.</p>
            <Link
              to={`/aptitude/test/${c}`}
              className="inline-flex rounded-full bg-ink text-white px-4 py-2 text-sm font-medium"
            >
              Start {c}
            </Link>
          </Card>
        ))}
      </div>

      <Card title="Recent attempts">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-ink-muted border-b border-black/5">
                <th className="py-2 pr-4">Category</th>
                <th className="py-2 pr-4">Score</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2">When</th>
              </tr>
            </thead>
            <tbody>
              {attempts.map((a) => (
                <tr key={a.id} className="border-b border-black/5">
                  <td className="py-2 pr-4">{a.category}</td>
                  <td className="py-2 pr-4">
                    {a.status === 'submitted' ? `${a.score}/${a.total}` : '—'}
                  </td>
                  <td className="py-2 pr-4">{a.status}</td>
                  <td className="py-2">
                    {a.submitted_at
                      ? new Date(a.submitted_at).toLocaleString()
                      : new Date(a.started_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
