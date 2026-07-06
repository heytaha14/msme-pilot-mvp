import {
  Activity,
  Boxes,
  CheckCircle2,
  Circle,
  Clock,
  Download,
  Gauge,
  IndianRupee,
  ListChecks,
  PackageCheck,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Users,
  WalletCards,
  WandSparkles,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import Badge from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import SectionHeader from '../../components/common/SectionHeader.jsx';
import {
  businessHealth,
  businessProfile,
  healthActionChecklist,
  healthEvents,
  healthMetrics,
  healthOpportunities,
  healthRecommendations,
  healthRisks,
  healthScoreBreakdown,
  healthScoreHistory,
} from '../../data/mockData.js';
import {
  calculateProjectedHealthScore,
  getHealthStatusBadge,
} from '../../utils/formatters.js';

const breakdownIcons = {
  'Inventory Health': Boxes,
  'Sales Performance': TrendingUp,
  'Pending Payments': WalletCards,
  'Customer Growth': Users,
  'Profit Margin': IndianRupee,
};

const simulationActions = {
  recoverPayments: {
    label: 'Recover pending payments',
    value: 4,
    enabled: true,
  },
  restockProducts: {
    label: 'Restock low stock products',
    value: 2,
    enabled: true,
  },
  approveInvoices: {
    label: 'Approve pending invoices',
    value: 1,
    enabled: true,
  },
};

function ScoreRing({ score }) {
  return (
    <div
      className="grid h-44 w-44 place-items-center rounded-full"
      style={{
        background:
          'conic-gradient(#10b981 0deg 140deg, #06b6d4 140deg 230deg, #4f46e5 230deg 302deg, #e2e8f0 302deg 360deg)',
      }}
    >
      <div className="grid h-32 w-32 place-items-center rounded-full bg-white shadow-soft">
        <div className="text-center">
          <p className="text-4xl font-black tracking-tight text-slate-950">
            {score}
          </p>
          <p className="text-xs font-black text-slate-400">/100</p>
        </div>
      </div>
    </div>
  );
}

function HealthScoreHero({ isLoading }) {
  return (
    <Card className="overflow-hidden" padding="lg" variant="glass">
      <div className="grid gap-7 xl:grid-cols-[auto_1fr_0.8fr] xl:items-center">
        <div className="flex justify-center">
          <ScoreRing score={businessHealth.score} />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant={getHealthStatusBadge(businessHealth.status)}>
              {businessHealth.status}
            </Badge>
            <Badge variant="info">{businessHealth.trend}</Badge>
            {isLoading ? <Badge variant="warning">Recalculating</Badge> : null}
          </div>
          <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            Business Health Score: {businessHealth.score}/100
          </h2>
          <p className="mt-3 text-lg font-bold text-slate-800">
            {businessHealth.message}
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Business: {businessProfile.businessName} · Last updated:{' '}
            {businessHealth.lastUpdated}
          </p>
        </div>
        <div className="rounded-3xl bg-indigo-50 p-5">
          <div className="flex gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" />
            <p className="text-sm leading-6 text-slate-700">
              {businessHealth.aiSummary}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}

function HealthBreakdownGrid() {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      {healthScoreBreakdown.map((item) => {
        const Icon = breakdownIcons[item.title] || Activity;
        return (
          <Card hover key={item.title}>
            <div className="flex items-start justify-between gap-4">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
                <Icon className="h-5 w-5" />
              </div>
              <Badge variant={getHealthStatusBadge(item.status)}>{item.status}</Badge>
            </div>
            <h3 className="mt-5 text-lg font-black text-slate-950">{item.title}</h3>
            <div className="mt-3 flex items-end justify-between gap-4">
              <p className="text-3xl font-black text-slate-950">{item.score}/100</p>
              <p className="text-sm font-bold text-slate-400">Weight {item.weight}%</p>
            </div>
            <div className="mt-4 h-2 rounded-full bg-slate-100">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-indigo-600 to-cyan-400"
                style={{ width: `${item.score}%` }}
              />
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-500">{item.insight}</p>
          </Card>
        );
      })}
    </section>
  );
}

function HealthRecommendationCard({ isLoading, onGenerate }) {
  return (
    <Card className="overflow-hidden bg-gradient-to-br from-slate-950 to-indigo-950 text-white">
      <div className="grid gap-5 lg:grid-cols-[auto_1fr_auto] lg:items-start">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-cyan-200">
          <WandSparkles className="h-6 w-6" />
        </div>
        <div>
          <Badge className="bg-white/10 text-cyan-100 ring-white/15" variant="neutral">
            AI Improvement Plan
          </Badge>
          <p className="mt-3 max-w-3xl text-lg font-bold leading-7 text-white">
            To improve your score from 84 to 90+, focus on payment recovery and
            fast-moving inventory.
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {healthRecommendations.map((action) => (
              <div className="rounded-2xl bg-white/10 p-3 text-sm text-slate-200" key={action}>
                {action}
              </div>
            ))}
          </div>
        </div>
        <Button loading={isLoading} onClick={onGenerate} variant="secondary">
          Generate Action Plan
        </Button>
      </div>
    </Card>
  );
}

function RiskOpportunityCards() {
  return (
    <section className="grid gap-6 lg:grid-cols-2">
      <Card>
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-rose-50 text-rose-600">
            <Clock className="h-5 w-5" />
          </div>
          <h2 className="text-xl font-black text-slate-950">Business Risks</h2>
        </div>
        <div className="mt-5 space-y-3">
          {healthRisks.map((risk) => (
            <div className="rounded-2xl bg-rose-50/70 p-4 text-sm font-semibold text-rose-700" key={risk}>
              {risk}
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
            <TrendingUp className="h-5 w-5" />
          </div>
          <h2 className="text-xl font-black text-slate-950">Growth Opportunities</h2>
        </div>
        <div className="mt-5 space-y-3">
          {healthOpportunities.map((item) => (
            <div className="rounded-2xl bg-emerald-50/70 p-4 text-sm font-semibold text-emerald-700" key={item}>
              {item}
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}

function HealthScoreChart() {
  return (
    <Card>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-950">Score history</h2>
          <p className="mt-1 text-sm text-slate-500">
            Current score 84 · Weekly change +5 · Best day Sunday
          </p>
        </div>
        <Badge variant="success">+5 this week</Badge>
      </div>
      <div className="mt-8 flex h-52 items-end gap-3">
        {healthScoreHistory.map((item) => (
          <div className="flex flex-1 flex-col items-center gap-3" key={item.day}>
            <div className="flex h-40 w-full items-end rounded-full bg-slate-100 p-1">
              <div
                className="w-full rounded-full bg-gradient-to-t from-indigo-600 to-cyan-400"
                style={{ height: `${item.score}%` }}
              />
            </div>
            <span className="text-xs font-bold text-slate-500">{item.day}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function HealthMetricsTable() {
  return (
    <Card>
      <h2 className="text-xl font-black text-slate-950">Health metrics</h2>
      <div className="mt-5 hidden overflow-hidden rounded-3xl border border-slate-100 md:block">
        <table className="w-full border-separate border-spacing-0">
          <thead>
            <tr className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-400">
              <th className="px-5 py-4">Metric</th>
              <th className="px-5 py-4">Current Value</th>
              <th className="px-5 py-4">Target</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">Impact</th>
            </tr>
          </thead>
          <tbody>
            {healthMetrics.map((row) => (
              <tr key={row[0]}>
                <td className="border-t border-slate-100 px-5 py-4 font-black text-slate-950">
                  {row[0]}
                </td>
                <td className="border-t border-slate-100 px-5 py-4 text-sm font-semibold text-slate-600">
                  {row[1]}
                </td>
                <td className="border-t border-slate-100 px-5 py-4 text-sm text-slate-500">
                  {row[2]}
                </td>
                <td className="border-t border-slate-100 px-5 py-4">
                  <Badge variant={getHealthStatusBadge(row[3])}>{row[3]}</Badge>
                </td>
                <td className="border-t border-slate-100 px-5 py-4 text-sm font-bold text-slate-600">
                  {row[4]}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-5 grid gap-3 md:hidden">
        {healthMetrics.map((row) => (
          <div className="rounded-2xl bg-slate-50 p-4" key={row[0]}>
            <p className="font-black text-slate-950">{row[0]}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge>{row[1]}</Badge>
              <Badge>{row[2]}</Badge>
              <Badge variant={getHealthStatusBadge(row[3])}>{row[3]}</Badge>
              <Badge variant="info">{row[4]} impact</Badge>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function HealthActionChecklist() {
  const [completed, setCompleted] = useState([0, 1]);
  const completedCount = completed.length;

  function toggleTask(index) {
    setCompleted((current) =>
      current.includes(index)
        ? current.filter((item) => item !== index)
        : [...current, index],
    );
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <ListChecks className="h-5 w-5 text-indigo-600" />
            <h2 className="text-xl font-black text-slate-950">
              Recommended Action Checklist
            </h2>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            {completedCount} of {healthActionChecklist.length} actions completed
          </p>
        </div>
        <Badge variant="info">
          {Math.round((completedCount / healthActionChecklist.length) * 100)}%
        </Badge>
      </div>
      <div className="mt-5 h-2 rounded-full bg-slate-100">
        <div
          className="h-2 rounded-full bg-gradient-to-r from-indigo-600 to-cyan-400"
          style={{ width: `${(completedCount / healthActionChecklist.length) * 100}%` }}
        />
      </div>
      <div className="mt-5 space-y-3">
        {healthActionChecklist.map((task, index) => {
          const isDone = completed.includes(index);
          return (
            <button
              className="flex w-full items-center gap-3 rounded-2xl bg-slate-50 p-4 text-left transition hover:bg-slate-100"
              key={task}
              onClick={() => toggleTask(index)}
              type="button"
            >
              {isDone ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
              ) : (
                <Circle className="h-5 w-5 shrink-0 text-slate-400" />
              )}
              <span className={isDone ? 'text-sm font-semibold text-slate-400 line-through' : 'text-sm font-semibold text-slate-700'}>
                {task}
              </span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function HealthSimulationCard() {
  const [actions, setActions] = useState(simulationActions);
  const projectedScore = calculateProjectedHealthScore(businessHealth.score, actions);

  function toggleAction(key) {
    setActions((current) => ({
      ...current,
      [key]: {
        ...current[key],
        enabled: !current[key].enabled,
      },
    }));
  }

  return (
    <Card>
      <h2 className="text-xl font-black text-slate-950">What improves my score?</h2>
      <p className="mt-2 text-sm text-slate-500">
        Toggle actions to see projected score impact.
      </p>
      <div className="mt-5 space-y-3">
        {Object.entries(actions).map(([key, action]) => (
          <label
            className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4"
            htmlFor={key}
            key={key}
          >
            <span className="text-sm font-semibold text-slate-700">
              {action.label}
            </span>
            <input
              checked={action.enabled}
              className="h-5 w-5 accent-indigo-600"
              id={key}
              onChange={() => toggleAction(key)}
              type="checkbox"
            />
          </label>
        ))}
      </div>
      <div className="mt-6 rounded-3xl bg-indigo-50 p-5 text-center">
        <p className="text-sm font-bold text-indigo-700">Projected Score</p>
        <p className="mt-2 text-4xl font-black text-slate-950">
          {projectedScore}/100
        </p>
      </div>
    </Card>
  );
}

function HealthEventsTimeline() {
  return (
    <Card>
      <h2 className="text-xl font-black text-slate-950">Recent health events</h2>
      <div className="mt-5 space-y-3">
        {healthEvents.map((event) => (
          <div className="flex gap-3 rounded-2xl bg-slate-50 p-4" key={event.title}>
            <div
              className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                event.status === 'Positive' ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
            <div className="flex-1">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="font-bold text-slate-950">{event.title}</p>
                <Badge variant={getHealthStatusBadge(event.status)}>
                  {event.status}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-slate-500">{event.date}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function BusinessHealthPage() {
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [message, setMessage] = useState('');

  function recalculateScore() {
    setIsRecalculating(true);
    window.setTimeout(() => {
      setIsRecalculating(false);
      setMessage('Business health score recalculated locally.');
      window.setTimeout(() => setMessage(''), 2400);
    }, 800);
  }

  function exportReport() {
    setMessage('Business health report export simulated.');
    window.setTimeout(() => setMessage(''), 2400);
  }

  function generateActionPlan() {
    setIsGeneratingPlan(true);
    window.setTimeout(() => {
      setIsGeneratingPlan(false);
      setMessage('AI action plan refreshed locally.');
      window.setTimeout(() => setMessage(''), 2400);
    }, 800);
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        action={
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={exportReport} variant="secondary">
              <Download className="h-4 w-4" />
              Export Health Report
            </Button>
            <Button loading={isRecalculating} onClick={recalculateScore}>
              <RefreshCw className="h-4 w-4" />
              Recalculate Score
            </Button>
          </div>
        }
        subtitle="Understand your business score, risks, strengths, and AI-powered improvement actions."
        title="Business Health"
      />

      {message ? (
        <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
          {message}
        </div>
      ) : null}

      <HealthScoreHero isLoading={isRecalculating} />
      <HealthBreakdownGrid />
      <HealthRecommendationCard
        isLoading={isGeneratingPlan}
        onGenerate={generateActionPlan}
      />
      <RiskOpportunityCards />
      <HealthScoreChart />
      <HealthMetricsTable />

      <section className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
        <HealthActionChecklist />
        <HealthSimulationCard />
      </section>

      <HealthEventsTimeline />

      {!healthMetrics.length ? (
        <Card className="text-center" padding="lg">
          <Activity className="mx-auto h-12 w-12 text-indigo-500" />
          <h2 className="mt-5 text-2xl font-black text-slate-950">
            No health data yet
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Add products, sales, customers, and invoices to generate your score.
          </p>
        </Card>
      ) : null}
    </div>
  );
}
