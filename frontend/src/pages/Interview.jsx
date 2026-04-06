import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { Card } from '../components/Card';

export default function Interview() {
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [stats, setStats] = useState(null);

  const load = () => {
    const q = new URLSearchParams();
    if (category) q.set('category', category);
    q.set('page', String(page));
    q.set('pageSize', '15');
    api.get(`/api/interview/questions?${q.toString()}`).then(setData);
  };

  useEffect(() => {
    load();
  }, [category, page]);

  useEffect(() => {
    api.get('/api/interview/stats').then(setStats);
  }, []);

  if (!data) return <p className="text-ink-muted">Loading…</p>;

  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Interview prep</h1>
        <p className="text-ink-muted mt-1">
          {stats && (
            <>
              Bank: {stats.total_questions} · Revealed: {stats.revealed} · Confidence rated:{' '}
              {stats.confidence_rated}
            </>
          )}
        </p>
      </div>

      <Card title="Browse">
        <div className="flex flex-wrap gap-2 mb-4">
          {['', 'HR', 'Technical', 'Case'].map((c) => (
            <button
              key={c || 'all'}
              type="button"
              onClick={() => {
                setPage(1);
                setCategory(c);
              }}
              className={`rounded-full px-3 py-1.5 text-sm border ${
                category === c ? 'bg-ink text-white border-ink' : 'border-black/10'
              }`}
            >
              {c || 'All'}
            </button>
          ))}
        </div>
        <ul className="divide-y divide-black/5">
          {data.questions.map((q) => (
            <li key={q.id} className="py-3 flex justify-between gap-4">
              <div>
                <p className="text-xs text-ink-muted mb-1">{q.category}</p>
                <p className="text-sm line-clamp-2">{q.question}</p>
              </div>
              <Link
                to={`/interview/${q.id}`}
                className="shrink-0 text-sm text-accent hover:underline"
              >
                Open
              </Link>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between mt-4 text-sm">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-full border border-black/10 px-3 py-1 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-ink-muted">
            Page {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-full border border-black/10 px-3 py-1 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </Card>
    </div>
  );
}
