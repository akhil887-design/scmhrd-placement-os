import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { Card } from '../components/Card';

export default function InterviewDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  const load = () => {
    api
      .get(`/api/interview/questions/${id}`)
      .then(setData)
      .catch((e) => setErr(e.message));
  };

  useEffect(() => {
    load();
  }, [id]);

  const reveal = async () => {
    await api.post('/api/interview/reveal', { question_id: Number(id) });
    load();
  };

  const setConfidence = async (c) => {
    await api.post('/api/interview/confidence', { question_id: Number(id), confidence: c });
    load();
  };

  if (err) return <p className="text-red-600">{err}</p>;
  if (!data) return <p className="text-ink-muted">Loading…</p>;

  const q = data.question;

  return (
    <div className="space-y-6">
      <Link to="/interview" className="text-sm text-accent hover:underline">
        ← Back to list
      </Link>
      <Card title={q.category}>
        <p className="text-base leading-relaxed mb-6">{q.question}</p>
        {!data.revealed && (
          <button
            type="button"
            onClick={reveal}
            className="rounded-full bg-ink text-white px-5 py-2 text-sm font-medium"
          >
            Reveal suggested answer
          </button>
        )}
        {data.revealed && data.answer && (
          <div className="rounded-2xl bg-accent-soft border border-accent/20 p-4 text-sm leading-relaxed whitespace-pre-wrap">
            {data.answer}
          </div>
        )}
        <div className="mt-6">
          <p className="text-sm text-ink-muted mb-2">Self-rated confidence (1–5)</p>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setConfidence(c)}
                className={`rounded-full px-3 py-1.5 text-sm border ${
                  data.confidence === c ? 'bg-ink text-white border-ink' : 'border-black/10'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
