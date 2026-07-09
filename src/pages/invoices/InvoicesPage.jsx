import { AnimatePresence, motion } from 'framer-motion';
import {
  CheckCircle2,
  CircleAlert,
  Clock,
  Download,
  Eye,
  FileCheck2,
  FileSearch,
  FileText,
  IndianRupee,
  Loader2,
  ReceiptText,
  RefreshCw,
  Search,
  SearchX,
  Send,
  Sparkles,
  Trash2,
  WandSparkles,
  X,
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import Badge from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import Input from '../../components/common/Input.jsx';
import SectionHeader from '../../components/common/SectionHeader.jsx';
import StatCard from '../../components/common/StatCard.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { parseInvoiceWithAi } from '../../services/aiInvoiceService.js';
import {
  getInvoiceFileDownload,
  getInvoiceFilePreview,
  getInvoiceFileView,
} from '../../services/invoiceStorageService.js';
import {
  approvePurchaseInvoice,
  createInvoiceItem,
  deletePurchaseInvoice,
  deleteInvoiceItemsForInvoice,
  getPurchaseInvoiceInventoryReview,
  getPurchaseInvoiceWithItems,
  getInvoiceStats,
  listPurchaseInvoices,
  updatePurchaseInvoice,
} from '../../services/purchaseInvoiceService.js';
import {
  formatCurrency,
  formatDate,
  formatDuration,
  getAiConfidenceBadge,
  getAiConfidenceLevel,
  getAiReviewStatusBadge,
  getFileTypeLabel,
  getInventoryUpdateLabel,
  getInvoiceStatusBadge,
  getOcrConfidenceBadge,
  getOcrConfidenceLevel,
} from '../../utils/formatters.js';
import { getAiSourceLabel } from '../../utils/aiErrors.js';
import { parseInvoiceText } from '../../utils/invoiceTextParser.js';

const statusFilters = [
  'All Invoices',
  'Approved',
  'Pending Review',
  'Processing',
  'Failed OCR',
  'Rejected',
  'Uploaded',
];
const dateFilters = ['Today', 'This Week', 'This Month', 'All Time'];
const sortOptions = ['Latest', 'Highest Amount', 'Supplier Name', 'Status'];

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

  const tones = {
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    danger: 'border-rose-200 bg-rose-50 text-rose-800',
    warning: 'border-amber-200 bg-amber-50 text-amber-800',
    info: 'border-cyan-200 bg-cyan-50 text-cyan-800',
  };

  return (
    <div className={clsx('flex items-start justify-between gap-4 rounded-3xl border px-4 py-3 text-sm font-semibold', tones[tone])}>
      <p>{message}</p>
      <button
        aria-label="Dismiss message"
        className="rounded-full p-1 transition hover:bg-white/60"
        onClick={onDismiss}
        type="button"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function InvoiceFilters({ filters, onChange, onClear, suppliers }) {
  return (
    <Card>
      <div className="grid gap-4 lg:grid-cols-[1.35fr_0.75fr_0.8fr_0.65fr_0.7fr_auto] lg:items-end">
        <Input
          icon={Search}
          label="Search"
          name="search"
          onChange={onChange}
          placeholder="Search invoice number, supplier, item..."
          value={filters.search}
        />
        <SelectControl label="Status" name="status" onChange={onChange} value={filters.status}>
          {statusFilters.map((status) => (
            <option key={status}>{status}</option>
          ))}
        </SelectControl>
        <SelectControl
          label="Supplier"
          name="supplier"
          onChange={onChange}
          value={filters.supplier}
        >
          <option>All Suppliers</option>
          {suppliers.map((supplier) => (
            <option key={supplier}>{supplier}</option>
          ))}
        </SelectControl>
        <SelectControl
          label="Date"
          name="dateFilter"
          onChange={onChange}
          value={filters.dateFilter}
        >
          {dateFilters.map((filter) => (
            <option key={filter}>{filter}</option>
          ))}
        </SelectControl>
        <SelectControl label="Sort by" name="sortBy" onChange={onChange} value={filters.sortBy}>
          {sortOptions.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </SelectControl>
        <Button className="w-full lg:w-auto" onClick={onClear} variant="secondary">
          Clear
        </Button>
      </div>
    </Card>
  );
}

function ItemPills({ items = [] }) {
  const visibleItems = items.slice(0, 2);
  const hiddenCount = Math.max(0, items.length - visibleItems.length);

  return (
    <div className="flex flex-wrap gap-2">
      {visibleItems.map((item) => (
        <span
          className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600"
          key={item.id || item.productName}
        >
          {item.productName}
        </span>
      ))}
      {hiddenCount > 0 ? <Badge>+{hiddenCount} more</Badge> : null}
      {!items.length ? <Badge>No items</Badge> : null}
    </div>
  );
}

function ActionButton({ disabled = false, icon: Icon, label, onClick, tone = 'slate' }) {
  return (
    <button
      aria-label={label}
      className={clsx(
        'grid h-9 w-9 place-items-center rounded-full border bg-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-40',
        tone === 'danger'
          ? 'border-rose-100 text-rose-500 hover:bg-rose-50'
          : tone === 'accent'
            ? 'border-indigo-100 text-indigo-600 hover:bg-indigo-50'
            : 'border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-950',
      )}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function InvoiceInsights({ invoices }) {
  if (!invoices.length) {
    return (
      <Card>
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <ReceiptText className="h-5 w-5 text-indigo-500" />
          Scan invoices to see purchase insights here.
        </div>
      </Card>
    );
  }

  const highestInvoice = [...invoices].sort((a, b) => b.totalAmount - a.totalAmount)[0];
  const pendingCount = invoices.filter((invoice) => invoice.status === 'Pending Review').length;
  const supplierTotals = invoices.reduce((totals, invoice) => {
    totals[invoice.supplierName] = (totals[invoice.supplierName] || 0) + invoice.totalAmount;
    return totals;
  }, {});
  const topSupplier = Object.entries(supplierTotals).sort(([, a], [, b]) => b - a)[0];

  const insights = [
    {
      label: 'Highest Purchase Invoice',
      value: `${highestInvoice.supplierName} - ${formatCurrency(highestInvoice.totalAmount)}`,
      icon: ReceiptText,
      tone: 'text-indigo-600 bg-indigo-50',
    },
    {
      label: 'Pending Review',
      value: `${pendingCount} invoices`,
      icon: CircleAlert,
      tone: 'text-amber-600 bg-amber-50',
    },
    {
      label: 'Purchase Value',
      value: formatCurrency(invoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0)),
      icon: IndianRupee,
      tone: 'text-emerald-600 bg-emerald-50',
    },
    {
      label: 'Top Supplier',
      value: topSupplier ? `${topSupplier[0]} - ${formatCurrency(topSupplier[1])}` : 'No supplier yet',
      icon: FileCheck2,
      tone: 'text-cyan-600 bg-cyan-50',
    },
  ];

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {insights.map((item) => {
        const Icon = item.icon;
        return (
          <Card hover key={item.label}>
            <div className="flex items-start gap-3">
              <div className={`grid h-11 w-11 place-items-center rounded-2xl ${item.tone}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-500">{item.label}</p>
                <p className="mt-1 text-sm font-black leading-5 text-slate-950">
                  {item.value}
                </p>
              </div>
            </div>
          </Card>
        );
      })}
    </section>
  );
}

function InvoiceTable({ actionLoading, invoices, onAiParse, onApprove, onDelete, onReview, onView }) {
  return (
    <Card className="hidden overflow-hidden xl:block" padding="none">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1120px] border-separate border-spacing-0">
          <thead>
            <tr className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-400">
              <th className="px-5 py-4">Invoice</th>
              <th className="px-5 py-4">Supplier</th>
              <th className="px-5 py-4">Items</th>
              <th className="px-5 py-4">GST</th>
              <th className="px-5 py-4">Total Amount</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">Inventory</th>
              <th className="px-5 py-4">Date</th>
              <th className="px-5 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => {
              const canApprove = invoice.status !== 'Approved' && !invoice.inventoryUpdated;
              const canAiParse = Boolean(invoice.extractedText) && !invoice.inventoryUpdated && invoice.status !== 'Approved';
              return (
                <tr className="transition hover:bg-slate-50/70" key={invoice.id}>
                  <td className="border-t border-slate-100 px-5 py-4">
                    <p className="font-black text-slate-950">{invoice.invoiceNumber}</p>
                    <p className="text-sm text-slate-500">{invoice.fileName || 'No file'}</p>
                  </td>
                  <td className="border-t border-slate-100 px-5 py-4">
                    <p className="font-black text-slate-950">{invoice.supplierName}</p>
                    <p className="text-sm text-slate-500">{invoice.supplierPhone || 'No phone'}</p>
                  </td>
                  <td className="border-t border-slate-100 px-5 py-4">
                    <ItemPills items={invoice.items} />
                  </td>
                  <td className="border-t border-slate-100 px-5 py-4 text-sm font-bold text-slate-950">
                    {formatCurrency(invoice.gstAmount)}
                  </td>
                  <td className="border-t border-slate-100 px-5 py-4 text-sm font-black text-slate-950">
                    {formatCurrency(invoice.totalAmount)}
                  </td>
                  <td className="border-t border-slate-100 px-5 py-4">
                    <Badge variant={getInvoiceStatusBadge(invoice.status)}>{invoice.status}</Badge>
                  </td>
                  <td className="border-t border-slate-100 px-5 py-4">
                    <Badge variant={invoice.inventoryUpdated ? 'success' : 'neutral'}>
                      {getInventoryUpdateLabel(invoice.inventoryUpdated)}
                    </Badge>
                  </td>
                  <td className="border-t border-slate-100 px-5 py-4 text-sm text-slate-500">
                    {formatDate(invoice.invoiceDate)}
                  </td>
                  <td className="border-t border-slate-100 px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <ActionButton icon={Eye} label="View invoice" onClick={() => onView(invoice)} />
                      <ActionButton icon={FileSearch} label="Review invoice" onClick={() => onReview(invoice)} />
                      <ActionButton
                        disabled={!canAiParse || actionLoading === `ai-${invoice.id}`}
                        icon={Sparkles}
                        label="AI parse invoice"
                        onClick={() => onAiParse(invoice)}
                        tone="accent"
                      />
                      <ActionButton
                        disabled={!canApprove}
                        icon={CheckCircle2}
                        label="Approve invoice"
                        onClick={() => onApprove(invoice)}
                        tone="accent"
                      />
                      <ActionButton
                        icon={Trash2}
                        label="Delete invoice"
                        onClick={() => onDelete(invoice)}
                        tone="danger"
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function InvoiceCard({ actionLoading, invoice, onAiParse, onApprove, onDelete, onReview, onView }) {
  const canApprove = invoice.status !== 'Approved' && !invoice.inventoryUpdated;
  const canAiParse = Boolean(invoice.extractedText) && !invoice.inventoryUpdated && invoice.status !== 'Approved';

  return (
    <Card className="xl:hidden" hover>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-black text-slate-950">{invoice.invoiceNumber}</p>
          <p className="mt-1 text-sm font-semibold text-slate-500">{invoice.supplierName}</p>
        </div>
        <Badge variant={getInvoiceStatusBadge(invoice.status)}>{invoice.status}</Badge>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 rounded-3xl bg-slate-50 p-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Total</p>
          <p className="mt-1 text-sm font-black text-slate-950">
            {formatCurrency(invoice.totalAmount)}
          </p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">GST</p>
          <p className="mt-1 text-sm font-black text-slate-950">
            {formatCurrency(invoice.gstAmount)}
          </p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Items</p>
          <p className="mt-1 text-sm font-black text-slate-950">{invoice.itemCount}</p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Inventory</p>
          <p className="mt-1 text-sm font-black text-slate-950">
            {getInventoryUpdateLabel(invoice.inventoryUpdated)}
          </p>
        </div>
        <div className="col-span-2">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Invoice Date</p>
          <p className="mt-1 text-sm font-black text-slate-950">
            {formatDate(invoice.invoiceDate)}
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2">
        <Button onClick={() => onView(invoice)} size="sm" variant="secondary">View</Button>
        <Button onClick={() => onReview(invoice)} size="sm" variant="secondary">Review</Button>
        <Button
          disabled={!canAiParse}
          loading={actionLoading === `ai-${invoice.id}`}
          onClick={() => onAiParse(invoice)}
          size="sm"
          variant="secondary"
        >
          AI Parse
        </Button>
        <Button disabled={!canApprove} onClick={() => onApprove(invoice)} size="sm">Approve</Button>
      </div>
      <Button className="mt-2 w-full" onClick={() => onDelete(invoice)} size="sm" variant="danger">
        Delete
      </Button>
    </Card>
  );
}

function ModalShell({ children, onClose, size = 'max-w-2xl' }) {
  return (
    <AnimatePresence>
      <motion.div
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-50 grid place-items-end bg-slate-950/35 p-3 backdrop-blur-sm sm:place-items-center sm:p-6"
        exit={{ opacity: 0 }}
        initial={{ opacity: 0 }}
      >
        <button
          aria-label="Close modal backdrop"
          className="absolute inset-0"
          onClick={onClose}
          type="button"
        />
        <motion.div
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className={`relative max-h-[92vh] w-full ${size} overflow-y-auto rounded-3xl bg-white shadow-glass`}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          {children}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function safeJsonSummary(value) {
  if (!value) return 'No AI extracted summary saved yet.';

  try {
    const parsed = JSON.parse(value);
    const parsedData = parsed.parsedData || parsed;
    if (parsedData.supplierName || parsedData.items) {
      return `${parsedData.supplierName || 'Invoice'} parsed with ${parsedData.items?.length || 0} items and total ${formatCurrency(parsedData.totalAmount)}.`;
    }
    return JSON.stringify(parsed, null, 2);
  } catch {
    return value;
  }
}

function getOcrMetadata(invoice) {
  if (!invoice?.aiExtractedJson) {
    return {};
  }

  try {
    const metadata = JSON.parse(invoice.aiExtractedJson);
    return {
      ...metadata,
      parsedData: metadata.parsedData || metadata,
      aiResult: metadata.aiResult || null,
      warnings: metadata.warnings || metadata.parsedData?.warnings || [],
    };
  } catch {
    return {};
  }
}

function isImageFileType(fileType = '') {
  const normalized = String(fileType || '').toLowerCase();
  return (
    normalized.startsWith('image/') ||
    ['png', 'jpg', 'jpeg', 'webp'].includes(normalized)
  );
}

function InvoiceFilePreview({ src }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className="mt-6 rounded-3xl border border-slate-100 bg-slate-50 p-5 text-sm font-semibold text-slate-500">
        Private file preview is unavailable in the browser. Use Open File or Download.
      </div>
    );
  }

  return (
    <div className="mt-6 overflow-hidden rounded-3xl border border-slate-100 bg-slate-50">
      <img
        alt="Invoice file preview"
        className="max-h-80 w-full object-contain"
        onError={() => setFailed(true)}
        src={src}
      />
    </div>
  );
}

function InvoiceDetailsModal({ actionLoading, invoice, onAiParse, onApprove, onClose }) {
  const ocrMetadata = getOcrMetadata(invoice);
  const aiResult = ocrMetadata.aiResult;
  const aiConfidence = aiResult?.confidence?.overall;
  const fileViewUrl = invoice.fileId ? getInvoiceFileView(invoice.fileId) : '';
  const filePreviewUrl =
    invoice.fileId && isImageFileType(invoice.fileType)
      ? getInvoiceFilePreview(invoice.fileId)
      : '';
  const downloadUrl = invoice.fileId ? getInvoiceFileDownload(invoice.fileId) : '';
  const canApprove = invoice.status !== 'Approved' && !invoice.inventoryUpdated;
  const canAiParse = Boolean(invoice.extractedText) && !invoice.inventoryUpdated && invoice.status !== 'Approved';

  return (
    <ModalShell onClose={onClose} size="max-w-3xl">
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-950">
              {invoice.invoiceNumber}
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              {invoice.supplierName} {invoice.supplierPhone ? `- ${invoice.supplierPhone}` : ''}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant={getInvoiceStatusBadge(invoice.status)}>{invoice.status}</Badge>
              <Badge variant={invoice.inventoryUpdated ? 'success' : 'neutral'}>
                {getInventoryUpdateLabel(invoice.inventoryUpdated)}
              </Badge>
              {ocrMetadata.confidence !== undefined ? (
                <Badge variant={getOcrConfidenceBadge(ocrMetadata.confidence)}>
                  {getOcrConfidenceLevel(ocrMetadata.confidence)}
                </Badge>
              ) : null}
              {aiResult ? (
                <>
                  <Badge variant={getAiConfidenceBadge(aiConfidence)}>
                    {getAiConfidenceLevel(aiConfidence)}
                  </Badge>
                  <Badge variant={getAiReviewStatusBadge(aiResult.needsManualReview)}>
                    {aiResult.needsManualReview ? 'AI Needs Review' : 'AI Ready'}
                  </Badge>
                </>
              ) : null}
            </div>
          </div>
          <button
            aria-label="Close invoice details"
            className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-950"
            onClick={onClose}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {invoice.fileId ? <InvoiceFilePreview src={filePreviewUrl} /> : null}

        <div className="mt-6 flex flex-wrap gap-3">
          {canAiParse ? (
            <Button
              loading={actionLoading === `ai-${invoice.id}`}
              onClick={() => onAiParse(invoice)}
              variant="secondary"
            >
              <Sparkles className="h-4 w-4" />
              Run AI Parse
            </Button>
          ) : null}
          {canApprove ? (
            <Button onClick={() => onApprove(invoice)}>
              <CheckCircle2 className="h-4 w-4" />
              Approve Invoice
            </Button>
          ) : null}
          {fileViewUrl ? (
            <Button as="a" href={fileViewUrl} rel="noreferrer" target="_blank" variant="secondary">
              <Eye className="h-4 w-4" />
              Open File
            </Button>
          ) : null}
          {downloadUrl ? (
            <Button as="a" href={downloadUrl} rel="noreferrer" target="_blank" variant="secondary">
              <Download className="h-4 w-4" />
              Download
            </Button>
          ) : null}
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            ['Invoice date', formatDate(invoice.invoiceDate)],
            ['File name', invoice.fileName || 'No file'],
            ['File type', getFileTypeLabel(invoice.fileType)],
            ['OCR source', ocrMetadata.source || 'Not captured'],
            ['AI source', aiResult ? getAiSourceLabel(ocrMetadata.source) : 'AI extraction not run yet'],
            ['AI model', ocrMetadata.model || 'Not configured'],
            ['OCR time', formatDuration(ocrMetadata.durationMs || 0)],
            ['Parser', ocrMetadata.parser || 'Not captured'],
            ['Subtotal', formatCurrency(invoice.subtotal)],
            ['GST amount', formatCurrency(invoice.gstAmount)],
            ['Total amount', formatCurrency(invoice.totalAmount)],
          ].map(([label, value]) => (
            <div className="rounded-2xl bg-slate-50 p-4" key={label}>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
              <p className="mt-1 font-black text-slate-950">{value}</p>
            </div>
          ))}
        </div>

        {ocrMetadata.warnings?.length ? (
          <div className="mt-5 rounded-3xl border border-amber-100 bg-amber-50 p-5">
            <p className="text-sm font-black text-amber-800">OCR review warnings</p>
            <ul className="mt-3 space-y-2 text-sm font-semibold text-amber-700">
              {ocrMetadata.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {aiResult ? (
          <div className="mt-5 rounded-3xl border border-indigo-100 bg-indigo-50 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={getAiConfidenceBadge(aiConfidence)}>
                {getAiConfidenceLevel(aiConfidence)}
              </Badge>
              <Badge variant={getAiReviewStatusBadge(aiResult.needsManualReview)}>
                {aiResult.needsManualReview ? 'Manual review required' : 'Ready for review'}
              </Badge>
            </div>
            <p className="mt-3 text-sm font-semibold leading-6 text-slate-700">
              AI extraction ran through the secure Appwrite Function. Review supplier, GST,
              totals, and line items before approval.
            </p>
            {ocrMetadata.deterministicChecks?.warnings?.length ? (
              <ul className="mt-3 space-y-2 text-sm font-semibold text-amber-700">
                {ocrMetadata.deterministicChecks.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : (
          <div className="mt-5 rounded-3xl border border-slate-100 bg-slate-50 p-5 text-sm font-semibold text-slate-600">
            AI extraction not run yet.
          </div>
        )}

        <div className="mt-6 overflow-hidden rounded-3xl border border-slate-100">
          {invoice.items.map((item) => (
            <div
              className="grid gap-2 border-b border-slate-100 bg-white p-4 last:border-b-0 sm:grid-cols-[1fr_0.6fr_0.8fr_0.5fr_1fr]"
              key={item.id || item.productName}
            >
              <p className="font-black text-slate-950">{item.productName}</p>
              <p className="text-sm text-slate-500">{item.quantity} {item.unit}</p>
              <p className="text-sm font-bold text-slate-950">{formatCurrency(item.amount)}</p>
              <p className="text-sm text-slate-500">{item.gstPercentage}%</p>
              <p className="text-sm font-semibold text-emerald-600">{item.inventoryAction}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl bg-slate-950 p-5">
            <p className="text-sm font-bold text-cyan-100">Extracted OCR text</p>
            <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap text-sm leading-6 text-slate-100">
              {invoice.extractedText || 'No OCR text was extracted for this invoice.'}
            </pre>
          </div>
          <div className="rounded-3xl bg-indigo-50 p-5">
            <p className="text-sm font-bold text-indigo-700">
              {aiResult ? 'AI extracted summary' : 'OCR parsed summary'}
            </p>
            <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap text-sm leading-6 text-slate-700">
              {safeJsonSummary(invoice.aiExtractedJson)}
            </pre>
            <div className="mt-4 rounded-2xl bg-white p-4 text-sm leading-6 text-slate-700">
              {aiResult
                ? 'AI understanding is saved for review. Approval remains manual.'
                : 'This is local OCR plus rule-based parsing. Run AI Parse for stronger extraction.'}
            </div>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

function InvoiceReviewModal({ invoice, loading, onClose, onSave }) {
  const [values, setValues] = useState({
    supplierName: invoice.supplierName,
    supplierPhone: invoice.supplierPhone || '',
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: invoice.invoiceDate,
    subtotal: String(invoice.subtotal),
    gstAmount: String(invoice.gstAmount),
    totalAmount: String(invoice.totalAmount),
    status: invoice.status,
    items: invoice.items.map((item) => ({ ...item })),
  });

  function updateField(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
  }

  function updateItem(index, field, value) {
    setValues((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    }));
  }

  function addItem() {
    setValues((current) => ({
      ...current,
      items: [
        ...current.items,
        {
          productName: '',
          quantity: 0,
          unit: '',
          amount: 0,
          gstPercentage: 0,
          inventoryAction: 'Review manually',
        },
      ],
    }));
  }

  function removeItem(index) {
    setValues((current) => ({
      ...current,
      items: current.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  function handleSave() {
    onSave({
      ...invoice,
      supplierName: values.supplierName,
      supplierPhone: values.supplierPhone,
      invoiceNumber: values.invoiceNumber,
      invoiceDate: values.invoiceDate,
      subtotal: Number(values.subtotal),
      gstAmount: Number(values.gstAmount),
      totalAmount: Number(values.totalAmount),
      status: values.status,
      items: values.items.map((item) => ({
        ...item,
        productName: item.productName,
        quantity: Number(item.quantity),
        unit: item.unit || '',
        amount: Number(item.amount),
        gstPercentage: Number(item.gstPercentage),
        inventoryAction: item.inventoryAction || 'Review manually',
      })),
    });
  }

  return (
    <ModalShell onClose={onClose} size="max-w-3xl">
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-indigo-600">Appwrite review mode</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
              Review Invoice
            </h2>
          </div>
          <button
            aria-label="Close review modal"
            className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-950"
            onClick={onClose}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Input label="Supplier name" name="supplierName" onChange={updateField} value={values.supplierName} />
          <Input label="Supplier phone" name="supplierPhone" onChange={updateField} value={values.supplierPhone} />
          <Input label="Invoice number" name="invoiceNumber" onChange={updateField} value={values.invoiceNumber} />
          <Input label="Invoice date" name="invoiceDate" onChange={updateField} type="date" value={values.invoiceDate} />
          <SelectControl label="Status" name="status" onChange={updateField} value={values.status}>
            {statusFilters.slice(1).map((status) => (
              <option key={status}>{status}</option>
            ))}
          </SelectControl>
          <Input label="Subtotal" name="subtotal" onChange={updateField} type="number" value={values.subtotal} />
          <Input label="GST amount" name="gstAmount" onChange={updateField} type="number" value={values.gstAmount} />
          <Input label="Total amount" name="totalAmount" onChange={updateField} type="number" value={values.totalAmount} />
        </div>

        <div className="mt-6 space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-black text-slate-950">Invoice items</p>
              <p className="mt-1 text-sm text-slate-500">
                Review AI/OCR extracted line items before approval.
              </p>
            </div>
            <Button onClick={addItem} size="sm" variant="secondary">Add Item</Button>
          </div>
          {values.items.map((item, index) => (
            <div className="rounded-3xl bg-slate-50 p-4" key={item.id || `${item.productName}-${index}`}>
              <div className="grid gap-3 sm:grid-cols-3">
                <Input
                  label="Product name"
                  name={`product-${index}`}
                  onChange={(event) => updateItem(index, 'productName', event.target.value)}
                  value={item.productName}
                />
                <Input
                  label="Quantity"
                  name={`quantity-${index}`}
                  onChange={(event) => updateItem(index, 'quantity', event.target.value)}
                  type="number"
                  value={String(item.quantity)}
                />
                <Input
                  label="Unit"
                  name={`unit-${index}`}
                  onChange={(event) => updateItem(index, 'unit', event.target.value)}
                  value={item.unit || ''}
                />
                <Input
                  label="Amount"
                  name={`amount-${index}`}
                  onChange={(event) => updateItem(index, 'amount', event.target.value)}
                  type="number"
                  value={String(item.amount)}
                />
                <Input
                  label="GST %"
                  name={`gst-${index}`}
                  onChange={(event) => updateItem(index, 'gstPercentage', event.target.value)}
                  type="number"
                  value={String(item.gstPercentage)}
                />
                <Input
                  label="Inventory action"
                  name={`action-${index}`}
                  onChange={(event) => updateItem(index, 'inventoryAction', event.target.value)}
                  value={item.inventoryAction || ''}
                />
                <Button onClick={() => removeItem(index)} rounded="2xl" variant="danger">
                  Remove
                </Button>
              </div>
            </div>
          ))}
          <p className="text-sm text-slate-500">
            AI extraction is secure server-side when configured. Approval remains manual.
          </p>
        </div>

        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button onClick={onClose} rounded="2xl" variant="secondary">Cancel</Button>
          <Button loading={loading} onClick={handleSave} rounded="2xl">Save Review</Button>
        </div>
      </div>
    </ModalShell>
  );
}

function ApproveInvoiceModal({
  errorMessage,
  inventoryReview,
  invoice,
  loading,
  onCancel,
  onConfirm,
  reviewLoading,
}) {
  const [decisions, setDecisions] = useState({});
  const reviewItems = inventoryReview?.items || [];

  useEffect(() => {
    if (!inventoryReview?.items?.length) return;

    const nextDecisions = {};
    inventoryReview.items.forEach((item) => {
      const firstMatch = item.matches?.[0];
      nextDecisions[item.itemKey] = {
        action: firstMatch ? 'match' : 'create',
        productId: firstMatch?.id || '',
        productData: {
          ...item.productDraft,
          stock: Number(item.productDraft?.stock || item.quantity || 0),
        },
      };
    });
    setDecisions(nextDecisions);
  }, [inventoryReview]);

  function updateDecision(itemKey, patch) {
    setDecisions((current) => ({
      ...current,
      [itemKey]: {
        ...(current[itemKey] || {}),
        ...patch,
      },
    }));
  }

  function updateProductData(itemKey, field, value) {
    setDecisions((current) => ({
      ...current,
      [itemKey]: {
        ...(current[itemKey] || {}),
        action: 'create',
        productData: {
          ...(current[itemKey]?.productData || {}),
          [field]: value,
        },
      },
    }));
  }

  const canApprove = reviewItems.length > 0 && reviewItems.every((item) => {
    const decision = decisions[item.itemKey];
    if (!decision) return false;
    if (decision.action === 'match') return Boolean(decision.productId);

    const productData = decision.productData || {};
    return (
      productData.name &&
      productData.category &&
      Number(productData.purchasePrice) >= 0 &&
      Number(productData.sellingPrice) >= 0 &&
      Number(productData.stock) >= 0 &&
      Number(productData.minStock) >= 0
    );
  });

  return (
    <ModalShell onClose={onCancel} size="max-w-4xl">
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h2 className="mt-5 text-2xl font-black tracking-tight text-slate-950">
              Review inventory update
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Approving {invoice.invoiceNumber} will mark the invoice approved, increase purchase stock, and update the supplier ledger. Confirm each item before inventory changes are saved.
            </p>
          </div>
          <button
            aria-label="Close approval review"
            className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-950"
            onClick={onCancel}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {errorMessage ? (
          <div className="mt-5 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold leading-6 text-rose-700">
            {errorMessage}
          </div>
        ) : null}

        {reviewLoading ? (
          <div className="mt-6 grid min-h-[240px] place-items-center rounded-3xl bg-slate-50 text-center">
            <div>
              <Loader2 className="mx-auto h-7 w-7 animate-spin text-indigo-600" />
              <p className="mt-3 text-sm font-bold text-slate-600">Preparing product matches...</p>
            </div>
          </div>
        ) : null}

        {!reviewLoading && !reviewItems.length ? (
          <div className="mt-6 rounded-3xl border border-amber-100 bg-amber-50 p-5 text-sm font-semibold leading-6 text-amber-800">
            No invoice items were found. Review the invoice line items first, then approve inventory.
          </div>
        ) : null}

        {!reviewLoading && reviewItems.length ? (
          <div className="mt-6 space-y-4">
            {reviewItems.map((item) => {
              const decision = decisions[item.itemKey] || {};
              const productData = decision.productData || item.productDraft || {};
              const selectedMatch = item.matches?.find((match) => match.id === decision.productId);
              const incomingQuantity = Number(item.quantity || 0);

              return (
                <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4" key={item.itemKey}>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-lg font-black text-slate-950">{item.productName}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        Invoice quantity: {incomingQuantity} {item.unit || 'units'} - {formatCurrency(item.amount)}
                      </p>
                    </div>
                    <Badge variant={item.matches?.length ? 'info' : 'warning'}>
                      {item.matches?.length ? `${item.matches.length} possible match(es)` : 'New product needed'}
                    </Badge>
                  </div>

                  {item.matches?.length ? (
                    <div className="mt-4 grid gap-3 lg:grid-cols-[0.8fr_1.2fr]">
                      <label className="flex items-center gap-3 rounded-2xl bg-white p-3 text-sm font-bold text-slate-700">
                        <input
                          checked={decision.action === 'match'}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                          name={`action-${item.itemKey}`}
                          onChange={() => updateDecision(item.itemKey, {
                            action: 'match',
                            productId: decision.productId || item.matches[0].id,
                          })}
                          type="radio"
                        />
                        Use existing product
                      </label>
                      <select
                        className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100 disabled:opacity-50"
                        disabled={decision.action !== 'match'}
                        onChange={(event) => updateDecision(item.itemKey, {
                          action: 'match',
                          productId: event.target.value,
                        })}
                        value={decision.productId || item.matches[0].id}
                      >
                        {item.matches.map((match) => (
                          <option key={match.id} value={match.id}>
                            {match.name} - stock {match.stock} to {match.stock + incomingQuantity}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}

                  {selectedMatch && decision.action === 'match' ? (
                    <div className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
                      {selectedMatch.name} will increase from {selectedMatch.stock} to {selectedMatch.stock + incomingQuantity}.
                    </div>
                  ) : null}

                  <label className="mt-3 flex items-center gap-3 rounded-2xl bg-white p-3 text-sm font-bold text-slate-700">
                    <input
                      checked={decision.action === 'create'}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                      name={`action-${item.itemKey}`}
                      onChange={() => updateDecision(item.itemKey, { action: 'create' })}
                      type="radio"
                    />
                    Create new inventory product
                  </label>

                  {decision.action === 'create' ? (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <Input
                        label="Product name"
                        name={`new-name-${item.itemKey}`}
                        onChange={(event) => updateProductData(item.itemKey, 'name', event.target.value)}
                        value={productData.name || ''}
                      />
                      <Input
                        label="Category"
                        name={`new-category-${item.itemKey}`}
                        onChange={(event) => updateProductData(item.itemKey, 'category', event.target.value)}
                        value={productData.category || ''}
                      />
                      <Input
                        label="Buying price"
                        name={`new-buy-${item.itemKey}`}
                        onChange={(event) => updateProductData(item.itemKey, 'purchasePrice', event.target.value)}
                        type="number"
                        value={String(productData.purchasePrice ?? '')}
                      />
                      <Input
                        label="Selling price"
                        name={`new-sell-${item.itemKey}`}
                        onChange={(event) => updateProductData(item.itemKey, 'sellingPrice', event.target.value)}
                        type="number"
                        value={String(productData.sellingPrice ?? '')}
                      />
                      <Input
                        label="New current stock"
                        name={`new-stock-${item.itemKey}`}
                        onChange={(event) => updateProductData(item.itemKey, 'stock', event.target.value)}
                        type="number"
                        value={String(productData.stock ?? '')}
                      />
                      <Input
                        label="Minimum stock"
                        name={`new-min-${item.itemKey}`}
                        onChange={(event) => updateProductData(item.itemKey, 'minStock', event.target.value)}
                        type="number"
                        value={String(productData.minStock ?? '')}
                      />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : null}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button onClick={onCancel} rounded="2xl" variant="secondary">Cancel</Button>
          <Button
            disabled={!canApprove || reviewLoading}
            loading={loading}
            onClick={() => onConfirm(decisions)}
            rounded="2xl"
          >
            Approve & Update Inventory
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}

function DeleteConfirmModal({ invoice, loading, onCancel, onConfirm }) {
  const [deleteFile, setDeleteFile] = useState(Boolean(invoice.fileId));

  return (
    <ModalShell onClose={onCancel} size="max-w-md">
      <div className="p-5 sm:p-6">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-rose-50 text-rose-600">
          <Trash2 className="h-6 w-6" />
        </div>
        <h2 className="mt-5 text-2xl font-black tracking-tight text-slate-950">
          Delete this invoice record?
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          {invoice.invoiceNumber} and its invoice item rows will be deleted from Appwrite.
        </p>
        <label className="mt-5 flex items-center gap-3 rounded-2xl bg-slate-50 p-3 text-sm font-semibold text-slate-700">
          <input
            checked={deleteFile}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            disabled={!invoice.fileId}
            onChange={(event) => setDeleteFile(event.target.checked)}
            type="checkbox"
          />
          Also delete uploaded file
        </label>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button onClick={onCancel} rounded="2xl" variant="secondary">Cancel</Button>
          <Button loading={loading} onClick={() => onConfirm({ deleteFile })} rounded="2xl" variant="danger">
            Delete Invoice
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}

function EmptyState({ isInitialEmpty, onClear }) {
  return (
    <Card className="text-center" padding="lg">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-3xl bg-slate-100 text-slate-500">
        <SearchX className="h-7 w-7" />
      </div>
      <h2 className="mt-5 text-2xl font-black text-slate-950">
        {isInitialEmpty ? 'No invoices uploaded yet' : 'No invoices found'}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
        {isInitialEmpty
          ? 'Scan your first supplier invoice to save purchase records and prepare inventory updates.'
          : 'Try changing your search or filters.'}
      </p>
      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        {isInitialEmpty ? (
          <Button as={Link} to="/invoice-scanner">
            <FileSearch className="h-4 w-4" />
            Scan Invoice
          </Button>
        ) : (
          <Button onClick={onClear} variant="secondary">Clear filters</Button>
        )}
      </div>
    </Card>
  );
}

function InvoiceScannerCTA() {
  return (
    <Card className="overflow-hidden bg-gradient-to-br from-slate-950 to-indigo-950 text-white">
      <div className="grid gap-5 lg:grid-cols-[auto_1fr_auto] lg:items-center">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-cyan-200">
          <FileSearch className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-xl font-black">Need to add a new purchase invoice?</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Use Invoice Scanner to extract supplier, items, GST, and total amount automatically.
          </p>
        </div>
        <Button as={Link} to="/invoice-scanner" variant="secondary">
          Open Invoice Scanner
        </Button>
      </div>
    </Card>
  );
}

function LoadingState() {
  return (
    <Card className="grid min-h-[280px] place-items-center text-center" padding="lg">
      <div>
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-3xl bg-indigo-50 text-indigo-600">
          <Loader2 className="h-7 w-7 animate-spin" />
        </div>
        <h2 className="mt-5 text-xl font-black text-slate-950">Loading invoices</h2>
        <p className="mt-2 text-sm text-slate-500">Fetching purchase invoices and item rows from Appwrite.</p>
      </div>
    </Card>
  );
}

function isWithinDateFilter(invoiceDate, filter) {
  if (filter === 'All Time') return true;

  const invoiceTime = new Date(invoiceDate).getTime();
  const now = new Date();

  if (Number.isNaN(invoiceTime)) return false;
  if (filter === 'Today') return String(invoiceDate).slice(0, 10) === now.toISOString().slice(0, 10);
  if (filter === 'This Week') return invoiceTime >= now.getTime() - 6 * 24 * 60 * 60 * 1000 && invoiceTime <= now.getTime();
  if (filter === 'This Month') return String(invoiceDate).slice(0, 7) === now.toISOString().slice(0, 7);

  return true;
}

function getInvoiceInsight(invoices, stats) {
  if (!invoices.length) return 'Scan your first invoice to unlock supplier purchase insights.';
  if (stats.pendingReview > 0) {
    return `You have ${stats.pendingReview} invoices pending review. Approve them to keep purchase records accurate.`;
  }

  const supplierTotals = invoices.reduce((totals, invoice) => {
    totals[invoice.supplierName] = (totals[invoice.supplierName] || 0) + invoice.totalAmount;
    return totals;
  }, {});
  const topSupplier = Object.entries(supplierTotals).sort(([, a], [, b]) => b - a)[0];

  return topSupplier
    ? `${topSupplier[0]} has the highest purchase value this month.`
    : 'Review scanned invoices to keep purchase records accurate.';
}

export default function InvoicesPage() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [feedback, setFeedback] = useState({ message: '', tone: 'info' });
  const [filters, setFilters] = useState({
    search: '',
    status: 'All Invoices',
    supplier: 'All Suppliers',
    dateFilter: 'All Time',
    sortBy: 'Latest',
  });
  const [modalState, setModalState] = useState({ type: null, invoice: null });
  const [approvalReview, setApprovalReview] = useState(null);
  const [handledApprovalId, setHandledApprovalId] = useState('');

  const loadInvoices = useCallback(async () => {
    if (!user?.$id) return;

    setLoading(true);
    try {
      setInvoices(await listPurchaseInvoices(user.$id));
    } catch (error) {
      setFeedback({ message: error.message || 'Could not load invoices.', tone: 'danger' });
    } finally {
      setLoading(false);
    }
  }, [user?.$id]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  const stats = useMemo(() => getInvoiceStats(invoices), [invoices]);
  const suppliers = useMemo(
    () => [...new Set(invoices.map((invoice) => invoice.supplierName).filter(Boolean))],
    [invoices],
  );
  const hasActiveFilters = Boolean(
    filters.search ||
      filters.status !== 'All Invoices' ||
      filters.supplier !== 'All Suppliers' ||
      filters.dateFilter !== 'All Time' ||
      filters.sortBy !== 'Latest',
  );
  const filteredInvoices = useMemo(() => {
    const searchTerm = filters.search.trim().toLowerCase();
    const nextInvoices = invoices.filter((invoice) => {
      const itemNames = invoice.items.map((item) => item.productName).join(' ').toLowerCase();
      const matchesSearch =
        !searchTerm ||
        invoice.invoiceNumber.toLowerCase().includes(searchTerm) ||
        invoice.supplierName.toLowerCase().includes(searchTerm) ||
        String(invoice.supplierPhone || '').toLowerCase().includes(searchTerm) ||
        itemNames.includes(searchTerm);
      const matchesStatus = filters.status === 'All Invoices' || invoice.status === filters.status;
      const matchesSupplier = filters.supplier === 'All Suppliers' || invoice.supplierName === filters.supplier;
      const matchesDate = isWithinDateFilter(invoice.invoiceDate, filters.dateFilter);

      return matchesSearch && matchesStatus && matchesSupplier && matchesDate;
    });

    return [...nextInvoices].sort((a, b) => {
      if (filters.sortBy === 'Highest Amount') return b.totalAmount - a.totalAmount;
      if (filters.sortBy === 'Supplier Name') return a.supplierName.localeCompare(b.supplierName);
      if (filters.sortBy === 'Status') return a.status.localeCompare(b.status);
      return new Date(b.createdAt || b.invoiceDate) - new Date(a.createdAt || a.invoiceDate);
    });
  }, [filters, invoices]);

  function updateFilter(event) {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  }

  function clearFilters() {
    setFilters({
      search: '',
      status: 'All Invoices',
      supplier: 'All Suppliers',
      dateFilter: 'All Time',
      sortBy: 'Latest',
    });
  }

  async function saveReview(invoice) {
    if (!user?.$id) return;

    setActionLoading('review');
    try {
      await updatePurchaseInvoice(user.$id, invoice.id, {
        supplierName: invoice.supplierName,
        supplierPhone: invoice.supplierPhone,
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.invoiceDate,
        subtotal: invoice.subtotal,
        gstAmount: invoice.gstAmount,
        totalAmount: invoice.totalAmount,
        status: invoice.status,
      });
      await deleteInvoiceItemsForInvoice(user.$id, invoice.id);
      await Promise.all(
        invoice.items
          .filter((item) => item.productName)
          .map((item) => createInvoiceItem(user.$id, invoice.id, item)),
      );
      setFeedback({ message: 'AI review saved.', tone: 'success' });
      setModalState({ type: null, invoice: null });
      await loadInvoices();
    } catch (error) {
      setFeedback({ message: error.message || 'Could not save invoice review.', tone: 'danger' });
    } finally {
      setActionLoading('');
    }
  }

  async function parseInvoiceAi(invoice) {
    if (!user?.$id || !invoice?.id) return;

    setActionLoading(`ai-${invoice.id}`);
    setFeedback({
      message: 'AI is understanding supplier, GST, totals, and items...',
      tone: 'info',
    });

    try {
      const result = await parseInvoiceWithAi(invoice.id, {
        force: true,
        forceReplaceItems: true,
      });
      const refreshed = await getPurchaseInvoiceWithItems(user.$id, invoice.id);
      setFeedback({
        message: result.needsManualReview
          ? 'AI extraction completed but needs manual review.'
          : 'AI extraction completed. Please review before approval.',
        tone: result.needsManualReview ? 'warning' : 'success',
      });
      setModalState({ type: 'view', invoice: refreshed });
      await loadInvoices();
    } catch (error) {
      if (invoice.extractedText) {
        try {
          const parsed = parseInvoiceText(invoice.extractedText);
          await updatePurchaseInvoice(user.$id, invoice.id, {
            supplierName: parsed.supplierName || invoice.supplierName,
            supplierPhone: parsed.supplierPhone || invoice.supplierPhone,
            invoiceNumber: parsed.invoiceNumber || invoice.invoiceNumber,
            invoiceDate: parsed.invoiceDate || invoice.invoiceDate,
            subtotal: parsed.subtotal || invoice.subtotal,
            gstAmount: parsed.gstAmount || invoice.gstAmount,
            totalAmount: parsed.totalAmount || invoice.totalAmount,
            status: 'Pending Review',
            aiExtractedJson: JSON.stringify({
              source: 'tesseract_local_ocr',
              parser: 'local_rule_based_parser',
              warnings: parsed.warnings || [],
              parsedAt: new Date().toISOString(),
              parsedData: parsed,
              aiError: error.message || 'AI function unavailable.',
            }),
          });
          await deleteInvoiceItemsForInvoice(user.$id, invoice.id);
          await Promise.all(
            (parsed.items || [])
              .filter((item) => item.productName)
              .map((item) => createInvoiceItem(user.$id, invoice.id, item)),
          );
          const refreshed = await getPurchaseInvoiceWithItems(user.$id, invoice.id);
          setFeedback({
            message: 'AI is unavailable, so OCR text was re-parsed locally. Review items before approval.',
            tone: 'warning',
          });
          setModalState({ type: 'view', invoice: refreshed });
          await loadInvoices();
          return;
        } catch {
          // Continue to the AI error below so the user sees the original backend issue.
        }
      }

      setFeedback({
        message: error.message || 'AI could not parse this invoice. Try again or review manually.',
        tone: 'danger',
      });
    } finally {
      setActionLoading('');
    }
  }

  async function openApproveModal(invoice) {
    if (!user?.$id || !invoice?.id) return;

    setFeedback({ message: '', tone: 'info' });
    setModalState({ type: 'approve', invoice });
    setApprovalReview(null);
    setActionLoading('prepare-approval');

    try {
      setApprovalReview(await getPurchaseInvoiceInventoryReview(user.$id, invoice.id));
    } catch (error) {
      setFeedback({ message: error.message || 'Could not prepare inventory review.', tone: 'danger' });
    } finally {
      setActionLoading('');
    }
  }

  useEffect(() => {
    const requestedInvoiceId = location.state?.approveInvoiceId;
    if (!requestedInvoiceId || loading || handledApprovalId === requestedInvoiceId) return;

    const invoice = invoices.find((item) => item.id === requestedInvoiceId);
    if (!invoice) return;

    setHandledApprovalId(requestedInvoiceId);
    openApproveModal(invoice);
    navigate(location.pathname, { replace: true, state: {} });
  }, [handledApprovalId, invoices, loading, location.pathname, location.state, navigate]);

  async function approveInvoice(inventoryDecisions) {
    if (!user?.$id || !modalState.invoice) return;

    setActionLoading('approve');
    try {
      const approved = await approvePurchaseInvoice(user.$id, modalState.invoice.id, inventoryDecisions);
      const result = approved.inventoryUpdateResult;
      setFeedback({
        message: approved.supplierUpdateWarning
          ? `Invoice approved. ${result?.updatedCount || 0} products updated and ${result?.createdCount || 0} products created. Supplier warning: ${approved.supplierUpdateWarning}`
          : result
            ? `Invoice approved. ${result.updatedCount} products updated and ${result.createdCount} products created.`
            : 'Invoice approved and inventory updated.',
        tone: approved.supplierUpdateWarning ? 'warning' : 'success',
      });
      setModalState({ type: null, invoice: null });
      setApprovalReview(null);
      await loadInvoices();
    } catch (error) {
      setFeedback({ message: error.message || 'Could not approve invoice.', tone: 'danger' });
    } finally {
      setActionLoading('');
    }
  }

  async function deleteInvoice(options) {
    if (!user?.$id || !modalState.invoice) return;

    setActionLoading('delete');
    try {
      await deletePurchaseInvoice(user.$id, modalState.invoice.id, options);
      setFeedback({ message: 'Invoice deleted successfully.', tone: 'success' });
      setModalState({ type: null, invoice: null });
      await loadInvoices();
    } catch (error) {
      setFeedback({ message: error.message || 'Could not delete invoice.', tone: 'danger' });
    } finally {
      setActionLoading('');
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        action={
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={loadInvoices} variant="secondary">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button variant="secondary">
              <Send className="h-4 w-4" />
              Export
            </Button>
            <Button as={Link} to="/invoice-scanner">
              <FileSearch className="h-4 w-4" />
              Scan Invoice
            </Button>
          </div>
        }
        subtitle="Review scanned invoices, extracted data, GST totals, and supplier purchase history."
        title="Invoices"
      />

      <FeedbackBanner
        message={feedback.message}
        onDismiss={() => setFeedback({ message: '', tone: 'info' })}
        tone={feedback.tone}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={ReceiptText} status="info" title="Total Invoices" trend="Stored in Appwrite" value={String(stats.totalInvoices)} />
        <StatCard icon={FileCheck2} status="success" title="Approved" trend="Owner reviewed" value={String(stats.approved)} />
        <StatCard icon={Clock} status="warning" title="Pending Review" trend="Needs owner check" value={String(stats.pendingReview)} />
        <StatCard icon={IndianRupee} status="success" title="Total Purchase Value" trend="Excludes rejected" value={formatCurrency(stats.totalPurchaseValue)} />
      </section>

      <Card className="overflow-hidden bg-gradient-to-br from-slate-950 to-indigo-950 text-white">
        <div className="grid gap-5 lg:grid-cols-[auto_1fr_auto] lg:items-center">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-cyan-200">
            <WandSparkles className="h-6 w-6" />
          </div>
          <div>
            <Badge className="bg-white/10 text-cyan-100 ring-white/15" variant="neutral">AI Insight</Badge>
            <p className="mt-3 max-w-3xl text-lg font-bold leading-7 text-white">
              {getInvoiceInsight(invoices, stats)}
            </p>
          </div>
          <Button onClick={() => setFilters((current) => ({ ...current, status: 'Pending Review' }))} variant="secondary">
            <Sparkles className="h-4 w-4" />
            Review pending invoices
          </Button>
        </div>
      </Card>

      <InvoiceInsights invoices={invoices} />
      <InvoiceScannerCTA />
      <InvoiceFilters filters={filters} onChange={updateFilter} onClear={clearFilters} suppliers={suppliers} />

      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-950">Purchase Invoices</h2>
            <p className="mt-1 text-sm text-slate-500">
              Showing {filteredInvoices.length} of {invoices.length} Appwrite invoice records.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
            <FileText className="h-4 w-4 text-indigo-500" />
            Files stay private in Appwrite Storage
          </div>
        </div>
      </Card>

      {loading ? (
        <LoadingState />
      ) : filteredInvoices.length ? (
        <>
          <InvoiceTable
            actionLoading={actionLoading}
            invoices={filteredInvoices}
            onAiParse={parseInvoiceAi}
            onApprove={openApproveModal}
            onDelete={(invoice) => setModalState({ type: 'delete', invoice })}
            onReview={(invoice) => setModalState({ type: 'review', invoice })}
            onView={(invoice) => setModalState({ type: 'view', invoice })}
          />
          <div className="grid gap-4 xl:hidden">
            {filteredInvoices.map((invoice) => (
              <InvoiceCard
                invoice={invoice}
                key={invoice.id}
                actionLoading={actionLoading}
                onAiParse={parseInvoiceAi}
                onApprove={openApproveModal}
                onDelete={(selectedInvoice) => setModalState({ type: 'delete', invoice: selectedInvoice })}
                onReview={(selectedInvoice) => setModalState({ type: 'review', invoice: selectedInvoice })}
                onView={(selectedInvoice) => setModalState({ type: 'view', invoice: selectedInvoice })}
              />
            ))}
          </div>
        </>
      ) : (
        <EmptyState isInitialEmpty={!invoices.length && !hasActiveFilters} onClear={clearFilters} />
      )}

      {modalState.type === 'view' && modalState.invoice ? (
        <InvoiceDetailsModal
          actionLoading={actionLoading}
          invoice={modalState.invoice}
          onAiParse={parseInvoiceAi}
          onApprove={openApproveModal}
          onClose={() => setModalState({ type: null, invoice: null })}
        />
      ) : null}

      {modalState.type === 'review' && modalState.invoice ? (
        <InvoiceReviewModal
          invoice={modalState.invoice}
          loading={actionLoading === 'review'}
          onClose={() => setModalState({ type: null, invoice: null })}
          onSave={saveReview}
        />
      ) : null}

      {modalState.type === 'approve' && modalState.invoice ? (
        <ApproveInvoiceModal
          errorMessage={feedback.tone === 'danger' ? feedback.message : ''}
          inventoryReview={approvalReview}
          invoice={modalState.invoice}
          loading={actionLoading === 'approve'}
          reviewLoading={actionLoading === 'prepare-approval'}
          onCancel={() => {
            setModalState({ type: null, invoice: null });
            setApprovalReview(null);
          }}
          onConfirm={approveInvoice}
        />
      ) : null}

      {modalState.type === 'delete' && modalState.invoice ? (
        <DeleteConfirmModal
          invoice={modalState.invoice}
          loading={actionLoading === 'delete'}
          onCancel={() => setModalState({ type: null, invoice: null })}
          onConfirm={deleteInvoice}
        />
      ) : null}
    </div>
  );
}
