import { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import { api } from '../api/client';
import { Card } from '../components/Card';

function radarFromTraits(t) {
  if (!t) return [];
  return [
    { trait: 'Analytical', value: t.analytical ?? 0 },
    { trait: 'Leadership', value: t.leadership ?? 0 },
    { trait: 'Risk', value: t.risk ?? 0 },
    { trait: 'Emotional Stability', value: t.emotional_stability ?? 0 },
  ];
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api
      .get('/api/dashboard')
      .then(setData)
      .catch((e) => setErr(e.message));
  }, []);

  if (err) return <p className="text-red-600">{err}</p>;
  if (!data) return <p className="text-ink-muted">Loading…</p>;

  const barData = [
    { name: 'Aptitude', value: data.breakdown.aptitude_percent },
    { name: 'Interview', value: data.breakdown.interview_percent },
    { name: 'Psych', value: data.breakdown.psych_fit_percent },
  ];

  const trendData = (data.trend?.series || []).map((row) => ({
    ...row,
    tlabel: row.at ? new Date(row.at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '',
  }));

  return (
    <div className="space-y-10 max-w-4xl">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Performance</h1>
        <p className="text-sm text-ink-muted mt-1">
          Readiness = {data.weights.aptitude}×Aptitude + {data.weights.interview}×Interview +{' '}
          {data.weights.psych}×Psych
        </p>
      </header>

      <section className="flex flex-col sm:flex-row sm:items-end gap-6 pb-2 border-b border-black/5">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Overall readiness</p>
          <p className="text-5xl font-semibold tabular-nums tracking-tight mt-1">
            {data.placement_readiness}
          </p>
          <p className="text-xs text-ink-muted mt-1">out of 100</p>
        </div>
        <div className="flex gap-8 sm:ml-auto">
          <div>
            <p className="text-xs text-ink-muted">Aptitude</p>
            <p className="text-xl font-medium tabular-nums">{data.breakdown.aptitude_percent}%</p>
          </div>
          <div>
            <p className="text-xs text-ink-muted">Interview</p>
            <p className="text-xl font-medium tabular-nums">{data.breakdown.interview_percent}%</p>
          </div>
          <div>
            <p className="text-xs text-ink-muted">Psych</p>
            <p className="text-xl font-medium tabular-nums">{data.breakdown.psych_fit_percent}%</p>
          </div>
        </div>
      </section>

      <div className="grid md:grid-cols-2 gap-6">
        <Card title="Section scores" className="!p-5">
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#00000008" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6e6e73' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#6e6e73' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}
                />
                <Bar dataKey="value" fill="#0071e3" radius={[4, 4, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Psych traits" className="!p-5">
          {data.trait_percentages_public ? (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarFromTraits(data.trait_percentages_public)}>
                  <PolarGrid stroke="#00000010" />
                  <PolarAngleAxis dataKey="trait" tick={{ fontSize: 10, fill: '#6e6e73' }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={false} />
                  <Radar
                    dataKey="value"
                    stroke="#0071e3"
                    fill="#0071e3"
                    fillOpacity={0.2}
                    strokeWidth={1.5}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-ink-muted py-8 text-center">
              Complete the psychological assessment to see your trait radar.
            </p>
          )}
        </Card>
      </div>

      <Card title="Performance over time" className="!p-5">
        {data.trend?.has_data ? (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#00000008" />
                <XAxis dataKey="tlabel" tick={{ fontSize: 11, fill: '#6e6e73' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#6e6e73' }} />
                <Tooltip
                  formatter={(v) => (v == null ? '—' : `${v}%`)}
                  labelFormatter={(_, items) => {
                    const row = items?.[0]?.payload;
                    return row?.at ? new Date(row.at).toLocaleString() : '';
                  }}
                  contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}
                />
                <Line
                  type="monotone"
                  dataKey="aptitude"
                  name="Aptitude"
                  stroke="#0071e3"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#0071e3' }}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="psych"
                  name="Psych fit"
                  stroke="#34c759"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#34c759' }}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="interview"
                  name="Interview (current)"
                  stroke="#aeaeb2"
                  strokeWidth={1.5}
                  strokeDasharray="5 5"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm text-ink-muted text-center py-6">
            Submit aptitude or psych assessments to see your trend line.
          </p>
        )}
        <p className="text-xs text-ink-muted mt-3">
          Aptitude and psych update at each submission; interview shows your current aggregate score as a
          reference line.
        </p>
      </Card>

      <Card title="Recommendations" className="!p-5">
        <ul className="space-y-2 text-sm text-ink leading-relaxed">
          {(data.recommendations || []).map((line, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-ink-muted shrink-0">{i + 1}.</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </Card>

      {data.last_mock_session && (
        <Card title="Latest mock interview" className="!p-5">
          <p className="text-sm">
            Consistency:{' '}
            <span className="font-medium tabular-nums">{data.last_mock_session.consistency_score}</span>
          </p>
          <p className="text-xs text-ink-muted mt-1">
            {new Date(data.last_mock_session.created_at).toLocaleString()}
          </p>
        </Card>
      )}
    </div>
  );
}
