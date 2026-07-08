import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  Bot,
  CheckCircle2,
  FileScan,
  Loader2,
  PackageSearch,
  Sparkles,
  WalletCards,
} from 'lucide-react';
import Badge from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import SectionHeader from '../../components/common/SectionHeader.jsx';
import StatCard from '../../components/common/StatCard.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { listCustomers } from '../../services/customerService.js';
import { listNotifications } from '../../services/notificationService.js';
import { listProducts } from '../../services/productService.js';
import { listPurchaseInvoices } from '../../services/purchaseInvoiceService.js';
import { getSalesStats, listSales } from '../../services/salesService.js';
import { listSuppliers } from '../../services/supplierService.js';
import {
  calculateOverallBusinessHealth,
  calculatePendingPaymentsScore,
  calculateSalesPerformance,
  calculateInventoryHealth,
} from '../../utils/businessHealthCalculations.js';
import {
  formatCurrency,
  getNotificationPriorityBadge,
  getPaymentStatusBadge,
  getStockBadgeVariant,
  getStockStatus,
} from '../../utils/formatters.js';

const emptyDashboardData = {
  products: [],
  customers: [],
  suppliers: [],
  sales: [],
  invoices: [],
  notifications: [],
};

const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function getWeeklySales(sales) {
  const totals = weekDays.map((day) => ({ day, value: 0 }));

  sales.forEach((sale) => {
    if (sale.paymentStatus === 'Cancelled') return;
    const parsed = new Date(sale.saleDate || sale.createdAt || sale.$createdAt);
    if (Number.isNaN(parsed.getTime())) return;
    const mondayIndex = (parsed.getDay() + 6) % 7;
    totals[mondayIndex].value += toNumber(sale.totalAmount);
  });

  return totals;
}

function ScoreRing({ score }) {
  const safeScore = Number.isFinite(score) ? score : 0;
  const degrees = Math.round((safeScore / 100) * 360);

  return (
    <div
      className="grid h-36 w-36 place-items-center rounded-full"
      style={{
        background: `conic-gradient(#4f46e5 0deg ${degrees}deg, rgba(226, 232, 240, 0.95) ${degrees}deg 360deg)`,
      }}
    >
      <div className="grid h-28 w-28 place-items-center rounded-full bg-white shadow-sm">
        <div className="text-center">
          <p className="text-3xl font-black tracking-tight text-slate-950">{safeScore || '--'}</p>
          <p className="text-xs font-bold text-slate-400">/100</p>
        </div>
      </div>
    </div>
  );
}

