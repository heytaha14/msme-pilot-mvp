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
  PackageCheck,
  ReceiptText,
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
import { useMemo, useState } from 'react';
import clsx from 'clsx';
import Badge from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import SectionHeader from '../../components/common/SectionHeader.jsx';
import StatCard from '../../components/common/StatCard.jsx';
import {
  businessHealthBreakdown,
  businessProfile,
  recentReports as mockRecentReports,
  reportCategories,
  reportMetrics,
  reportSummary,
  reportTableData,
} from '../../data/mockData.js';
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
const dateRanges = ['Today', 'This Week', 'This Month', 'This Year', 'Custom Range'];
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

const salesTrend = [42, 54, 48, 66, 72, 84, 96];

function SelectControl({ children, label, name, onChange, value }) {
  return (
    <label className="block" htmlFor={name}>
      <span className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </span>
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

function ReportControls({ controls, isGenerating, onApply, onChange }) {
  return (
    <Card>
      <div className="grid gap-4 lg:grid-cols-[1fr_0.8fr_0.8fr_auto] lg:items-end">
        <SelectControl
          label="Report type"
          name="reportType"
          onChange={onChange}
          value={controls.reportType}
        >
          {reportTypes.map((type) => (
            <option key={type}>{type}</option>
          ))}
        </SelectControl>
        <SelectControl
          label="Date range"
          name="dateRange"
          onChange={onChange}
          value={controls.dateRange}
        >
          {dateRanges.map((range) => (
            <option key={range}>{range}</option>
          ))}
        </SelectControl>
        <SelectControl
          label="Format"
          name="format"
          onChange={onChange}
          value={controls.format}
        >
          {reportFormats.map((format) => (
            <option key={format}>{format}</option>
          ))}
        </SelectControl>
        <Button className="w-full lg:w-auto" loading={isGenerating} onClick={onApply}>
          Apply Filters
        </Button>
      </div>
    </Card>
  );
}

function ReportCategoryGrid({ selectedType, onSelect }) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {reportCategories.map((category) => {
        const Icon = categoryIcons[category.type] || FileBarChart;
        const isActive = selectedType === category.type;

        return (
          <button
            className={clsx(
              'rounded-3xl text-left transition-all duration-200',
              isActive
                ? 'ring-2 ring-indigo-200 ring-offset-2 ring-offset-slate-50'
                : '',
            )}
            key={category.title}
            onClick={() => onSelect(category.type)}
            type="button"
          >
            <Card
              className={isActive ? 'border-indigo-200 bg-indigo-50/70' : ''}
              hover
            >
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-lg font-black text-slate-950">
                {category.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {category.description}
              </p>
              <p className="mt-4 text-sm font-black text-indigo-600">
                {category.metric}
              </p>
            </Card>
          </button>
        );
      })}
    </section>
  );
}

function ReportChartVisual() {
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_0.8fr]">
      <div className="rounded-3xl bg-slate-50 p-5">
        <div className="flex items-center justify-between">
          <p className="font-black text-slate-950">Sales trend</p>
          <Badge variant="success">+14.2%</Badge>
        </div>
        <div className="mt-6 flex h-44 items-end gap-2">
          {salesTrend.map((value, index) => (
            <div className="flex flex-1 flex-col items-center gap-2" key={index}>
              <div className="flex h-36 w-full items-end rounded-full bg-white p-1">
                <div
                  className="w-full rounded-full bg-gradient-to-t from-indigo-600 to-cyan-400"
                  style={{ height: `${value}%` }}
                />
              </div>
              <span className="text-xs font-bold text-slate-400">
                D{index + 1}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl bg-slate-50 p-5">
        <p className="font-black text-slate-950">Business health</p>
        <div className="mt-5 flex items-center gap-5">
          <div
            className="grid h-28 w-28 shrink-0 place-items-center rounded-full"
            style={{
              background:
                'conic-gradient(#4f46e5 0deg 302deg, #e2e8f0 302deg 360deg)',
            }}
          >
            <div className="grid h-20 w-20 place-items-center rounded-full bg-white">
              <span className="text-2xl font-black text-slate-950">84</span>
            </div>
          </div>
          <div className="flex-1 space-y-3">
            {businessHealthBreakdown.map((item) => (
              <div key={item.label}>
                <div className="flex justify-between gap-3 text-xs font-bold text-slate-500">
                  <span>{item.label}</span>
                  <span>{item.value}%</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-white">
                  <div
                    className="h-2 rounded-full bg-emerald-500"
                    style={{ width: `${item.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReportPreview({ controls, generatedAt }) {
  return (
    <Card padding="lg">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Badge variant="info">Ready</Badge>
          <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">
            {controls.reportType} — {controls.dateRange}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Generated {formatDate(generatedAt)} for {businessProfile.businessName}.
          </p>
        </div>
        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
          {controls.format}
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {reportMetrics.map((metric) => (
          <div className="rounded-2xl bg-slate-50 p-4" key={metric.label}>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              {metric.label}
            </p>
            <p className="mt-2 text-lg font-black text-slate-950">{metric.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <ReportChartVisual />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_0.82fr]">
        <div className="rounded-3xl bg-indigo-50 p-5">
          <p className="text-sm font-black text-indigo-700">AI explanation</p>
          <p className="mt-3 text-sm leading-7 text-slate-700">
            Your monthly revenue is growing steadily. Inventory is mostly
            healthy, but Rice, Sugar, and Cooking Oil need restocking. Pending
            payments are the main reason your business health score is below 90.
          </p>
        </div>
        <div className="rounded-3xl bg-slate-50 p-5">
          <p className="text-sm font-black text-slate-950">Recommended actions</p>
          <div className="mt-3 space-y-2 text-sm text-slate-600">
            {[
              'Recover ₹12,000 from Ahmed Traders',
              'Restock Rice before Friday',
              'Review supplier payment due of ₹31,000',
              'Keep extra Sugar stock before weekend',
            ].map((action) => (
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

function ReportMetricsTable({ reportType }) {
  const rows = reportTableData[reportType] || reportTableData['Business Overview'];
  const isOverview = rows[0]?.length === 5;

  return (
    <Card>
      <SectionHeader
        subtitle="Report data changes locally based on selected report type."
        title={`${reportType} Metrics`}
      />

      <div className="mt-5 hidden overflow-hidden rounded-3xl border border-slate-100 md:block">
        <table className="w-full border-separate border-spacing-0">
          <thead>
            <tr className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-400">
              {isOverview ? (
                <>
                  <th className="px-5 py-4">Metric</th>
                  <th className="px-5 py-4">Current Value</th>
                  <th className="px-5 py-4">Previous Period</th>
                  <th className="px-5 py-4">Change</th>
                  <th className="px-5 py-4">Status</th>
                </>
              ) : (
                <>
                  <th className="px-5 py-4">Metric</th>
                  <th className="px-5 py-4">Value</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row[0]}>
                {row.map((cell, index) => (
                  <td className="border-t border-slate-100 px-5 py-4" key={cell}>
                    {isOverview && index === 4 ? (
                      <Badge variant={getMetricStatusBadge(cell)}>{cell}</Badge>
                    ) : (
                      <span className={index === 0 ? 'font-black text-slate-950' : 'text-sm font-semibold text-slate-600'}>
                        {cell}
                      </span>
                    )}
                  </td>
                ))}
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
              {row.slice(1).map((cell, index) =>
                isOverview && index === 3 ? (
                  <Badge key={cell} variant={getMetricStatusBadge(cell)}>
                    {cell}
                  </Badge>
                ) : (
                  <Badge key={cell} variant="neutral">
                    {cell}
                  </Badge>
                ),
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ExportPanel({ onExport, successMessage }) {
  return (
    <Card>
      <SectionHeader
        subtitle="PDF, CSV, and share links are simulated locally for now."
        title="Export Report"
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {['PDF', 'CSV', 'Share Link'].map((option) => (
          <div className="rounded-2xl bg-slate-50 p-4" key={option}>
            <p className="font-black text-slate-950">{option}</p>
            <p className="mt-1 text-sm text-slate-500">Demo export option</p>
          </div>
        ))}
      </div>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <Button onClick={onExport} rounded="2xl">
          <Download className="h-4 w-4" />
          Download PDF
        </Button>
        <Button onClick={onExport} rounded="2xl" variant="secondary">
          Export CSV
        </Button>
        <Button onClick={onExport} rounded="2xl" variant="secondary">
          Copy Share Link
        </Button>
      </div>
      {successMessage ? (
        <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          {successMessage}
        </p>
      ) : null}
    </Card>
  );
}

function RecentReportsTable({ onDelete, reports }) {
  if (!reports.length) {
    return (
      <Card className="text-center" padding="lg">
        <FileBarChart className="mx-auto h-12 w-12 text-indigo-500" />
        <h2 className="mt-5 text-2xl font-black text-slate-950">
          No reports found
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Generate your first report to see business insights.
        </p>
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
              <th className="px-5 py-4">Period</th>
              <th className="px-5 py-4">Generated Date</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => (
              <tr key={report.id}>
                <td className="border-t border-slate-100 px-5 py-4 font-black text-slate-950">
                  {report.reportName}
                </td>
                <td className="border-t border-slate-100 px-5 py-4 text-sm font-semibold text-slate-600">
                  {report.period}
                </td>
                <td className="border-t border-slate-100 px-5 py-4 text-sm text-slate-500">
                  {formatDate(report.generatedDate)}
                </td>
                <td className="border-t border-slate-100 px-5 py-4">
                  <Badge variant={getReportStatusBadge(report.status)}>
                    {report.status}
                  </Badge>
                </td>
                <td className="border-t border-slate-100 px-5 py-4">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="secondary">
                      <Eye className="h-4 w-4" />
                      View
                    </Button>
                    <Button size="sm" variant="secondary">
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                    <Button onClick={() => onDelete(report)} size="sm" variant="danger">
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
              <Badge variant={getReportStatusBadge(report.status)}>
                {report.status}
              </Badge>
            </div>
            <p className="mt-4 text-sm font-semibold text-slate-600">
              Generated {formatDate(report.generatedDate)}
            </p>
            <div className="mt-5 grid grid-cols-3 gap-2">
              <Button size="sm" variant="secondary">View</Button>
              <Button size="sm" variant="secondary">Download</Button>
              <Button onClick={() => onDelete(report)} size="sm" variant="danger">
                Delete
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}

export default function ReportsPage() {
  const [controls, setControls] = useState({
    reportType: 'Business Overview',
    dateRange: 'This Month',
    format: 'Summary',
  });
  const [generatedAt, setGeneratedAt] = useState('2026-07-05');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiSummary, setAiSummary] = useState(
    'Revenue increased by 14.2% this month, but pending payments are affecting cash flow. Focus on collecting dues from Ahmed Traders and City Wholesale.',
  );
  const [exportMessage, setExportMessage] = useState('');
  const [recentReports, setRecentReports] = useState(mockRecentReports);

  function updateControl(event) {
    const { name, value } = event.target;
    setControls((current) => ({ ...current, [name]: value }));
  }

  function selectReportType(reportType) {
    setControls((current) => ({ ...current, reportType }));
  }

  function generateReport() {
    setIsGenerating(true);
    window.setTimeout(() => {
      setGeneratedAt('2026-07-05');
      setRecentReports((current) => [
        {
          id: Date.now(),
          reportName: controls.reportType,
          period: controls.dateRange,
          generatedDate: '2026-07-05',
          status: 'Ready',
        },
        ...current,
      ]);
      setIsGenerating(false);
    }, 800);
  }

  function generateAiSummary() {
    setIsAiGenerating(true);
    window.setTimeout(() => {
      setAiSummary(
        'Revenue increased by 14.2% this month, but pending payments are affecting cash flow. Focus on collecting dues from Ahmed Traders and City Wholesale.',
      );
      setIsAiGenerating(false);
    }, 800);
  }

  function simulateExport(message = 'Report export simulated successfully.') {
    setExportMessage(message);
    window.setTimeout(() => setExportMessage(''), 2600);
  }

  const summaryCards = useMemo(
    () => [
      {
        title: 'Monthly Revenue',
        value: formatCurrency(reportSummary.monthlyRevenue),
        trend: '+14.2% this month',
        status: 'success',
        icon: LineChart,
      },
      {
        title: 'Monthly Profit',
        value: formatCurrency(reportSummary.monthlyProfit),
        trend: '+11.1% this month',
        status: 'success',
        icon: IndianRupee,
      },
      {
        title: 'Inventory Value',
        value: formatCurrency(reportSummary.inventoryValue),
        trend: '231 products tracked',
        status: 'info',
        icon: PackageCheck,
      },
      {
        title: 'Pending Payments',
        value: formatCurrency(reportSummary.pendingPayments),
        trend: 'Needs cash-flow follow-up',
        status: 'warning',
        icon: Clock,
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <SectionHeader
        action={
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              onClick={() =>
                simulateExport('PDF export simulated. Real PDF generation will be connected later.')
              }
              variant="secondary"
            >
              <Download className="h-4 w-4" />
              Export PDF
            </Button>
            <Button loading={isGenerating} onClick={generateReport}>
              <FileBarChart className="h-4 w-4" />
              Generate Report
            </Button>
          </div>
        }
        subtitle="Analyze sales, profit, inventory, customers, suppliers, and business performance."
        title="Reports"
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <StatCard key={card.title} {...card} />
        ))}
      </section>

      <Card className="overflow-hidden bg-gradient-to-br from-slate-950 to-indigo-950 text-white">
        <div className="grid gap-5 lg:grid-cols-[auto_1fr_auto] lg:items-center">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-cyan-200">
            <WandSparkles className="h-6 w-6" />
          </div>
          <div>
            <Badge className="bg-white/10 text-cyan-100 ring-white/15" variant="neutral">
              AI Report Insight
            </Badge>
            <p className="mt-3 max-w-3xl text-lg font-bold leading-7 text-white">
              {aiSummary}
            </p>
          </div>
          <Button loading={isAiGenerating} onClick={generateAiSummary} variant="secondary">
            <Sparkles className="h-4 w-4" />
            Generate AI Summary
          </Button>
        </div>
      </Card>

      <ReportControls
        controls={controls}
        isGenerating={isGenerating}
        onApply={generateReport}
        onChange={updateControl}
      />

      <ReportCategoryGrid
        onSelect={selectReportType}
        selectedType={controls.reportType}
      />

      <ReportPreview controls={controls} generatedAt={generatedAt} />

      <ReportMetricsTable reportType={controls.reportType} />

      <ExportPanel
        onExport={() => simulateExport()}
        successMessage={exportMessage}
      />

      <section className="space-y-4">
        <SectionHeader
          subtitle="Recently generated local report history."
          title="Recent Generated Reports"
        />
        {recentReports.length ? (
          <RecentReportsTable
            onDelete={(report) =>
              setRecentReports((current) =>
                current.filter((item) => item.id !== report.id),
              )
            }
            reports={recentReports}
          />
        ) : (
          <Card className="text-center" padding="lg">
            <SearchX className="mx-auto h-12 w-12 text-indigo-500" />
            <h2 className="mt-5 text-2xl font-black text-slate-950">
              No reports found
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Generate your first report to see business insights.
            </p>
            <Button className="mt-6" onClick={generateReport}>
              Generate Report
            </Button>
          </Card>
        )}
      </section>
    </div>
  );
}
