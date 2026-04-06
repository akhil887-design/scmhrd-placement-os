import { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { api, downloadCsv } from '../api/client';
import { Card } from '../components/Card';

/** Executive palette — restrained, high contrast on light UI */
const C = {
  ink: '#1d1d1f',
  muted: '#86868b',
  grid: '#e8e8ed',
  pie: ['#34c759', '#0a84ff', '#ff9f0a'],
  bar: { apt: '#0a84ff', int: '#5e5ce6', psych: '#34c759' },
  line: { apt: '#0a84ff', psych: '#34c759' },
};

const chartMargin = { top: 12, right: 12, left: -8, bottom: 4 };

function ExecutiveTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const fmt = (p) => {
    if (p.value == null) return '—';
    if (typeof p.value !== 'number') return String(p.value);
    const n = Number(p.value);
    return `${Number.isInteger(n) ? n : n.toFixed(1)}%`;
  };
  return (
    <div className="rounded-lg border border-black/[0.06] bg-white px-3 py-2 text-xs shadow-lg">
      {label != null && label !== '' && (
        <p className="font-medium text-[#1d1d1f] mb-1.5">{label}</p>
      )}
      <ul className="space-y-1">
        {payload.map((p) => (
          <li
            key={String(p.dataKey ?? p.name)}
            className="flex justify-between gap-8 tabular-nums text-[#3a3a3c]"
          >
            <span className="text-[#86868b]">{p.name}</span>
            <span>{fmt(p)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function DirectorAnalytics() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api
      .get('/api/director/analytics')
      .then(setData)
      .catch((e) => setErr(e.message || 'Failed to load'));
  }, []);

  const pieData = useMemo(() => {
    if (!data?.batch_overview?.readiness_distribution) return [];
    const d = data.batch_overview.readiness_distribution;
    return [
      { name: 'High (>80%)', value: d.high_ready_gt_80 },
      { name: 'Moderate (60–80%)', value: d.moderate_60_to_80 },
      { name: 'At risk (<60%)', value: d.at_risk_lt_60 },
    ];
  }, [data]);

  const specBars = useMemo(() => {
    if (!data?.specialization_analysis) return [];
    return data.specialization_analysis
      .filter((s) => s.track !== 'Other' || s.student_count > 0)
      .map((s) => ({
        name: s.track,
        apt: s.avg_aptitude,
        int: s.avg_interview,
        psych: s.avg_psych,
        readiness: s.avg_placement_readiness,
        n: s.student_count,
      }));
  }, [data]);

  const hasPieData = pieData.some((p) => p.value > 0);
  const hasSpecData = specBars.length > 0;
  const hasTrendData = (data?.weekly_trend?.length ?? 0) > 0;

  if (err) return <p className="text-red-600 p-8">{err}</p>;
  if (!data) return <p className="text-ink-muted p-8">Loading…</p>;

  const o = data.batch_overview;

  return (
    <div className="space-y-10 max-w-6xl mx-auto pb-12">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b border-black/[0.06] pb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#1d1d1f]">Director dashboard</h1>
          <p className="text-sm text-[#86868b] mt-1">
            Updated {new Date(data.generated_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
          </p>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          <button
            type="button"
            onClick={() => downloadCsv('/api/director/export?type=scores', 'student_scores.csv')}
            className="text-[#0a84ff] hover:underline"
          >
            Export scores
          </button>
          <button
            type="button"
            onClick={() => downloadCsv('/api/director/export?type=risk', 'at_risk.csv')}
            className="text-[#0a84ff] hover:underline"
          >
            Export at-risk
          </button>
        </div>
      </header>

      <section className="grid grid-cols-3 gap-px rounded-xl overflow-hidden bg-black/[0.06] ring-1 ring-black/[0.06]">
        <div className="bg-white px-5 py-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-[#86868b]">Students</p>
          <p className="text-2xl font-semibold tabular-nums text-[#1d1d1f] mt-1">{o.total_students}</p>
        </div>
        <div className="bg-white px-5 py-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-[#86868b]">Eligible</p>
          <p className="text-2xl font-semibold tabular-nums text-[#1d1d1f] mt-1">{o.eligible_students}</p>
        </div>
        <div className="bg-white px-5 py-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-[#86868b]">At risk</p>
          <p className="text-2xl font-semibold tabular-nums text-[#1d1d1f] mt-1">
            {o.readiness_distribution.at_risk_lt_60}
          </p>
        </div>
      </section>

      <div className="grid lg:grid-cols-2 gap-8">
        <Card title="Readiness distribution" subtitle="Cohort by placement readiness band" className="!p-6 !shadow-none ring-1 ring-black/[0.06]">
          <div className="h-[280px]">
            {!hasPieData ? (
              <p className="text-sm text-[#86868b] h-full flex items-center justify-center">No distribution data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={68}
                    outerRadius={96}
                    paddingAngle={2}
                    strokeWidth={0}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={C.pie[i % C.pie.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: 8,
                      border: '1px solid rgba(0,0,0,0.06)',
                      fontSize: 12,
                      boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                    }}
                    formatter={(value, name) => [`${value} students`, name]}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value) => <span className="text-xs text-[#3a3a3c]">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card title="Specialization scores" subtitle="Average aptitude, interview, and psych by track" className="!p-6 !shadow-none ring-1 ring-black/[0.06]">
          <div className="h-[280px]">
            {!hasSpecData ? (
              <p className="text-sm text-[#86868b] h-full flex items-center justify-center">No specialization data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={specBars} margin={chartMargin}>
                  <CartesianGrid stroke={C.grid} vertical={false} strokeDasharray="0" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: C.muted, fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: C.grid }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: C.muted, fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={36}
                  />
                  <Tooltip
                    content={<ExecutiveTooltip />}
                    cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                    formatter={(value) => <span className="text-[#3a3a3c]">{value}</span>}
                  />
                  <Bar dataKey="apt" name="Aptitude" fill={C.bar.apt} radius={[3, 3, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="int" name="Interview" fill={C.bar.int} radius={[3, 3, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="psych" name="Psych" fill={C.bar.psych} radius={[3, 3, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      <Card title="Weekly improvement" subtitle="Cohort averages from submitted attempts (recent weeks)" className="!p-6 !shadow-none ring-1 ring-black/[0.06]">
        <div className="h-[280px]">
          {!hasTrendData ? (
            <p className="text-sm text-[#86868b] h-full flex items-center justify-center">No weekly activity yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.weekly_trend} margin={{ top: 12, right: 16, left: 0, bottom: 4 }}>
                <CartesianGrid stroke={C.grid} vertical={false} strokeDasharray="4 4" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: C.muted, fontSize: 10 }}
                  tickLine={false}
                  axisLine={{ stroke: C.grid }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: C.muted, fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={36}
                />
                <Tooltip content={<ExecutiveTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
                  formatter={(value) => <span className="text-[#3a3a3c]">{value}</span>}
                />
                <Line
                  type="monotone"
                  dataKey="avg_aptitude_attempt_pct"
                  name="Aptitude (avg %)"
                  stroke={C.line.apt}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="avg_psych_fit"
                  name="Psych fit (avg %)"
                  stroke={C.line.psych}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      <Card title="At-risk students" subtitle="Final readiness below 60%" className="!p-6 !shadow-none ring-1 ring-black/[0.06] overflow-hidden">
        <div className="overflow-x-auto -mx-1">
          {data.at_risk.length === 0 ? (
            <p className="text-sm text-[#86868b] py-8">No students below the readiness threshold.</p>
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b border-black/[0.06]">
                  <th className="py-3 pr-4 font-medium text-[#86868b] text-xs uppercase tracking-wide">Name</th>
                  <th className="py-3 pr-4 font-medium text-[#86868b] text-xs uppercase tracking-wide">Readiness</th>
                  <th className="py-3 pr-4 font-medium text-[#86868b] text-xs uppercase tracking-wide">Risk</th>
                  <th className="py-3 font-medium text-[#86868b] text-xs uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.at_risk.map((r) => (
                  <tr key={r.user_id} className="border-b border-black/[0.04] last:border-0">
                    <td className="py-3 pr-4 text-[#1d1d1f] font-medium">{r.name}</td>
                    <td className="py-3 pr-4 tabular-nums text-[#3a3a3c]">{r.placement_readiness}</td>
                    <td className="py-3 pr-4">
                      {(r.risk_tags || []).length ? (
                        <span className="inline-flex flex-wrap gap-1.5">
                          {r.risk_tags.map((t) => (
                            <span
                              key={t}
                              className="rounded-md bg-[#f5f5f7] px-2 py-0.5 text-xs text-[#3a3a3c]"
                            >
                              {t}
                            </span>
                          ))}
                        </span>
                      ) : (
                        <span className="text-[#aeaeb2]">—</span>
                      )}
                    </td>
                    <td className="py-3 text-[#6e6e73] max-w-md">
                      <ul className="space-y-1">
                        {(r.recommendations || []).map((line, i) => (
                          <li key={i} className="leading-snug">
                            {line}
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}