function ProgressBar({ label, value, tone = 'success' }) {
  const colorClass = tone === 'success'
    ? 'bg-emerald-500'
    : tone === 'info'
      ? 'bg-cyan-500'
      : 'bg-amber-500';

  return (
    <div>
      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="font-semibold text-slate-600">{label}</span>
        <span className="font-black text-slate-950">{value}%</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-slate-100">
        <div className={`h-2 rounded-full ${colorClass}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function EmptyMiniState({ action, text }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center">
      <PackageSearch className="mx-auto h-6 w-6 text-slate-400" />
      <p className="mt-2 text-sm font-semibold text-slate-500">{text}</p>
      {action}
    </div>
  );
}

export default function DashboardPage() {
  const { profile, user } = useAuth();
  const [data, setData] = useState(emptyDashboardData);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const ownerName = profile?.ownerName || user?.name || user?.email || 'Owner';
  const businessName = profile?.businessName || 'MSME Pilot';
  const firstName = ownerName.split(' ')[0] || ownerName;

  const loadDashboard = useCallback(async () => {
    if (!user?.$id) return;

    setLoading(true);
    setErrorMessage('');

    const tasks = await Promise.allSettled([
      listProducts(user.$id, { limit: 200 }),
      listCustomers(user.$id, { limit: 200 }),
      listSuppliers(user.$id, { limit: 200 }),
      listSales(user.$id, { limit: 100 }),
      listPurchaseInvoices(user.$id, { limit: 20 }),
      listNotifications(user.$id, { limit: 6 }),
    ]);

    const [products, customers, suppliers, sales, invoices, notifications] = tasks.map((task) =>
      task.status === 'fulfilled' ? task.value : [],
    );
    const failedCount = tasks.filter((task) => task.status === 'rejected').length;

    setData({ products, customers, suppliers, sales, invoices, notifications });
    setErrorMessage(
      failedCount
        ? 'Some dashboard widgets could not load. Check Appwrite collection permissions if this keeps happening.'
        : '',
    );
    setLoading(false);
  }, [user?.$id]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const dashboard = useMemo(() => {
    const salesStats = getSalesStats(data.sales);
    const pendingPayments = data.customers.reduce(
      (total, customer) => total + toNumber(customer.pendingAmount),
      0,
    );
    const supplierDue = data.suppliers.reduce(
      (total, supplier) => total + toNumber(supplier.paymentDue),
      0,
    );
    const lowStockProducts = data.products.filter((product) => {
      const status = getStockStatus(product);
      return status === 'Low Stock' || status === 'Out of Stock';
    });
    const inventoryHealthResult = calculateInventoryHealth(data.products);
    const salesPerformanceResult = calculateSalesPerformance(data.sales);
    const paymentRecoveryResult = calculatePendingPaymentsScore(data.customers, data.sales);
    const inventoryHealth = toNumber(inventoryHealthResult.score);
    const salesPerformance = toNumber(salesPerformanceResult.score);
    const paymentRecovery = toNumber(paymentRecoveryResult.score);
    const healthScore = data.products.length || data.sales.length || data.customers.length
      ? calculateOverallBusinessHealth({
          inventoryHealth,
          salesPerformance,
          pendingPaymentsScore: paymentRecovery,
          customerGrowth: 75,
          profitMargin: 75,
        })
      : 0;
    const weeklySales = getWeeklySales(data.sales);
    const highestPendingCustomer = [...data.customers]
      .filter((customer) => toNumber(customer.pendingAmount) > 0)
      .sort((a, b) => toNumber(b.pendingAmount) - toNumber(a.pendingAmount))[0];

    return {
      salesStats,
      pendingPayments,
      supplierDue,
      lowStockProducts,
      inventoryHealth,
      inventoryHealthResult,
      salesPerformance,
      salesPerformanceResult,
      paymentRecovery,
      paymentRecoveryResult,
      healthScore,
      weeklySales,
      highestPendingCustomer,
    };
  }, [data]);

  const maxWeeklySale = Math.max(1, ...dashboard.weeklySales.map((item) => item.value));
  const todaysSalesCount = data.sales.filter((sale) => String(sale.saleDate).slice(0, 10) === todayIsoDate()).length;

  return (
    <div className="space-y-6">
      {errorMessage ? (
        <Card className="border-amber-100 bg-amber-50/90" padding="sm">
          <p className="text-sm font-semibold text-amber-700">{errorMessage}</p>
        </Card>
      ) : null}

      <Card className="overflow-hidden" padding="lg" variant="glass">
        <div className="grid gap-6 xl:grid-cols-[1fr_0.42fr] xl:items-stretch">
          <div>
            <p className="text-sm font-semibold text-indigo-600">Good evening, {firstName}</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              {businessName}
            </h2>
            <p className="mt-3 text-lg font-bold text-slate-800">
              {loading ? 'Preparing your business workspace.' : 'Your live business dashboard is ready.'}
            </p>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
              {data.products.length || data.customers.length || data.sales.length
                ? `${dashboard.lowStockProducts.length} products need attention and ${formatCurrency(dashboard.pendingPayments)} is pending from customers.`
                : 'Start by adding products, customers, suppliers, or scanning your first invoice.'}
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button as={Link} to="/invoice-scanner">
                <FileScan className="h-4 w-4" />
                Scan Invoice
              </Button>
              <Button as={Link} to="/business-health" variant="secondary">
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
                  {dashboard.highestPendingCustomer
                    ? `${dashboard.highestPendingCustomer.name} has the highest pending amount. Follow up this week.`
                    : dashboard.lowStockProducts.length
                      ? `${dashboard.lowStockProducts[0].productName} needs stock attention.`
                      : 'No urgent action yet. Add live data to unlock AI priorities.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {loading ? (
        <Card className="grid min-h-[220px] place-items-center text-center" padding="lg">
          <div>
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-indigo-600" />
            <p className="mt-3 text-sm font-semibold text-slate-500">Loading live dashboard data...</p>
          </div>
        </Card>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={FileScan} status="success" title="Today's Sales" trend={`${todaysSalesCount} sales today`} value={formatCurrency(dashboard.salesStats.todaySales)} />
        <StatCard icon={ArrowUpRight} status="info" title="Monthly Revenue" trend="From Appwrite sales" value={formatCurrency(dashboard.salesStats.monthlyRevenue)} />
        <StatCard icon={WalletCards} status="warning" title="Pending Dues" trend="Customer dues" value={formatCurrency(dashboard.pendingPayments)} />
        <StatCard icon={PackageSearch} status="neutral" title="Total Products" trend={`${dashboard.lowStockProducts.length} low stock`} value={data.products.length} />
        <StatCard icon={Sparkles} status="warning" title="Low Stock" trend="Needs reorder planning" value={dashboard.lowStockProducts.length} />
        <StatCard icon={Bot} status="success" title="Customers" trend="Real CRM records" value={data.customers.length} />
        <StatCard icon={WalletCards} status="warning" title="Supplier Due" trend="Vendor payments" value={formatCurrency(dashboard.supplierDue)} />
        <StatCard icon={CheckCircle2} status={dashboard.healthScore >= 80 ? 'success' : 'info'} title="Business Health" trend="Calculated from live data" value={dashboard.healthScore ? `${dashboard.healthScore}/100` : 'Setup'} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <SectionHeader subtitle="Inventory, sales, and payment recovery combined." title="Business Health" />
          <div className="mt-6 grid gap-6 sm:grid-cols-[auto_1fr] sm:items-center">
            <div className="flex justify-center">
              <ScoreRing score={dashboard.healthScore} />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-2xl font-black text-slate-950">
                  {dashboard.healthScore ? `${dashboard.healthScore}/100` : 'Not calculated'}
                </h3>
                <Badge variant={dashboard.healthScore >= 80 ? 'success' : 'info'}>
                  {dashboard.healthScore >= 80 ? 'Strong' : 'Setup'}
                </Badge>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                {dashboard.healthScore
                  ? 'Improve pending payments and stock coverage to lift this score.'
                  : 'Add inventory, sales, and customer data to calculate your first score.'}
              </p>
              <div className="mt-5 space-y-4">
                <ProgressBar label="Inventory Health" value={dashboard.inventoryHealth} />
                <ProgressBar label="Sales Performance" tone="info" value={dashboard.salesPerformance} />
                <ProgressBar label="Payment Recovery" tone="warning" value={dashboard.paymentRecovery} />
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <SectionHeader subtitle="Live sales grouped by weekday." title="Weekly Sales" />
          <div className="mt-8 flex h-56 items-end gap-2 sm:gap-3">
            {dashboard.weeklySales.map((item) => (
              <div className="flex flex-1 flex-col items-center gap-3" key={item.day}>
                <div className="flex h-40 w-full items-end rounded-full bg-slate-100 p-1">
                  <div
                    className="w-full rounded-full bg-gradient-to-t from-indigo-600 to-cyan-400"
                    style={{ height: `${Math.max(8, (item.value / maxWeeklySale) * 100)}%` }}
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
          <SectionHeader action={<Button as={Link} size="sm" to="/ai-assistant"><Bot className="h-4 w-4" />Ask AI Assistant</Button>} subtitle="Suggested from your current records." title="AI Command" />
          <div className="mt-5 space-y-3">
            {[
              dashboard.lowStockProducts.length ? `Restock ${dashboard.lowStockProducts[0].productName}` : 'Add products',
              dashboard.pendingPayments ? 'Collect pending customer payments' : 'Keep customer dues clear',
              data.invoices.some((invoice) => invoice.status === 'Pending Review') ? 'Review pending invoices' : 'Scan next supplier invoice',
            ].map((task) => (
              <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4" key={task}>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-indigo-600" />
                  <p className="font-bold text-slate-950">{task}</p>
                </div>
                <Badge variant="info">Live</Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <SectionHeader action={<Button as={Link} size="sm" to="/inventory" variant="ghost">Open Inventory<ArrowUpRight className="h-4 w-4" /></Button>} subtitle="Products below minimum stock levels." title="Low Stock Products" />
          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-100">
            {dashboard.lowStockProducts.length ? (
              dashboard.lowStockProducts.slice(0, 5).map((product) => (
                <div className="grid grid-cols-[1fr_auto] gap-4 border-b border-slate-100 bg-white p-4 last:border-b-0 sm:grid-cols-[1fr_0.8fr_0.8fr_auto]" key={product.id}>
                  <div>
                    <p className="font-bold text-slate-950">{product.productName}</p>
                    <p className="text-sm text-slate-500">{product.category}</p>
                  </div>
                  <div className="hidden text-sm sm:block">
                    <p className="font-semibold text-slate-950">Stock {product.currentStock} / Min {product.minimumStock}</p>
                    <p className="text-slate-500">Current threshold</p>
                  </div>
                  <div className="hidden sm:block">
                    <div className="h-2 rounded-full bg-slate-100">
                      <div className="h-2 rounded-full bg-amber-500" style={{ width: `${Math.max(12, (toNumber(product.currentStock) / Math.max(1, toNumber(product.minimumStock))) * 100)}%` }} />
                    </div>
                  </div>
                  <Badge variant={getStockBadgeVariant(getStockStatus(product))}>{getStockStatus(product)}</Badge>
                </div>
              ))
            ) : (
              <EmptyMiniState text="No low-stock products yet." />
            )}
          </div>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <Card>
          <SectionHeader subtitle="Latest purchase invoices from Appwrite." title="Recent Invoices" />
          <div className="mt-5 space-y-3">
            {data.invoices.length ? (
              data.invoices.slice(0, 4).map((invoice) => (
                <div className="grid gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-[0.8fr_1fr_auto_auto] sm:items-center" key={invoice.id}>
                  <p className="font-black text-slate-950">{invoice.invoiceNumber}</p>
                  <p className="text-sm font-semibold text-slate-600">{invoice.supplierName}</p>
                  <p className="font-black text-slate-950">{formatCurrency(invoice.totalAmount)}</p>
                  <Badge variant={getPaymentStatusBadge(invoice.status)}>{invoice.status}</Badge>
                </div>
              ))
            ) : (
              <EmptyMiniState action={<Button as={Link} className="mt-4" size="sm" to="/invoice-scanner">Scan Invoice</Button>} text="No invoices scanned yet." />
            )}
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
                OCR and AI run through secured Appwrite Functions. Real inventory updates happen after invoice approval.
              </p>
            </div>
          </div>
          <Button as={Link} className="mt-6" to="/invoice-scanner" variant="secondary">
            Scan New Invoice
          </Button>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <SectionHeader subtitle="Customers with purchase history and outstanding dues." title="Top Customer Dues" />
          <div className="mt-5 overflow-hidden rounded-3xl border border-slate-100">
            {data.customers.length ? (
              [...data.customers]
                .sort((a, b) => toNumber(b.pendingAmount) - toNumber(a.pendingAmount))
                .slice(0, 5)
                .map((customer) => (
                  <div className="grid gap-3 border-t border-slate-100 bg-white p-5 md:grid-cols-[1fr_1fr_0.8fr_0.6fr] md:items-center" key={customer.id}>
                    <p className="font-bold text-slate-950">{customer.name}</p>
                    <p className="text-sm text-slate-500">{customer.phone}</p>
                    <p className={toNumber(customer.pendingAmount) ? 'text-sm font-black text-rose-600' : 'text-sm font-black text-emerald-600'}>{formatCurrency(customer.pendingAmount)}</p>
                    <Badge variant={getPaymentStatusBadge(customer.paymentStatus)}>{customer.paymentStatus}</Badge>
                  </div>
                ))
            ) : (
              <div className="p-5">
                <EmptyMiniState action={<Button as={Link} className="mt-4" size="sm" to="/customers">Add Customer</Button>} text="No customers added yet." />
              </div>
            )}
          </div>
        </Card>

        <Card>
          <SectionHeader subtitle="Important operational updates." title="Notifications" />
          <div className="mt-5 space-y-3">
            {data.notifications.length ? (
              data.notifications.slice(0, 5).map((item) => (
                <div className="flex gap-3 rounded-2xl bg-slate-50 p-4" key={item.id}>
                  <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-indigo-500" />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-slate-950">{item.title}</p>
                      <Badge variant={getNotificationPriorityBadge(item.priority)}>{item.priority}</Badge>
                    </div>
                    <p className="mt-1 text-sm leading-5 text-slate-500">{item.message}</p>
                  </div>
                </div>
              ))
            ) : (
              <EmptyMiniState text="No notifications yet." />
            )}
          </div>
        </Card>
      </section>
    </div>
  );
}
