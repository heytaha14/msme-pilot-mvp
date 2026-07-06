import {
  ArrowUpRight,
  Bot,
  CheckCircle2,
  FileScan,
  Sparkles,
} from 'lucide-react';
import Badge from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import SectionHeader from '../../components/common/SectionHeader.jsx';
import StatCard from '../../components/common/StatCard.jsx';
import {
  aiFocusItems,
  businessMetrics,
  businessProfile,
  customerDues,
  dashboardStats,
  healthBreakdown,
  lowStockProducts,
  notifications,
  recentInvoices,
  weeklySales,
} from '../../data/mockData.js';
import { getPaymentStatusBadge } from '../../utils/formatters.js';

const maxWeeklySale = Math.max(...weeklySales.map((item) => item.value));

const statusVariant = {
  success: 'success',
  warning: 'warning',
  danger: 'danger',
  info: 'info',
};

function ScoreRing() {
  return (
    <div
      className="grid h-36 w-36 place-items-center rounded-full"
      style={{
        background:
          'conic-gradient(#4f46e5 0deg 302deg, rgba(226, 232, 240, 0.95) 302deg 360deg)',
      }}
    >
      <div className="grid h-28 w-28 place-items-center rounded-full bg-white shadow-sm">
        <div className="text-center">
          <p className="text-3xl font-black tracking-tight text-slate-950">84</p>
          <p className="text-xs font-bold text-slate-400">/100</p>
        </div>
      </div>
    </div>
  );
}

