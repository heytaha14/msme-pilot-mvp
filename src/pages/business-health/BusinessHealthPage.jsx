import {
  Activity,
  Boxes,
  CheckCircle2,
  Circle,
  Clock,
  Download,
  IndianRupee,
  ListChecks,
  Loader2,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Users,
  WalletCards,
  WandSparkles,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Badge from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import SectionHeader from '../../components/common/SectionHeader.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  calculateBusinessHealth,
  calculateProjectedScore,
  listBusinessHealthSnapshots,
  saveBusinessHealthSnapshot,
} from '../../services/businessHealthService.js';
import {
  formatCurrency,
  formatDate,
  formatPercentage,
  getHealthStatusBadge,
} from '../../utils/formatters.js';

const breakdownIcons = {
  'Inventory Health': Boxes,
  'Sales Performance': TrendingUp,
  'Pending Payments': WalletCards,
  'Customer Growth': Users,
  'Profit Margin': IndianRupee,
};

function healthMessage(status) {
  if (status === 'Excellent') return 'Your business is performing very well.';
  if (status === 'Strong') return 'Your business is healthy, with a few areas to improve.';
  if (status === 'Good') return 'Your business is stable but needs attention in key areas.';
  if (status === 'Needs Attention') return 'Your business needs focused action to improve health.';
  return 'Your business has serious issues needing urgent action.';
}

function FeedbackBanner({ message, onDismiss, tone = 'success' }) {
  if (!message) return null;

  const styles = {
    success: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    warning: 'border-amber-100 bg-amber-50 text-amber-700',
    danger: 'border-rose-100 bg-rose-50 text-rose-700',
    info: 'border-indigo-100 bg-indigo-50 text-indigo-700',
  };

  return (
    <div className={`flex items-start justify-between gap-4 rounded-3xl border p-4 text-sm font-semibold ${styles[tone] || styles.info}`}>
      <p>{message}</p>
      <button className="font-black" onClick={onDismiss} type="button">
        Dismiss
      </button>
    </div>
  );
}

function LoadingState() {
  return (
    <Card className="text-center" padding="lg">
      <Loader2 className="mx-auto h-10 w-10 animate-spin text-indigo-500" />
      <p className="mt-4 font-black text-slate-950">Calculating business health...</p>
      <p className="mt-2 text-sm text-slate-500">
        Reading inventory, sales, customers, suppliers, invoices, and snapshots from Appwrite.
      </p>
    </Card>
  );
}

function ScoreRing({ score }) {
  const angle = Math.max(0, Math.min(100, score)) * 3.6;

  return (
    <div
      className="grid h-44 w-44 place-items-center rounded-full"
      style={{
        background: `conic-gradient(#10b981 0deg ${angle * 0.46}deg, #06b6d4 ${angle * 0.46}deg ${angle * 0.76}deg, #4f46e5 ${angle * 0.76}deg ${angle}deg, #e2e8f0 ${angle}deg 360deg)`,
      }}
    >
      <div className="grid h-32 w-32 place-items-center rounded-full bg-white shadow-soft">
        <div className="text-center">
          <p className="text-4xl font-black tracking-tight text-slate-950">{score}</p>
          <p className="text-xs font-black text-slate-400">/100</p>
        </div>
      </div>
    </div>
  );
}

