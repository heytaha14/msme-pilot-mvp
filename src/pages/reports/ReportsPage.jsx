import {
  Activity,
  BarChart3,
  Boxes,
  Clock,
  Download,
  Eye,
  FileBarChart,
  IndianRupee,
  LineChart,
  Loader2,
  PackageCheck,
  ReceiptText,
  RefreshCw,
  SearchX,
  Send,
  Sparkles,
  Trash2,
  TrendingUp,
  Truck,
  Users,
  WalletCards,
  WandSparkles,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import Badge from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import SectionHeader from '../../components/common/SectionHeader.jsx';
import StatCard from '../../components/common/StatCard.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  deleteGeneratedReport,
  getReportStats,
  listGeneratedReports,
  loadReportData,
  saveGeneratedReport,
} from '../../services/reportService.js';
import {
  buildReportInsights,
  buildReportMetrics,
  buildReportPayload,
  buildReportTable,
  buildSalesTrend,
} from '../../utils/reportCalculations.js';
import {
  formatCurrency,
  formatDate,
  getMetricStatusBadge,
  getReportStatusBadge,
} from '../../utils/formatters.js';

const reportTypes = [
  'Business Overview',
  'Sales Report',
  'Profit Report',
  'Inventory Report',
  'Customer Report',
  'Supplier Report',
  'Payment Report',
  'GST Summary',
];
const dateRanges = ['Today', 'This Week', 'This Month', 'This Year', 'All Time'];
const reportFormats = ['Summary', 'Detailed', 'AI Explanation'];

const categoryIcons = {
  'Sales Report': BarChart3,
  'Profit Report': TrendingUp,
  'Inventory Report': Boxes,
  'Customer Report': Users,
  'Supplier Report': Truck,
  'Payment Report': WalletCards,
  'GST Summary': ReceiptText,
  'Business Overview': Activity,
};

function SelectControl({ children, label, name, onChange, value }) {
  return (
    <label className="block" htmlFor={name}>
      <span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>
      <select
        className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition-all focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
        id={name}
        name={name}
        onChange={onChange}
        value={value}
      >
        {children}
      </select>
    </label>
  );
}

function FeedbackBanner({ message, onDismiss, tone = 'info' }) {
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
      <button className="font-black" onClick={onDismiss} type="button">Dismiss</button>
    </div>
  );
}

function LoadingState() {
  return (
    <Card className="text-center" padding="lg">
      <Loader2 className="mx-auto h-10 w-10 animate-spin text-indigo-500" />
      <p className="mt-4 font-black text-slate-950">Loading real report data...</p>
      <p className="mt-2 text-sm text-slate-500">
        Reading your Appwrite products, sales, customers, suppliers, and invoices.
      </p>
    </Card>
  );
}

function EmptyDataState({ onRefresh }) {
  return (
    <Card className="text-center" padding="lg">
      <FileBarChart className="mx-auto h-12 w-12 text-indigo-500" />
      <h2 className="mt-5 text-2xl font-black text-slate-950">Reports need business data</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
        Add products, customers, sales, and invoices to generate meaningful reports from real Appwrite data.
      </p>
      <Button className="mt-6" onClick={onRefresh} variant="secondary">
        <RefreshCw className="h-4 w-4" />
        Refresh Reports
      </Button>
    </Card>
  );
}

function ReportControls({ controls, isGenerating, onApply, onChange }) {
  return (
    <Card>
      <div className="grid gap-4 lg:grid-cols-[1fr_0.8fr_0.8fr_auto] lg:items-end">
        <SelectControl label="Report type" name="reportType" onChange={onChange} value={controls.reportType}>
          {reportTypes.map((type) => <option key={type}>{type}</option>)}
        </SelectControl>
        <SelectControl label="Date range" name="dateRange" onChange={onChange} value={controls.dateRange}>
          {dateRanges.map((range) => <option key={range}>{range}</option>)}
        </SelectControl>
        <SelectControl label="Format" name="format" onChange={onChange} value={controls.format}>
          {reportFormats.map((format) => <option key={format}>{format}</option>)}
        </SelectControl>
        <Button className="w-full lg:w-auto" loading={isGenerating} onClick={onApply}>
          Apply Filters
        </Button>
      </div>
    </Card>
  );
}