function ProgressBar({ item }) {
  const colorClass =
    item.status === 'success'
      ? 'bg-emerald-500'
      : item.status === 'info'
        ? 'bg-cyan-500'
        : 'bg-amber-500';

  return (
    <div>
      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="font-semibold text-slate-600">{item.label}</span>
        <span className="font-black text-slate-950">{item.value}%</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-slate-100">
        <div
          className={`h-2 rounded-full ${colorClass}`}
          style={{ width: `${item.value}%` }}
        />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <Card className="overflow-hidden" padding="lg" variant="glass">
        <div className="grid gap-6 xl:grid-cols-[1fr_0.42fr] xl:items-stretch">
          <div>
            <p className="text-sm font-semibold text-indigo-600">
              Good evening, {businessProfile.userName}
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              {businessProfile.businessName}
            </h2>
            <p className="mt-3 text-lg font-bold text-slate-800">
              Your business is healthy. Cash flow needs attention.
            </p>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
              Sales are rising, but {businessMetrics.lowStock} items are below
              minimum stock and {businessMetrics.pendingPayments} is pending
              from customers.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button>
                <FileScan className="h-4 w-4" />
                Scan Invoice
              </Button>
              <Button variant="secondary">
                View Business Health
                <ArrowUpRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="rounded-3xl border border-indigo-100 bg-indigo-50/80 p-5">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-indigo-600 text-white">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-black text-slate-950">AI priority</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Ahmed Traders has the highest pending amount. Follow up this week.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {dashboardStats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <SectionHeader
            subtitle="Inventory, sales, and payment recovery combined."
            title="Business Health"
          />
          <div className="mt-6 grid gap-6 sm:grid-cols-[auto_1fr] sm:items-center">
            <div className="flex justify-center">
              <ScoreRing />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-2xl font-black text-slate-950">
                  {businessMetrics.businessHealthScore}
                </h3>
                <Badge variant="success">Strong</Badge>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                Recover ₹12,000 and restock Rice to move your score near 90.
              </p>
              <div className="mt-5 space-y-4">
                {healthBreakdown.map((item) => (
                  <ProgressBar item={item} key={item.label} />
                ))}
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <SectionHeader
            action={
              <div className="inline-flex rounded-full bg-slate-100 p-1">
                {['Week', 'Month', 'Year'].map((period) => (
                  <button
                    className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                      period === 'Week'
                        ? 'bg-white text-slate-950 shadow-sm'
                        : 'text-slate-500 hover:text-slate-950'
                    }`}
                    key={period}
                    type="button"
                  >
                    {period}
                  </button>
                ))}
              </div>
            }
            subtitle="Sunday is currently the strongest sales day."
            title="Weekly Sales"
          />
          <div className="mt-8 flex h-56 items-end gap-2 sm:gap-3">
            {weeklySales.map((item) => (
              <div className="flex flex-1 flex-col items-center gap-3" key={item.day}>
                <div className="flex h-40 w-full items-end rounded-full bg-slate-100 p-1">
                  <div
                    className={`w-full rounded-full ${
                      item.day === 'Sun'
                        ? 'bg-gradient-to-t from-indigo-600 to-cyan-400'
                        : 'bg-slate-300'
                    }`}
                    style={{
                      height: `${Math.max(18, (item.value / maxWeeklySale) * 100)}%`,
                    }}
                  />
                </div>
                <span className="text-xs font-bold text-slate-500">{item.day}</span>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.88fr_1.12fr]">
        <Card>
          <SectionHeader
            action={
              <Button size="sm">
                <Bot className="h-4 w-4" />
                Ask AI Assistant
              </Button>
            }
            subtitle="The most useful actions for today."
            title="AI Command"
          />
          <div className="mt-5 space-y-3">
            {aiFocusItems.map((item) => (
              <div
                className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4"
                key={item.task}
              >
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-indigo-600" />
                  <p className="font-bold text-slate-950">{item.task}</p>
                </div>
                <Badge variant={statusVariant[item.tone]}>{item.status}</Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <SectionHeader
            action={
              <Button size="sm" variant="ghost">
                Open Inventory
                <ArrowUpRight className="h-4 w-4" />
              </Button>
            }
            subtitle="Products below minimum stock levels."
            title="Low Stock Products"
          />
          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-100">
            {lowStockProducts.map((product) => (
              <div
                className="grid grid-cols-[1fr_auto] gap-4 border-b border-slate-100 bg-white p-4 last:border-b-0 sm:grid-cols-[1fr_0.8fr_0.8fr_auto]"
                key={product.id}
              >
                <div>
                  <p className="font-bold text-slate-950">{product.name}</p>
                  <p className="text-sm text-slate-500">{product.category}</p>
                </div>
                <div className="hidden text-sm sm:block">
                  <p className="font-semibold text-slate-950">
                    Stock {product.stock} / Min {product.minimum}
                  </p>
                  <p className="text-slate-500">Current threshold</p>
                </div>
                <div className="hidden sm:block">
                  <div className="h-2 rounded-full bg-slate-100">
                    <div
                      className={`h-2 rounded-full ${
                        product.status === 'Critical' ? 'bg-rose-500' : 'bg-amber-500'
                      }`}
                      style={{
                        width: `${Math.max(12, (product.stock / product.minimum) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
                <Badge variant={product.status === 'Critical' ? 'danger' : 'warning'}>
                  {product.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <Card>
          <SectionHeader
            subtitle="Latest invoices captured in the demo workspace."
            title="Recent Invoices / Sales"
          />
          <div className="mt-5 space-y-3">
            {recentInvoices.map((invoice) => (
              <div
                className="grid gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-[0.8fr_1fr_auto_auto] sm:items-center"
                key={invoice.id}
              >
                <p className="font-black text-slate-950">{invoice.id}</p>
                <p className="text-sm font-semibold text-slate-600">
                  {invoice.customer}
                </p>
                <p className="font-black text-slate-950">{invoice.amount}</p>
                <Badge variant={getPaymentStatusBadge(invoice.status)}>
                  {invoice.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card className="overflow-hidden bg-gradient-to-br from-slate-950 to-indigo-950 text-white">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/10 text-cyan-200">
              <FileScan className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-black">Upload invoice. Update stock.</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                OCR reads invoice text and AI extracts supplier, item, GST,
                quantity, and total amount.
              </p>
            </div>
          </div>
          <div className="mt-6 rounded-3xl border border-white/10 bg-white/10 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-cyan-100">
              Example
            </p>
            <p className="mt-2 font-black text-white">
              ABC Traders | Rice | 10 Bags | GST 18%
            </p>
          </div>
          <Button className="mt-6" variant="secondary">
            Scan New Invoice
          </Button>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <SectionHeader
            subtitle="Customers with purchase history and outstanding dues."
            title="Top Customer Dues"
          />
          <div className="mt-5 overflow-hidden rounded-3xl border border-slate-100">
            <div className="hidden grid-cols-[1fr_1fr_0.9fr_0.8fr_0.6fr] bg-slate-50 px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-400 md:grid">
              <span>Customer</span>
              <span>Phone</span>
              <span>Purchases</span>
              <span>Pending</span>
              <span>Status</span>
            </div>
            {customerDues.map((customer) => (
              <div
                className="grid gap-3 border-t border-slate-100 bg-white p-5 md:grid-cols-[1fr_1fr_0.9fr_0.8fr_0.6fr] md:items-center"
                key={customer.id}
              >
                <p className="font-bold text-slate-950">{customer.name}</p>
                <p className="text-sm text-slate-500">{customer.phone}</p>
                <p className="text-sm font-semibold text-slate-700">
                  {customer.purchases} purchases
                </p>
                <p
                  className={`text-sm font-black ${
                    customer.status === 'Paid' ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {customer.pending} pending
                </p>
                <Badge variant={getPaymentStatusBadge(customer.status)}>
                  {customer.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <SectionHeader
            subtitle="Important operational updates."
            title="Notifications"
          />
          <div className="mt-5 space-y-3">
            {notifications.map((item) => (
              <div className="flex gap-3 rounded-2xl bg-slate-50 p-4" key={item.title}>
                <div
                  className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                    item.status === 'success'
                      ? 'bg-emerald-500'
                      : item.status === 'info'
                        ? 'bg-cyan-500'
                        : item.status === 'danger'
                          ? 'bg-rose-500'
                          : 'bg-amber-500'
                  }`}
                />
                <div>
                  <p className="font-bold text-slate-950">{item.title}</p>
                  <p className="mt-1 text-sm leading-5 text-slate-500">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}