function HealthScoreHero({ businessName, health, isLoading }) {
  return (
    <Card className="overflow-hidden" padding="lg" variant="glass">
      <div className="grid gap-7 xl:grid-cols-[auto_1fr_0.8fr] xl:items-center">
        <div className="flex justify-center">
          <ScoreRing score={health.score} />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant={getHealthStatusBadge(health.status)}>{health.status}</Badge>
            <Badge variant={health.trend.direction === 'down' ? 'warning' : 'info'}>
              {health.trend.label}
            </Badge>
            {isLoading ? <Badge variant="warning">Recalculating</Badge> : null}
          </div>
          <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            Business Health Score: {health.score}/100
          </h2>
          <p className="mt-3 text-lg font-bold text-slate-800">{healthMessage(health.status)}</p>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Business: {businessName} · Last updated: {formatDate(health.calculatedAt)}
          </p>
        </div>
        <div className="rounded-3xl bg-indigo-50 p-5">
          <div className="flex gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" />
            <p className="text-sm leading-6 text-slate-700">
              {health.recommendations[0] || 'Add business data to unlock improvement recommendations.'}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}

function HealthBreakdownGrid({ breakdown }) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      {breakdown.map((item) => {
        const Icon = breakdownIcons[item.title] || Activity;
        return (
          <Card hover key={item.key}>
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

function HealthRecommendationCard({ health, isLoading, onGenerate }) {
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
            To improve your score from {health.score} to 90+, focus on the highest impact actions below.
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {health.recommendations.map((action) => (
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

function RiskOpportunityCards({ opportunities, risks }) {
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
          {risks.map((risk) => (
            <div className="rounded-2xl bg-rose-50/70 p-4" key={risk.title || risk}>
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold text-rose-700">{risk.title || risk}</p>
                <Badge variant={getHealthStatusBadge(risk.severity || 'Risk')}>{risk.severity || 'Risk'}</Badge>
              </div>
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
          {opportunities.map((item) => (
            <div className="rounded-2xl bg-emerald-50/70 p-4 text-sm font-semibold text-emerald-700" key={item}>
              {item}
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}

function HealthScoreChart({ currentScore, snapshots }) {
  const points = useMemo(() => {
    if (!snapshots.length) {
      return [{ label: 'Now', score: currentScore }];
    }

    return [...snapshots]
      .slice(0, 7)
      .reverse()
      .map((snapshot) => ({
        label: formatDate(snapshot.createdAt).replace(' 2026', ''),
        score: snapshot.score,
      }));
  }, [currentScore, snapshots]);
  const bestScore = Math.max(...points.map((point) => point.score), currentScore);
  const latestScore = points[points.length - 1]?.score || currentScore;

  return (
    <Card>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-950">Score history</h2>
          <p className="mt-1 text-sm text-slate-500">
            Latest score {latestScore} · Best score {bestScore}
          </p>
          {!snapshots.length ? (
            <p className="mt-2 text-xs font-semibold text-slate-400">
              Recalculate score over time to build history.
            </p>
          ) : null}
        </div>
        <Badge variant={latestScore >= 75 ? 'success' : 'warning'}>{points.length} point{points.length === 1 ? '' : 's'}</Badge>
      </div>
      <div className="mt-8 flex h-52 items-end gap-3">
        {points.map((item, index) => (
          <div className="flex flex-1 flex-col items-center gap-3" key={`${item.label}-${index}`}>
            <div className="flex h-40 w-full items-end rounded-full bg-slate-100 p-1">
              <div
                className="w-full rounded-full bg-gradient-to-t from-indigo-600 to-cyan-400"
                style={{ height: `${Math.max(8, item.score)}%` }}
              />
            </div>
            <span className="text-center text-xs font-bold text-slate-500">{item.label}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function HealthMetricsTable({ rows }) {
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
            {rows.map((row) => (
              <tr key={row[0]}>
                <td className="border-t border-slate-100 px-5 py-4 font-black text-slate-950">{row[0]}</td>
                <td className="border-t border-slate-100 px-5 py-4 text-sm font-semibold text-slate-600">{row[1]}</td>
                <td className="border-t border-slate-100 px-5 py-4 text-sm text-slate-500">{row[2]}</td>
                <td className="border-t border-slate-100 px-5 py-4">
                  <Badge variant={getHealthStatusBadge(row[3])}>{row[3]}</Badge>
                </td>
                <td className="border-t border-slate-100 px-5 py-4 text-sm font-bold text-slate-600">{row[4]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-5 grid gap-3 md:hidden">
        {rows.map((row) => (
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

function HealthActionChecklist({ tasks }) {
  const [completed, setCompleted] = useState([]);
  const completedCount = completed.length;
  const totalTasks = tasks.length || 1;

  function toggleTask(taskId) {
    setCompleted((current) =>
      current.includes(taskId)
        ? current.filter((item) => item !== taskId)
        : [...current, taskId],
    );
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <ListChecks className="h-5 w-5 text-indigo-600" />
            <h2 className="text-xl font-black text-slate-950">Recommended Action Checklist</h2>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            {completedCount} of {tasks.length} actions completed
          </p>
        </div>
        <Badge variant="info">{Math.round((completedCount / totalTasks) * 100)}%</Badge>
      </div>
      <div className="mt-5 h-2 rounded-full bg-slate-100">
        <div
          className="h-2 rounded-full bg-gradient-to-r from-indigo-600 to-cyan-400"
          style={{ width: `${(completedCount / totalTasks) * 100}%` }}
        />
      </div>
      <div className="mt-5 space-y-3">
        {tasks.map((task) => {
          const isDone = completed.includes(task.id);
          return (
            <button
              className="flex w-full items-start gap-3 rounded-2xl bg-slate-50 p-4 text-left transition hover:bg-slate-100"
              key={task.id}
              onClick={() => toggleTask(task.id)}
              type="button"
            >
              {isDone ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              ) : (
                <Circle className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
              )}
              <span>
                <span className={isDone ? 'block text-sm font-semibold text-slate-400 line-through' : 'block text-sm font-semibold text-slate-700'}>
                  {task.title}
                </span>
                <span className="mt-1 block text-xs text-slate-500">
                  {task.description} · +{task.impactPoints} score potential
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function HealthSimulationCard({ baseScore, simulationActions }) {
  const [actions, setActions] = useState(simulationActions);

  useEffect(() => {
    setActions(simulationActions);
  }, [simulationActions]);

  const projectedScore = calculateProjectedScore(baseScore, actions);

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
      <p className="mt-2 text-sm text-slate-500">Toggle actions to see projected score impact.</p>
      <div className="mt-5 space-y-3">
        {Object.entries(actions).map(([key, action]) => (
          <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4" htmlFor={key} key={key}>
            <span>
              <span className="block text-sm font-semibold text-slate-700">{action.label}</span>
              <span className="mt-1 block text-xs font-semibold text-slate-400">+{action.value} possible points</span>
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
        <p className="mt-2 text-4xl font-black text-slate-950">{projectedScore}/100</p>
      </div>
    </Card>
  );
}

function HealthEventsTimeline({ events }) {
  return (
    <Card>
      <h2 className="text-xl font-black text-slate-950">Recent health events</h2>
      <div className="mt-5 space-y-3">
        {events.map((event) => (
          <div className="flex gap-3 rounded-2xl bg-slate-50 p-4" key={`${event.title}-${event.date}`}>
            <div className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${event.status === 'Positive' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            <div className="flex-1">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="font-bold text-slate-950">{event.title}</p>
                <Badge variant={getHealthStatusBadge(event.status)}>{event.status}</Badge>
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
  const { profile, user } = useAuth();
  const [health, setHealth] = useState(null);
  const [snapshots, setSnapshots] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [feedback, setFeedback] = useState({ message: '', tone: 'success' });

  const loadHealth = useCallback(async () => {
    if (!user?.$id) return;

    setIsLoading(true);
    try {
      const calculatedHealth = await calculateBusinessHealth(user.$id);
      let snapshotHistory = [];

      try {
        snapshotHistory = await listBusinessHealthSnapshots(user.$id, { limit: 30 });
      } catch {
        calculatedHealth.warnings = [
          ...(calculatedHealth.warnings || []),
          'Business health snapshot history could not be loaded.',
        ];
      }

      setHealth(calculatedHealth);
      setSnapshots(snapshotHistory);

      if (calculatedHealth.warnings?.length) {
        setFeedback({
          message: 'Some business data could not be loaded. Score may be incomplete.',
          tone: 'warning',
        });
      }
    } catch (error) {
      setFeedback({
        message: error.message || 'Could not calculate business health.',
        tone: 'danger',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user?.$id]);

  useEffect(() => {
    loadHealth();
  }, [loadHealth]);

  async function recalculateScore() {
    if (!user?.$id) return;

    setIsRecalculating(true);
    try {
      const calculatedHealth = await calculateBusinessHealth(user.$id);
      const savedSnapshot = await saveBusinessHealthSnapshot(user.$id, calculatedHealth);
      setHealth(calculatedHealth);
      setSnapshots((current) => [savedSnapshot, ...current].slice(0, 30));
      setFeedback({
        message: 'Business health score recalculated and snapshot saved.',
        tone: 'success',
      });
    } catch (error) {
      setFeedback({
        message: error.message || 'Could not save health snapshot.',
        tone: 'danger',
      });
    } finally {
      setIsRecalculating(false);
    }
  }

  function exportReport() {
    setFeedback({
      message: 'Business health report export simulated. Real PDF export will be added later.',
      tone: 'success',
    });
  }

  function generateActionPlan() {
    setIsGeneratingPlan(true);
    window.setTimeout(() => {
      setIsGeneratingPlan(false);
      setFeedback({
        message: 'Action plan refreshed from deterministic business health rules.',
        tone: 'info',
      });
    }, 800);
  }

  const hasAnyData = useMemo(() => {
    if (!health) return false;
    return Boolean(
      health.metrics.totalProducts ||
        health.metrics.totalCustomers ||
        health.metrics.monthlyRevenue ||
        health.metrics.supplierDues,
    );
  }, [health]);

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
        subtitle="Understand your business score, risks, strengths, and deterministic improvement actions."
        title="Business Health"
      />

      <FeedbackBanner
        message={feedback.message}
        onDismiss={() => setFeedback({ message: '', tone: 'success' })}
        tone={feedback.tone}
      />

      {isLoading ? <LoadingState /> : null}

      {!isLoading && health ? (
        <>
          {!hasAnyData ? (
            <Card className="border-indigo-100 bg-indigo-50/70">
              <div className="flex gap-3">
                <Activity className="mt-1 h-5 w-5 shrink-0 text-indigo-700" />
                <div>
                  <p className="font-black text-indigo-900">Setup-focused score</p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-indigo-800">
                    Add products, customers, suppliers, sales, and invoices to make the score more meaningful.
                  </p>
                </div>
              </div>
            </Card>
          ) : null}

          {!snapshots.length ? (
            <Card className="border-cyan-100 bg-cyan-50/70">
              <p className="text-sm font-semibold text-cyan-800">
                Save your first health snapshot by recalculating. Future snapshots will build the history chart.
              </p>
            </Card>
          ) : null}

          {health.warnings?.length ? (
            <Card className="border-amber-100 bg-amber-50">
              <p className="font-black text-amber-800">Partial data warning</p>
              <p className="mt-2 text-sm font-semibold text-amber-700">
                {health.warnings.join(' ')}
              </p>
            </Card>
          ) : null}

          <HealthScoreHero
            businessName={profile?.businessName || 'MSME Pilot'}
            health={health}
            isLoading={isRecalculating}
          />
          <HealthBreakdownGrid breakdown={health.breakdown} />
          <HealthRecommendationCard
            health={health}
            isLoading={isGeneratingPlan}
            onGenerate={generateActionPlan}
          />
          <RiskOpportunityCards opportunities={health.opportunities} risks={health.risks} />
          <HealthScoreChart currentScore={health.score} snapshots={snapshots} />
          <HealthMetricsTable rows={health.metricsTable} />

          <section className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
            <HealthActionChecklist tasks={health.actionChecklist} />
            <HealthSimulationCard
              baseScore={health.score}
              simulationActions={health.simulationActions}
            />
          </section>

          <div className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
            <HealthEventsTimeline events={health.events} />
            <Card>
              <h2 className="text-xl font-black text-slate-950">Real data snapshot</h2>
              <div className="mt-5 grid gap-3">
                {[
                  ['Monthly Revenue', formatCurrency(health.metrics.monthlyRevenue)],
                  ['Previous Month', formatCurrency(health.metrics.previousMonthlyRevenue)],
                  ['Today Sales', formatCurrency(health.metrics.todaySales)],
                  ['Inventory Value', formatCurrency(health.metrics.inventoryValue)],
                  ['Customer Dues', formatCurrency(health.metrics.customerPendingAmount)],
                  ['Supplier Dues', formatCurrency(health.metrics.supplierDues)],
                  ['Profit Margin', formatPercentage(health.metrics.profitMarginPercentage)],
                ].map(([label, value]) => (
                  <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3" key={label}>
                    <span className="text-sm font-semibold text-slate-500">{label}</span>
                    <span className="text-sm font-black text-slate-950">{value}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