function ReportCategoryGrid({ categories, selectedType, onSelect }) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {categories.map((category) => {
        const Icon = categoryIcons[category.type] || FileBarChart;
        const isActive = selectedType === category.type;

        return (
          <button
            className={clsx(
              'rounded-3xl text-left transition-all duration-200',
              isActive ? 'ring-2 ring-indigo-200 ring-offset-2 ring-offset-slate-50' : '',
            )}
            key={category.type}
            onClick={() => onSelect(category.type)}
            type="button"
          >
            <Card className={isActive ? 'border-indigo-200 bg-indigo-50/70' : ''} hover>
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-lg font-black text-slate-950">{category.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">{category.description}</p>
              <p className="mt-4 text-sm font-black text-indigo-600">{category.metric}</p>
            </Card>
          </button>
        );
      })}
    </section>
  );
}

function ReportChartVisual({ meta, trend }) {
  const maxSnapshotValue = Math.max(
    Number(meta?.gstCollected || 0),
    Number(meta?.gstPaid || 0),
    Number(meta?.pendingDues || 0),
    1,
  );

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_0.8fr]">
      <div className="rounded-3xl bg-slate-50 p-5">
        <div className="flex items-center justify-between">
          <p className="font-black text-slate-950">Sales trend</p>
          <Badge variant="info">Real sales</Badge>
        </div>
        <div className="mt-6 flex h-44 items-end gap-2">
          {trend.map((item) => (
            <div className="flex flex-1 flex-col items-center gap-2" key={item.label}>
              <div className="flex h-36 w-full items-end rounded-full bg-white p-1">
                <div
                  className="w-full rounded-full bg-gradient-to-t from-indigo-600 to-cyan-400"
                  style={{ height: `${item.percent}%` }}
                />
              </div>
              <span className="text-xs font-bold text-slate-400">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl bg-slate-50 p-5">
        <p className="font-black text-slate-950">Cash and GST snapshot</p>
        <div className="mt-5 space-y-4">
          {[
            ['GST Collected', meta?.gstCollected || 0, 'bg-emerald-500'],
            ['GST Paid', meta?.gstPaid || 0, 'bg-cyan-500'],
            ['Customer Dues', meta?.pendingDues || 0, 'bg-amber-500'],
          ].map(([label, value, color]) => {
            return (
              <div key={label}>
                <div className="flex justify-between gap-3 text-xs font-bold text-slate-500">
                  <span>{label}</span>
                  <span>{formatCurrency(value)}</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-white">
                  <div className={`h-2 rounded-full ${color}`} style={{ width: `${Math.max(6, (Number(value) / maxSnapshotValue) * 100)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ReportPreview({ controls, generatedAt, metrics, insights, reportData, trend }) {
  return (
    <Card padding="lg">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Badge variant="info">Ready</Badge>
          <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">
            {controls.reportType} - {controls.dateRange}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Generated {formatDate(generatedAt)} from real Appwrite records.
          </p>
        </div>
        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
          {controls.format}
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {metrics.map(([label, value]) => (
          <div className="rounded-2xl bg-slate-50 p-4" key={label}>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
            <p className="mt-2 text-lg font-black text-slate-950">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <ReportChartVisual meta={reportData} trend={trend} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_0.82fr]">
        <div className="rounded-3xl bg-indigo-50 p-5">
          <p className="text-sm font-black text-indigo-700">Deterministic report insight</p>
          <p className="mt-3 text-sm leading-7 text-slate-700">{insights.explanation}</p>
        </div>
        <div className="rounded-3xl bg-slate-50 p-5">
          <p className="text-sm font-black text-slate-950">Recommended actions</p>
          <div className="mt-3 space-y-2 text-sm text-slate-600">
            {insights.actions.map((action) => (
              <div className="flex gap-2" key={action}>
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
                <span>{action}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

function ReportMetricsTable({ reportType, rows }) {
  const columns = rows.length ? Object.keys(rows[0]) : ['Metric', 'Value'];

  return (
    <Card>
      <SectionHeader subtitle="Calculated from your Appwrite business records." title={`${reportType} Metrics`} />

      {rows.length ? (
        <>
          <div className="mt-5 hidden overflow-hidden rounded-3xl border border-slate-100 md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-separate border-spacing-0">
                <thead>
                  <tr className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-400">
                    {columns.map((column) => <th className="px-5 py-4" key={column}>{column}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, rowIndex) => (
                    <tr key={`${row.Metric || row.Invoice || row.Product || row.Customer || row.Supplier || row.Source || row.Type}-${rowIndex}`}>
                      {columns.map((column) => {
                        const value = row[column];
                        const isStatus = ['Status', 'Change'].includes(column);
                        return (
                          <td className="border-t border-slate-100 px-5 py-4" key={column}>
                            {isStatus && column === 'Status' ? (
                              <Badge variant={getMetricStatusBadge(String(value))}>{value}</Badge>
                            ) : (
                              <span className={column === columns[0] ? 'font-black text-slate-950' : 'text-sm font-semibold text-slate-600'}>
                                {value}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:hidden">
            {rows.map((row, index) => (
              <div className="rounded-2xl bg-slate-50 p-4" key={index}>
                <p className="font-black text-slate-950">{row[columns[0]]}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {columns.slice(1).map((column) => (
                    <Badge key={column} variant={column === 'Status' ? getMetricStatusBadge(String(row[column])) : 'neutral'}>
                      {column}: {row[column]}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="mt-5 rounded-3xl bg-slate-50 p-6 text-center">
          <SearchX className="mx-auto h-10 w-10 text-slate-400" />
          <p className="mt-3 font-black text-slate-950">No rows for this report yet</p>
          <p className="mt-1 text-sm text-slate-500">Add data in the related module and refresh reports.</p>
        </div>
      )}
    </Card>
  );
}

function ExportPanel({ onExport, successMessage }) {
  return (
    <Card>
      <SectionHeader subtitle="PDF, CSV, and share links are simulated locally for now." title="Export Report" />
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {['PDF', 'CSV', 'Share Link'].map((option) => (
          <div className="rounded-2xl bg-slate-50 p-4" key={option}>
            <p className="font-black text-slate-950">{option}</p>
            <p className="mt-1 text-sm text-slate-500">Demo export option</p>
          </div>
        ))}
      </div>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <Button onClick={onExport} rounded="2xl"><Download className="h-4 w-4" />Download PDF</Button>
        <Button onClick={onExport} rounded="2xl" variant="secondary">Export CSV</Button>
        <Button onClick={onExport} rounded="2xl" variant="secondary">Copy Share Link</Button>
      </div>
      {successMessage ? (
        <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          {successMessage}
        </p>
      ) : null}
    </Card>
  );
}

function RecentReportsTable({ deleteLoading, onDelete, onView, reports }) {
  if (!reports.length) {
    return (
      <Card className="text-center" padding="lg">
        <FileBarChart className="mx-auto h-12 w-12 text-indigo-500" />
        <h2 className="mt-5 text-2xl font-black text-slate-950">No generated reports yet</h2>
        <p className="mt-2 text-sm text-slate-500">Generate your first report to save report history.</p>
      </Card>
    );
  }

  return (
    <>
      <Card className="hidden overflow-hidden lg:block" padding="none">
        <table className="w-full border-separate border-spacing-0">
          <thead>
            <tr className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-400">
              <th className="px-5 py-4">Report Name</th>
              <th className="px-5 py-4">Type</th>
              <th className="px-5 py-4">Period</th>
              <th className="px-5 py-4">Generated Date</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => (
              <tr key={report.id}>
                <td className="border-t border-slate-100 px-5 py-4 font-black text-slate-950">{report.reportName}</td>
                <td className="border-t border-slate-100 px-5 py-4 text-sm font-semibold text-slate-600">{report.reportType}</td>
                <td className="border-t border-slate-100 px-5 py-4 text-sm font-semibold text-slate-600">{report.period}</td>
                <td className="border-t border-slate-100 px-5 py-4 text-sm text-slate-500">{formatDate(report.generatedDate)}</td>
                <td className="border-t border-slate-100 px-5 py-4"><Badge variant={getReportStatusBadge(report.status)}>{report.status}</Badge></td>
                <td className="border-t border-slate-100 px-5 py-4">
                  <div className="flex justify-end gap-2">
                    <Button onClick={() => onView(report)} size="sm" variant="secondary"><Eye className="h-4 w-4" />View</Button>
                    <Button size="sm" variant="secondary"><Download className="h-4 w-4" />Download</Button>
                    <Button loading={deleteLoading === report.id} onClick={() => onDelete(report)} size="sm" variant="danger"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="grid gap-4 lg:hidden">
        {reports.map((report) => (
          <Card hover key={report.id}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-black text-slate-950">{report.reportName}</p>
                <p className="mt-1 text-sm text-slate-500">{report.period}</p>
              </div>
              <Badge variant={getReportStatusBadge(report.status)}>{report.status}</Badge>
            </div>
            <p className="mt-4 text-sm font-semibold text-slate-600">Generated {formatDate(report.generatedDate)}</p>
            <div className="mt-5 grid grid-cols-3 gap-2">
              <Button onClick={() => onView(report)} size="sm" variant="secondary">View</Button>
              <Button size="sm" variant="secondary">Download</Button>
              <Button loading={deleteLoading === report.id} onClick={() => onDelete(report)} size="sm" variant="danger">Delete</Button>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}

export default function ReportsPage() {
  const { user } = useAuth();
  const [controls, setControls] = useState({
    reportType: 'Business Overview',
    dateRange: 'This Month',
    format: 'Summary',
  });
  const [reportData, setReportData] = useState(null);
  const [generatedAt, setGeneratedAt] = useState(new Date().toISOString());
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [recentReports, setRecentReports] = useState([]);
  const [deleteLoading, setDeleteLoading] = useState('');
  const [feedback, setFeedback] = useState({ message: '', tone: 'info' });
  const [exportMessage, setExportMessage] = useState('');

  const loadReports = useCallback(async () => {
    if (!user?.$id) return;

    setLoading(true);
    try {
      const data = await loadReportData(user.$id);
      let generatedReports = [];

      try {
        generatedReports = await listGeneratedReports(user.$id);
      } catch {
        data.warnings = [
          ...(data.warnings || []),
          'Generated report history could not be loaded.',
        ];
      }

      setReportData(data);
      setRecentReports(generatedReports);
      if (data.warnings?.length) {
        setFeedback({
          message: 'Some modules could not be loaded. Report may be incomplete.',
          tone: 'warning',
        });
      }
    } catch (error) {
      setFeedback({ message: error.message || 'Could not load report data.', tone: 'danger' });
    } finally {
      setLoading(false);
    }
  }, [user?.$id]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const stats = useMemo(() => getReportStats(reportData || {}), [reportData]);
  const currentPayload = useMemo(
    () => buildReportPayload(controls.reportType, reportData || {}, controls.dateRange),
    [controls.dateRange, controls.reportType, reportData],
  );
  const metrics = useMemo(
    () => buildReportMetrics(controls.reportType, reportData || {}, controls.dateRange),
    [controls.dateRange, controls.reportType, reportData],
  );
  const tableRows = useMemo(
    () => buildReportTable(controls.reportType, reportData || {}, controls.dateRange),
    [controls.dateRange, controls.reportType, reportData],
  );
  const insights = useMemo(
    () => buildReportInsights(controls.reportType, reportData || {}, controls.dateRange),
    [controls.dateRange, controls.reportType, reportData],
  );
  const trend = useMemo(
    () => buildSalesTrend(reportData || {}, controls.dateRange),
    [controls.dateRange, reportData],
  );
  const hasBusinessData = Boolean(
    reportData &&
      (
        reportData.products?.length ||
        reportData.customers?.length ||
        reportData.suppliers?.length ||
        reportData.sales?.length ||
        reportData.purchaseInvoices?.length
      ),
  );

  const categories = useMemo(
    () => [
      { type: 'Sales Report', title: 'Sales Report', description: 'Daily, weekly, and monthly sales performance.', metric: formatCurrency(currentPayload.insights.summary.revenue) },
      { type: 'Profit Report', title: 'Profit Report', description: 'Profit margin, cost, and net earnings.', metric: formatCurrency(currentPayload.insights.summary.profit) },
      { type: 'Inventory Report', title: 'Inventory Report', description: 'Stock levels, low stock, and inventory value.', metric: `${currentPayload.insights.summary.productCount} products` },
      { type: 'Customer Report', title: 'Customer Report', description: 'Customer growth, pending dues, and purchase history.', metric: `${currentPayload.insights.summary.customerCount} customers` },
      { type: 'Supplier Report', title: 'Supplier Report', description: 'Supplier dues, purchase value, and invoices.', metric: `${currentPayload.insights.summary.supplierCount} suppliers` },
      { type: 'Payment Report', title: 'Payment Report', description: 'Customer pending payments and supplier dues.', metric: formatCurrency(currentPayload.insights.summary.pendingCustomerDues) },
      { type: 'GST Summary', title: 'GST Summary', description: 'GST collected, GST paid, and taxable value.', metric: formatCurrency(currentPayload.insights.summary.netGst) },
      { type: 'Business Overview', title: 'Business Overview', description: 'Score breakdown and key recommendations.', metric: 'Real data view' },
    ],
    [currentPayload],
  );

  function updateControl(event) {
    const { name, value } = event.target;
    setControls((current) => ({ ...current, [name]: value }));
  }

  function selectReportType(reportType) {
    setControls((current) => ({ ...current, reportType }));
  }

  async function generateReport() {
    if (!user?.$id) return;

    setIsGenerating(true);
    setGeneratedAt(new Date().toISOString());
    try {
      const saved = await saveGeneratedReport(user.$id, currentPayload);
      setRecentReports((current) => [saved, ...current]);
      setFeedback({ message: 'Report generated from real business data.', tone: 'success' });
    } catch (error) {
      setFeedback({
        message: error.message || 'Report generated locally, but could not be saved.',
        tone: 'warning',
      });
    } finally {
      setIsGenerating(false);
    }
  }

  function generateAiSummary() {
    setIsAiGenerating(true);
    window.setTimeout(() => {
      setFeedback({
        message: 'Deterministic summary refreshed locally. Real AI report summaries come later.',
        tone: 'info',
      });
      setIsAiGenerating(false);
    }, 800);
  }

  function simulateExport(message = 'Export simulated. Real PDF/CSV generation will be added later.') {
    setExportMessage(message);
    window.setTimeout(() => setExportMessage(''), 2600);
  }

  async function deleteReport(report) {
    if (!user?.$id) return;
    setDeleteLoading(report.id);
    try {
      await deleteGeneratedReport(user.$id, report.id);
      setRecentReports((current) => current.filter((item) => item.id !== report.id));
      setFeedback({ message: 'Generated report deleted.', tone: 'success' });
    } catch (error) {
      setFeedback({ message: error.message || 'Could not delete generated report.', tone: 'danger' });
    } finally {
      setDeleteLoading('');
    }
  }

  function viewSavedReport(report) {
    const summary = report.summary;
    if (summary?.selectedReportType) {
      setControls((current) => ({
        ...current,
        reportType: summary.selectedReportType,
        dateRange: summary.dateRange || current.dateRange,
      }));
      setFeedback({ message: 'Saved report loaded into preview.', tone: 'success' });
    }
  }

  const summaryCards = [
    { title: 'Monthly Revenue', value: formatCurrency(stats.monthlyRevenue), trend: 'From sales records', status: 'success', icon: LineChart },
    { title: 'Monthly Profit', value: formatCurrency(stats.monthlyProfit), trend: 'Excludes cancelled sales', status: 'success', icon: IndianRupee },
    { title: 'Inventory Value', value: formatCurrency(stats.inventoryValue), trend: `${reportData?.products?.length || 0} products tracked`, status: 'info', icon: PackageCheck },
    { title: 'Pending Payments', value: formatCurrency(stats.pendingPayments), trend: 'Customer dues', status: 'warning', icon: Clock },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        action={
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={loadReports} variant="secondary"><RefreshCw className="h-4 w-4" />Refresh</Button>
            <Button onClick={() => simulateExport()} variant="secondary"><Download className="h-4 w-4" />Export PDF</Button>
            <Button loading={isGenerating} onClick={generateReport}><FileBarChart className="h-4 w-4" />Generate Report</Button>
          </div>
        }
        subtitle="Analyze sales, profit, inventory, customers, suppliers, and business performance."
        title="Reports"
      />

      <FeedbackBanner
        message={feedback.message}
        onDismiss={() => setFeedback({ message: '', tone: 'info' })}
        tone={feedback.tone}
      />

      {loading ? <LoadingState /> : null}

      {!loading && !hasBusinessData ? <EmptyDataState onRefresh={loadReports} /> : null}

      {!loading ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card) => <StatCard key={card.title} {...card} />)}
          </section>

          <Card className="overflow-hidden bg-gradient-to-br from-slate-950 to-indigo-950 text-white">
            <div className="grid gap-5 lg:grid-cols-[auto_1fr_auto] lg:items-center">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-cyan-200">
                <WandSparkles className="h-6 w-6" />
              </div>
              <div>
                <Badge className="bg-white/10 text-cyan-100 ring-white/15" variant="neutral">
                  Deterministic Report Insight
                </Badge>
                <p className="mt-3 max-w-3xl text-lg font-bold leading-7 text-white">
                  {insights.explanation}
                </p>
              </div>
              <Button loading={isAiGenerating} onClick={generateAiSummary} variant="secondary">
                <Sparkles className="h-4 w-4" />
                Generate AI Summary
              </Button>
            </div>
          </Card>

          {reportData?.warnings?.length ? (
            <Card className="border-amber-100 bg-amber-50">
              <p className="font-black text-amber-800">Partial data warning</p>
              <p className="mt-2 text-sm font-semibold text-amber-700">
                {reportData.warnings.join(' ')}
              </p>
            </Card>
          ) : null}

          <ReportControls controls={controls} isGenerating={isGenerating} onApply={generateReport} onChange={updateControl} />
          <ReportCategoryGrid categories={categories} onSelect={selectReportType} selectedType={controls.reportType} />
          <ReportPreview
            controls={controls}
            generatedAt={generatedAt}
            insights={insights}
            metrics={metrics}
            reportData={currentPayload.insights.summary}
            trend={trend}
          />
          <ReportMetricsTable reportType={controls.reportType} rows={tableRows} />
          <ExportPanel onExport={() => simulateExport()} successMessage={exportMessage} />

          <section className="space-y-4">
            <SectionHeader subtitle="Generated reports are saved in Appwrite with per-user permissions." title="Recent Generated Reports" />
            <RecentReportsTable
              deleteLoading={deleteLoading}
              onDelete={deleteReport}
              onView={viewSavedReport}
              reports={recentReports}
            />
          </section>

          <Card className="border-cyan-100 bg-cyan-50/70">
            <div className="flex gap-3">
              <ReceiptText className="mt-1 h-5 w-5 shrink-0 text-cyan-700" />
              <p className="text-sm font-semibold leading-6 text-cyan-800">
                GST Summary is a business estimate from sales and purchase invoice data, not a legal GST filing.
                Verify values before filing.
              </p>
            </div>
          </Card>
        </>
      ) : null}
    </div>
  );
}
