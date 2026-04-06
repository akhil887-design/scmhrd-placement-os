import { useEffect, useState } from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';
import { api } from '../api/client';
import { Card } from '../components/Card';

function radarFromSnapshot(snapshot) {
  const pub = snapshot.trait_percentages_public;
  const internal = snapshot.trait_percentages || {};
  const a = pub?.analytical ?? internal.analytical ?? 0;
  const l = pub?.leadership ?? internal.leadership ?? 0;
  const r = pub?.risk ?? internal.risk_taking ?? 0;
  const e = pub?.emotional_stability ?? internal.emotional_stability ?? 0;
  return [
    { trait: 'Analytical', value: a },
    { trait: 'Leadership', value: l },
    { trait: 'Risk', value: r },
    { trait: 'Emotional Stability', value: e },
  ];
}

export default function Psych() {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [done, setDone] = useState(null);
  const [latest, setLatest] = useState(null);

  useEffect(() => {
    api.get('/api/psych/questions').then((d) => {
      setQuestions(d.questions);
      const init = {};
      d.questions.forEach((q) => {
        init[q.id] = 0;
      });
      setAnswers(init);
    });
    api.get('/api/psych/latest').then(setLatest);
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    const payload = {
      answers: questions.map((q) => ({
        question_id: q.id,
        option_index: answers[q.id] ?? 0,
      })),
    };
    const data = await api.post('/api/psych/submit', payload);
    setDone(data);
    api.get('/api/psych/latest').then(setLatest);
  };

  const snapshot = done || latest?.attempt;

  if (!questions.length && !done) {
    return <p className="text-ink-muted">Loading assessment…</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Psychological assessment</h1>
        <p className="text-ink-muted mt-1">
          40 MCQs · each option scores Analytical, Leadership, Risk, and Emotional Stability (1–5).
          Raw scores are summed, normalized to 100%, and stored with your attempt.
        </p>
      </div>

      {snapshot && (
        <div className="space-y-6">
          <Card title="Summary">
            <p className="text-base font-medium text-ink">
              {snapshot.interpretation_summary ||
                (snapshot.interpretation || '').split('\n')[0] ||
                ''}
            </p>
            <p className="text-sm text-ink-muted mt-2">
              Psych fit (dashboard):{' '}
              <span className="font-semibold text-ink">
                {snapshot.psych_fit_percent}%
              </span>
            </p>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            <Card title="Trait profile (radar)">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarFromSnapshot(snapshot)}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="trait" tick={{ fontSize: 11 }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={false} />
                    <Radar
                      name="You"
                      dataKey="value"
                      stroke="#0071e3"
                      fill="#0071e3"
                      fillOpacity={0.25}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-ink-muted mt-1">
                Percentages sum to 100% across the four traits.
              </p>
            </Card>
            <Card title="Interpretation">
              <div className="text-sm whitespace-pre-wrap leading-relaxed">
                {(snapshot.interpretation || '').replace(/\*\*(.*?)\*\*/g, '$1')}
              </div>
            </Card>
          </div>
        </div>
      )}

      {!done && (
        <form onSubmit={submit} className="space-y-4">
          {questions.map((q, i) => (
            <Card key={q.id} title={`Question ${i + 1}`}>
              <p className="mb-3">{q.prompt}</p>
              <div className="space-y-2">
                {q.options.map((o, idx) => (
                  <label
                    key={idx}
                    className="flex items-start gap-2 text-sm cursor-pointer rounded-xl border border-black/5 px-3 py-2"
                  >
                    <input
                      type="radio"
                      name={`p-${q.id}`}
                      checked={answers[q.id] === idx}
                      onChange={() => setAnswers({ ...answers, [q.id]: idx })}
                    />
                    <span>{o}</span>
                  </label>
                ))}
              </div>
            </Card>
          ))}
          <button
            type="submit"
            className="rounded-full bg-ink text-white px-6 py-2.5 text-sm font-medium"
          >
            Submit assessment
          </button>
        </form>
      )}

      {done && (
        <button
          type="button"
          onClick={() => {
            setDone(null);
            const init = {};
            questions.forEach((q) => {
              init[q.id] = 0;
            });
            setAnswers(init);
          }}
          className="text-sm text-accent hover:underline"
        >
          Retake (new attempt)
        </button>
      )}
    </div>
  );
}
