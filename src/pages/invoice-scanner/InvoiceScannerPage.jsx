import { AnimatePresence, motion } from 'framer-motion';
import {
  Building2,
  Check,
  CircleAlert,
  Clock,
  Copy,
  Eye,
  FileScan,
  FileText,
  FileUp,
  Info,
  PackageCheck,
  Pencil,
  RefreshCw,
  ScanLine,
  SearchX,
  Sparkles,
  TimerReset,
  Trash2,
  UploadCloud,
  WandSparkles,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCallback, useEffect, useRef, useState } from 'react';
import Badge from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import Input from '../../components/common/Input.jsx';
import SectionHeader from '../../components/common/SectionHeader.jsx';
import StatCard from '../../components/common/StatCard.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  deleteInvoiceFile,
  uploadInvoiceFile,
} from '../../services/invoiceStorageService.js';
import { parseInvoiceWithAi } from '../../services/aiInvoiceService.js';
import { extractTextFromImage, isOcrSupportedFile } from '../../services/ocrService.js';
import {
  approvePurchaseInvoice,
  createInvoiceItem,
  createPurchaseInvoice,
  deletePurchaseInvoice,
  deleteInvoiceItemsForInvoice,
  getPurchaseInvoiceWithItems,
  listPurchaseInvoices,
  updatePurchaseInvoice,
} from '../../services/purchaseInvoiceService.js';
import {
  formatCurrency,
  formatDate,
  formatDuration,
  formatFileSize,
  getAiConfidenceBadge,
  getAiConfidenceLevel,
  getAiReviewStatusBadge,
  getInvoiceScanStatusBadge,
  getOcrConfidenceBadge,
  getOcrConfidenceLevel,
} from '../../utils/formatters.js';
import { getAiSourceLabel } from '../../utils/aiErrors.js';
import { parseInvoiceText } from '../../utils/invoiceTextParser.js';

const initialScanState = {
  status: 'idle',
  stepIndex: -1,
  progress: 0,
  error: '',
  successMessage: '',
};

const initialOcrMeta = {
  engineStatus: 'Waiting',
  currentStep: '',
  progress: 0,
  durationMs: 0,
  confidence: null,
};

const ocrScanSteps = [
  'Uploading invoice',
  'Preparing OCR engine',
  'Reading invoice image',
  'Extracting text',
  'Parsing invoice fields',
  'Ready for review',
];

function todayInputDate() {
  return new Date().toISOString().slice(0, 10);
}

function scanStepIndexForProgress(progress = 0) {
  if (progress < 15) return 1;
  if (progress < 55) return 2;
  if (progress < 90) return 3;
  return 4;
}

function toRecentScan(invoice) {
  return {
    id: invoice.id,
    supplier: invoice.supplierName,
    invoiceNumber: invoice.invoiceNumber,
    amount: invoice.totalAmount,
    itemsCount: invoice.itemCount || invoice.items?.length || 0,
    status: invoice.status,
    date: invoice.invoiceDate,
    invoice,
  };
}

function toScannerInvoice(invoice) {
  if (!invoice) return null;
  let metadata = {};

  try {
    metadata = invoice.aiExtractedJson ? JSON.parse(invoice.aiExtractedJson) : {};
  } catch {
    metadata = {};
  }
  const aiResult = metadata.aiResult || {};
  const aiInvoice = aiResult.invoice || {};
  const aiSupplier = aiResult.supplier || {};
  const aiConfidence = aiResult.confidence?.overall;

  return {
    ...invoice,
    ocrText: invoice.extractedText || invoice.ocrText || '',
    status: invoice.status || 'Pending Review',
    supplierName: invoice.supplierName || aiSupplier.name || 'Unknown Supplier',
    supplierPhone: invoice.supplierPhone || aiSupplier.phone || '',
    invoiceNumber: invoice.invoiceNumber || aiInvoice.invoiceNumber || '',
    confidence: metadata.confidence ?? aiConfidence ?? null,
    aiConfidence: aiConfidence ?? null,
    needsManualReview: Boolean(aiResult.needsManualReview),
    warnings: aiResult.warnings || metadata.warnings || [],
    parsedAt: metadata.parsedAt || '',
    ocrSource: metadata.source || '',
    aiModel: metadata.model || '',
    deterministicChecks: metadata.deterministicChecks || null,
    items: (invoice.items || []).map((item) => ({
      ...item,
      currentStock: item.currentStock ?? '-',
      newStock: item.newStock ?? '-',
      inventoryAction: item.inventoryAction || `Increase stock by ${item.quantity}`,
    })),
  };
}

function buildScannerInvoiceFromParsed(parsed, ocrText, ocrResult, status = 'Pending Review') {
  return {
    supplierName: parsed.supplierName,
    supplierPhone: parsed.supplierPhone,
    invoiceNumber: parsed.invoiceNumber,
    invoiceDate: parsed.invoiceDate,
    subtotal: parsed.subtotal,
    gstAmount: parsed.gstAmount,
    totalAmount: parsed.totalAmount,
    status,
    ocrText,
    confidence: ocrResult?.confidence ?? null,
    durationMs: ocrResult?.durationMs || 0,
    warnings: parsed.warnings || [],
    parsedAt: new Date().toISOString(),
    ocrSource: 'tesseract_local_ocr',
    items: parsed.items || [],
  };
}

function buildOcrMetadata(parsed, ocrResult, extra = {}) {
  return {
    source: 'tesseract_local_ocr',
    parser: 'local_rule_based_parser',
    confidence: ocrResult?.confidence ?? null,
    durationMs: ocrResult?.durationMs || 0,
    warnings: parsed?.warnings || [],
    parsedAt: new Date().toISOString(),
    parsedData: parsed || {},
    ...extra,
  };
}

function ModalShell({ children, onClose, size = 'max-w-xl' }) {
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

function InvoiceUploadCard({ file, onFileChange, onStartScan, scanState }) {
  const inputRef = useRef(null);

  return (
    <Card className="h-full" variant="glass">
      <div className="flex flex-col items-center rounded-3xl border border-dashed border-indigo-200 bg-indigo-50/50 p-6 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-3xl bg-white text-indigo-600 shadow-sm">
          <UploadCloud className="h-8 w-8" />
        </div>
        <h2 className="mt-5 text-2xl font-black tracking-tight text-slate-950">
          Drop invoice image here
        </h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
          Supports JPG, PNG, WEBP, and PDF. OCR works best with JPG, PNG, or WEBP.
        </p>

        <input
          accept="image/*,.pdf"
          className="hidden"
          onChange={onFileChange}
          ref={inputRef}
          type="file"
        />
        <Button className="mt-6" onClick={() => inputRef.current?.click()} variant="secondary">
          <FileUp className="h-4 w-4" />
          Choose File
        </Button>

        <p className="mt-4 text-xs font-semibold text-slate-400">
          OCR runs locally first. AI parsing runs through your secure Appwrite Function.
        </p>
      </div>

      {file ? (
        <div className="mt-5 rounded-3xl bg-slate-50 p-4">
          <p className="text-sm font-black text-slate-950">{file.name}</p>
          <p className="mt-1 text-sm text-slate-500">{formatFileSize(file.size)}</p>
          <Button
            className="mt-4 w-full"
            loading={scanState.status === 'processing'}
            onClick={onStartScan}
            rounded="2xl"
          >
            <ScanLine className="h-4 w-4" />
            Start OCR Scan
          </Button>
        </div>
      ) : (
        <Button className="mt-5 w-full" onClick={onStartScan} rounded="2xl">
          <ScanLine className="h-4 w-4" />
          Start OCR Scan
        </Button>
      )}

      {scanState.error ? (
        <p className="mt-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">
          {scanState.error}
        </p>
      ) : null}
    </Card>
  );
}

function ScanProgressCard({ ocrMeta = {}, scanState }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-950">OCR scan process</h2>
          <p className="mt-1 text-sm text-slate-500">
            OCR may take a few seconds depending on image quality.
          </p>
        </div>
        <Badge variant={getInvoiceScanStatusBadge(scanState.status)}>
          {scanState.status === 'idle' ? 'Ready' : scanState.status}
        </Badge>
      </div>

      <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
        <motion.div
          animate={{ width: `${scanState.progress}%` }}
          className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-cyan-400"
          transition={{ duration: 0.3 }}
        />
      </div>

      {ocrMeta.currentStep ? (
        <p className="mt-3 text-sm font-semibold text-slate-600">
          {ocrMeta.currentStep} {ocrMeta.progress ? `- ${ocrMeta.progress}%` : ''}
        </p>
      ) : null}

      <div className="mt-5 space-y-3">
        {ocrScanSteps.map((step, index) => {
          const isCompleted = index < scanState.stepIndex || scanState.status === 'extracted' || scanState.status === 'approved';
          const isProcessing = index === scanState.stepIndex && scanState.status === 'processing';
          return (
            <div className="flex items-center gap-3" key={step}>
              <div
                className={`grid h-8 w-8 place-items-center rounded-full ${
                  isCompleted
                    ? 'bg-emerald-50 text-emerald-600'
                    : isProcessing
                      ? 'bg-amber-50 text-amber-600'
                      : 'bg-slate-100 text-slate-400'
                }`}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-950">{step}</p>
                <p className="text-xs font-semibold text-slate-400">
                  {isCompleted ? 'Completed' : isProcessing ? 'Processing' : 'Pending'}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function InvoicePreviewCard({ file, previewUrl, scanState }) {
  const status =
    scanState.status === 'processing'
      ? 'Processing'
      : scanState.status === 'extracted' || scanState.status === 'approved'
        ? 'Extracted'
        : file
          ? 'Ready'
          : 'Ready';

  return (
    <Card>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-950">Invoice preview</h2>
          <p className="mt-1 text-sm text-slate-500">
            Selected invoice appears here before review.
          </p>
        </div>
        <Badge variant={getInvoiceScanStatusBadge(status)}>{status}</Badge>
      </div>

      <div className="mt-5 overflow-hidden rounded-3xl border border-slate-100 bg-slate-50">
        {file ? (
          previewUrl ? (
            <img
              alt="Selected invoice preview"
              className="max-h-80 w-full object-cover"
              src={previewUrl}
            />
          ) : (
            <div className="grid min-h-64 place-items-center p-6 text-center">
              <FileText className="mx-auto h-12 w-12 text-indigo-500" />
              <p className="mt-4 font-black text-slate-950">{file.name}</p>
              <p className="mt-1 text-sm text-slate-500">{formatFileSize(file.size)}</p>
            </div>
          )
        ) : (
          <div className="grid min-h-64 place-items-center p-6 text-center">
            <FileText className="mx-auto h-12 w-12 text-slate-400" />
            <p className="mt-4 font-black text-slate-950">
              Invoice preview will appear here
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}

function OcrTextPanel({ invoice }) {
  if (!invoice) {
    return null;
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div>
          <Badge variant="success">OCR Extracted</Badge>
          <h2 className="mt-3 text-xl font-black text-slate-950">Extracted OCR text</h2>
        </div>
        <Button size="sm" variant="secondary">
          <Copy className="h-4 w-4" />
          Copy
        </Button>
      </div>
      <pre className="mt-5 overflow-x-auto rounded-3xl bg-slate-950 p-5 text-sm leading-6 text-slate-100">
        {invoice.ocrText}
      </pre>
    </Card>
  );
}

function OcrStatusCard({ invoice, ocrMeta }) {
  return (
    <Card>
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-cyan-50 text-cyan-600">
          <FileScan className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-black text-slate-950">OCR status</h2>
          <p className="mt-1 text-sm text-slate-500">
            Tesseract.js runs locally in this browser. No OCR text is sent to AI.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              ['Engine status', ocrMeta.engineStatus || (invoice ? 'Completed' : 'Waiting')],
              ['Current step', ocrMeta.currentStep || 'Ready'],
              ['Progress', `${scanPercent(ocrMeta.progress)}%`],
              ['Time taken', invoice?.durationMs ? formatDuration(invoice.durationMs) : 'Not available'],
              [
                'Confidence',
                invoice?.confidence !== null && invoice?.confidence !== undefined
                  ? `${Math.round(invoice.confidence)}%`
                  : 'Not available',
              ],
            ].map(([label, value]) => (
              <div className="rounded-2xl bg-slate-50 p-3" key={label}>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
                <p className="mt-1 font-black text-slate-950">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

function scanPercent(value) {
  return Math.max(0, Math.min(100, Number(value || 0)));
}

function OcrQualityCard({ invoice }) {
  if (!invoice) return null;

  return (
    <Card>
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
          <Info className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-950">OCR result quality</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant={getOcrConfidenceBadge(invoice.confidence)}>
              {getOcrConfidenceLevel(invoice.confidence)}
            </Badge>
            {invoice.parsedAt ? <Badge>Parsed {formatDate(invoice.parsedAt)}</Badge> : null}
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Always review OCR results before approving inventory updates.
          </p>
        </div>
      </div>
    </Card>
  );
}

function OcrWarningsCard({ warnings = [] }) {
  if (!warnings.length) return null;

  return (
    <Card>
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-amber-50 text-amber-600">
          <CircleAlert className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-950">Please review these fields</h2>
          <ul className="mt-3 space-y-2 text-sm font-semibold text-slate-600">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}

function AiExtractionPanel({ invoice }) {
  if (!invoice) {
    return null;
  }
  const isAiParsed = ['openai_appwrite_function', 'openrouter_appwrite_function'].includes(invoice.ocrSource);

  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-950">
            {isAiParsed ? 'AI Extracted Data' : 'OCR Parser'}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {isAiParsed
              ? 'Parsed securely by the Appwrite Function. Review before approval.'
              : 'Local rule-based parsing. Run AI extraction for stronger structured review.'}
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Badge variant="info">{invoice.status}</Badge>
          {isAiParsed ? (
            <Badge variant={getAiReviewStatusBadge(invoice.needsManualReview)}>
              {invoice.needsManualReview ? 'Needs Review' : 'Ready for Review'}
            </Badge>
          ) : null}
        </div>
      </div>

      {isAiParsed ? (
        <div className="mt-5 grid gap-3 rounded-3xl bg-indigo-50 p-4 sm:grid-cols-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-indigo-400">Source</p>
            <p className="mt-1 text-sm font-black text-slate-950">{getAiSourceLabel(invoice.ocrSource)}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-indigo-400">Model</p>
            <p className="mt-1 text-sm font-black text-slate-950">{invoice.aiModel || 'Configured model'}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-indigo-400">Confidence</p>
            <Badge className="mt-1" variant={getAiConfidenceBadge(invoice.aiConfidence)}>
              {getAiConfidenceLevel(invoice.aiConfidence)}
            </Badge>
          </div>
        </div>
      ) : null}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {[
          ['Supplier', invoice.supplierName],
          ['Invoice Number', invoice.invoiceNumber],
          ['Invoice Date', formatDate(invoice.invoiceDate)],
          ['Supplier Phone', invoice.supplierPhone],
          ['Subtotal', formatCurrency(invoice.subtotal)],
          ['GST Amount', formatCurrency(invoice.gstAmount)],
          ['Total Amount', formatCurrency(invoice.totalAmount)],
          ['Status', invoice.status],
        ].map(([label, value]) => (
          <div className="rounded-2xl bg-slate-50 p-4" key={label}>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              {label}
            </p>
            <p className="mt-1 font-black text-slate-950">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 space-y-3">
        {invoice.items.length ? invoice.items.map((item) => (
          <div
            className="rounded-3xl border border-slate-100 bg-white p-4"
            key={item.productName}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-black text-slate-950">{item.productName}</p>
                <p className="mt-1 text-sm text-slate-500">
                  Quantity: {item.quantity} · GST: {item.gstPercentage}%
                </p>
              </div>
              <div className="text-left sm:text-right">
                <p className="font-black text-slate-950">
                  {formatCurrency(item.amount)}
                </p>
                <Badge className="mt-2" variant="success">
                  {item.inventoryAction}
                </Badge>
              </div>
            </div>
          </div>
        )) : (
          <div className="rounded-3xl border border-amber-100 bg-amber-50 p-4 text-sm font-semibold text-amber-700">
            No line items detected. Add or edit items during review.
          </div>
        )}
      </div>
    </Card>
  );
}

function InventoryUpdatePreview({ invoice }) {
  if (!invoice) {
    return null;
  }

  return (
    <Card>
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
          <PackageCheck className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-950">
            Inventory update preview
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {invoice.items.length || 0} parsed products will update stock after approval.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {invoice.items.length ? invoice.items.map((item) => (
          <div
            className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4"
            key={item.productName}
          >
            <p className="font-black text-slate-950">{item.productName}</p>
            <div className="flex items-center gap-2">
              <Badge>Current Stock {item.currentStock}</Badge>
              <Badge variant="success">New Stock {item.newStock}</Badge>
            </div>
          </div>
        )) : (
          <p className="rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-700">
            No inventory line items were detected by OCR. Add items during review.
          </p>
        )}
      </div>
    </Card>
  );
}

function SupplierUpdatePreview({ invoice }) {
  if (!invoice) {
    return null;
  }

  return (
    <Card>
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
          <Building2 className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-950">
            Supplier Update Preview
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Existing supplier found and ready to link.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-3 rounded-3xl bg-slate-50 p-4 text-sm">
        <p>
          <span className="font-bold text-slate-950">Supplier:</span>{' '}
          {invoice.supplierName}
        </p>
        <p>New invoice will be linked.</p>
        <p>Total purchase will increase by {formatCurrency(invoice.totalAmount)}.</p>
        <p>Last invoice date will update to {formatDate(invoice.invoiceDate)}.</p>
      </div>
    </Card>
  );
}

function ReviewActions({
  actionLoading,
  invoice,
  onAiParse,
  onApprove,
  onDiscard,
  onEdit,
  scanState,
}) {
  if (!invoice) {
    return null;
  }

  return (
    <Card>
      {scanState.successMessage ? (
        <div className="mb-5 rounded-3xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-semibold leading-6 text-emerald-700">
          {scanState.successMessage}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          className="w-full sm:w-auto"
          disabled={!invoice.ocrText || invoice.status === 'Approved'}
          loading={actionLoading === 'ai-parse'}
          onClick={onAiParse}
          rounded="2xl"
          variant="secondary"
        >
          <Sparkles className="h-4 w-4" />
          Parse with AI
        </Button>
        <Button
          className="w-full sm:w-auto"
          disabled={scanState.status === 'approved'}
          loading={actionLoading === 'approve'}
          onClick={onApprove}
          rounded="2xl"
        >
          <PackageCheck className="h-4 w-4" />
          Approve & Update Inventory
        </Button>
        <Button className="w-full sm:w-auto" onClick={onEdit} rounded="2xl" variant="secondary">
          <Pencil className="h-4 w-4" />
          Edit Extracted Data
        </Button>
        <Button className="w-full sm:w-auto" onClick={onDiscard} rounded="2xl" variant="danger">
          <Trash2 className="h-4 w-4" />
          Discard
        </Button>
      </div>
    </Card>
  );
}

function RecentScansTable({ onDelete, onReview, onView, scans }) {
  if (!scans.length) {
    return (
      <Card className="text-center" padding="lg">
        <SearchX className="mx-auto h-10 w-10 text-slate-400" />
        <h2 className="mt-4 text-xl font-black text-slate-950">
          No scanned invoices yet
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Start by uploading a supplier invoice.
        </p>
      </Card>
    );
  }

  return (
    <>
      <Card className="hidden overflow-hidden xl:block" padding="none">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-separate border-spacing-0">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-400">
                <th className="px-5 py-4">Supplier</th>
                <th className="px-5 py-4">Invoice No.</th>
                <th className="px-5 py-4">Amount</th>
                <th className="px-5 py-4">Items</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Date</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {scans.map((scan) => (
                <tr key={scan.id}>
                  <td className="border-t border-slate-100 px-5 py-4 font-black text-slate-950">
                    {scan.supplier}
                  </td>
                  <td className="border-t border-slate-100 px-5 py-4 text-sm font-bold text-slate-600">
                    {scan.invoiceNumber}
                  </td>
                  <td className="border-t border-slate-100 px-5 py-4 text-sm font-black text-slate-950">
                    {formatCurrency(scan.amount)}
                  </td>
                  <td className="border-t border-slate-100 px-5 py-4 text-sm text-slate-500">
                    {scan.itemsCount} items
                  </td>
                  <td className="border-t border-slate-100 px-5 py-4">
                    <Badge variant={getInvoiceScanStatusBadge(scan.status)}>
                      {scan.status}
                    </Badge>
                  </td>
                  <td className="border-t border-slate-100 px-5 py-4 text-sm text-slate-500">
                    {formatDate(scan.date)}
                  </td>
                  <td className="border-t border-slate-100 px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <Button onClick={() => onView(scan)} size="sm" variant="secondary">
                        <Eye className="h-4 w-4" />
                        View
                      </Button>
                      <Button onClick={() => onReview(scan)} size="sm" variant="secondary">
                        Review
                      </Button>
                      <Button onClick={() => onDelete(scan)} size="sm" variant="danger">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-4 xl:hidden">
        {scans.map((scan) => (
          <Card hover key={scan.id}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-black text-slate-950">{scan.supplier}</p>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  {scan.invoiceNumber}
                </p>
              </div>
              <Badge variant={getInvoiceScanStatusBadge(scan.status)}>
                {scan.status}
              </Badge>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 rounded-3xl bg-slate-50 p-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Amount
                </p>
                <p className="mt-1 font-black text-slate-950">
                  {formatCurrency(scan.amount)}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Items
                </p>
                <p className="mt-1 font-black text-slate-950">{scan.itemsCount}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Date
                </p>
                <p className="mt-1 font-black text-slate-950">
                  {formatDate(scan.date)}
                </p>
              </div>
            </div>
            <div className="mt-5 flex gap-2">
              <Button className="flex-1" onClick={() => onView(scan)} size="sm" variant="secondary">
                View
              </Button>
              <Button className="flex-1" onClick={() => onReview(scan)} size="sm" variant="secondary">
                Review
              </Button>
              <Button className="flex-1" onClick={() => onDelete(scan)} size="sm" variant="danger">
                Delete
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}

function ExtractionEditModal({ invoice, onClose, onSave }) {
  const [values, setValues] = useState({
    supplierName: invoice.supplierName,
    supplierPhone: invoice.supplierPhone || '',
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: invoice.invoiceDate,
    subtotal: String(invoice.subtotal || 0),
    gstAmount: String(invoice.gstAmount || 0),
    totalAmount: String(invoice.totalAmount),
    status: invoice.status || 'Pending Review',
    items: invoice.items.map((item) => ({ ...item })),
  });

  function updateField(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
  }

  function updateQuantity(index, value) {
    setValues((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              quantity: value,
              inventoryAction: `Increase stock by ${String(value).split(' ')[0] || 0}`,
            }
          : item,
      ),
    }));
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
          quantity: '',
          unit: '',
          amount: '',
          gstPercentage: '',
          inventoryAction: 'Review inventory action',
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
        quantity: Number(item.quantity || 0),
        amount: Number(item.amount || 0),
        gstPercentage: Number(item.gstPercentage || 0),
      })),
    });
  }

  return (
    <ModalShell onClose={onClose}>
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-indigo-600">Local edit mode</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
              Edit Extracted Data
            </h2>
          </div>
          <button
            aria-label="Close edit modal"
            className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-950"
            onClick={onClose}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Input
            label="Supplier name"
            name="supplierName"
            onChange={updateField}
            value={values.supplierName}
          />
          <Input
            label="Supplier phone"
            name="supplierPhone"
            onChange={updateField}
            value={values.supplierPhone}
          />
          <Input
            label="Invoice number"
            name="invoiceNumber"
            onChange={updateField}
            value={values.invoiceNumber}
          />
          <Input
            label="Invoice date"
            name="invoiceDate"
            onChange={updateField}
            type="date"
            value={values.invoiceDate}
          />
          <Input
            label="Subtotal"
            name="subtotal"
            onChange={updateField}
            type="number"
            value={values.subtotal}
          />
          <Input
            label="GST amount"
            name="gstAmount"
            onChange={updateField}
            type="number"
            value={values.gstAmount}
          />
          <Input
            label="Total amount"
            name="totalAmount"
            onChange={updateField}
            type="number"
            value={values.totalAmount}
          />
          <SelectControl
            label="Status"
            name="status"
            onChange={updateField}
            value={values.status}
          >
            {['Uploaded', 'Pending Review', 'Processing', 'Approved', 'Failed OCR', 'Rejected'].map((status) => (
              <option key={status}>{status}</option>
            ))}
          </SelectControl>
        </div>

        <div className="mt-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="font-black text-slate-950">Line items</p>
            <Button onClick={addItem} size="sm" variant="secondary">
              Add Item
            </Button>
          </div>
          {values.items.map((item, index) => (
            <div className="rounded-3xl bg-slate-50 p-4" key={`${item.productName}-${index}`}>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="Product name"
                  name={`productName-${index}`}
                  onChange={(event) => updateItem(index, 'productName', event.target.value)}
                  value={item.productName}
                />
                <Input
                  label="Quantity"
                  name={`quantity-${index}`}
                  onChange={(event) => updateQuantity(index, event.target.value)}
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
                  value={String(item.amount || '')}
                />
                <Input
                  label="GST %"
                  name={`gst-${index}`}
                  onChange={(event) => updateItem(index, 'gstPercentage', event.target.value)}
                  type="number"
                  value={String(item.gstPercentage || '')}
                />
                <Button onClick={() => removeItem(index)} rounded="2xl" variant="danger">
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button onClick={onClose} rounded="2xl" variant="secondary">
            Cancel
          </Button>
          <Button onClick={handleSave} rounded="2xl">
            Save Changes
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}

function ConfirmDiscardModal({ onCancel, onConfirm }) {
  return (
    <ModalShell onClose={onCancel} size="max-w-md">
      <div className="p-5 sm:p-6">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-rose-50 text-rose-600">
          <Trash2 className="h-6 w-6" />
        </div>
        <h2 className="mt-5 text-2xl font-black tracking-tight text-slate-950">
          Discard this scan?
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          The selected file and extracted local data will be reset.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button onClick={onCancel} rounded="2xl" variant="secondary">
            Cancel
          </Button>
          <Button onClick={onConfirm} rounded="2xl" variant="danger">
            Discard
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}

function OcrTipsCard() {
  const tips = [
    'Use a clear invoice photo.',
    'Avoid shadows and blur.',
    'Keep invoice flat.',
    'Crop unnecessary background.',
    'Make sure totals and item names are visible.',
  ];

  return (
    <Card>
      <h2 className="text-xl font-black text-slate-950">Tips for better OCR</h2>
      <ul className="mt-4 space-y-2 text-sm font-semibold text-slate-600">
        {tips.map((tip) => (
          <li className="flex gap-2" key={tip}>
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            {tip}
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default function InvoiceScannerPage() {
  const { user } = useAuth();
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [scanState, setScanState] = useState(initialScanState);
  const [ocrMeta, setOcrMeta] = useState(initialOcrMeta);
  const [extractedInvoice, setExtractedInvoice] = useState(null);
  const [savedInvoice, setSavedInvoice] = useState(null);
  const [recentScans, setRecentScans] = useState([]);
  const [loadingScans, setLoadingScans] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [modalState, setModalState] = useState({ type: null, scan: null });

  const loadRecentScans = useCallback(async () => {
    if (!user?.$id) return;

    setLoadingScans(true);
    try {
      const invoices = await listPurchaseInvoices(user.$id);
      setRecentScans(invoices.map(toRecentScan));
    } catch (error) {
      setScanState((current) => ({
        ...current,
        error: error.message || 'Could not load recent scanned invoices.',
      }));
    } finally {
      setLoadingScans(false);
    }
  }, [user?.$id]);

  useEffect(() => {
    loadRecentScans();
  }, [loadRecentScans]);

  useEffect(() => {
    if (!selectedFile || !selectedFile.type.startsWith('image/')) {
      setPreviewUrl('');
      return undefined;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setSelectedFile(file);
    setExtractedInvoice(null);
    setSavedInvoice(null);
    setOcrMeta(initialOcrMeta);
    setScanState({
      ...initialScanState,
      status: 'ready',
      error: '',
    });
  }

  async function startScan() {
    if (!user?.$id) {
      setScanState((current) => ({
        ...current,
        error: 'Please login before scanning invoices.',
      }));
      return;
    }

    if (!selectedFile) {
      setScanState((current) => ({
        ...current,
        error: 'Please choose an invoice file first.',
      }));
      return;
    }

    let uploadedFile = null;
    let uploadWarning = '';
    setExtractedInvoice(null);
    setSavedInvoice(null);
    setOcrMeta({
      ...initialOcrMeta,
      engineStatus: 'Preparing',
      currentStep: 'Uploading invoice',
      progress: 0,
    });
    setScanState({
      status: 'processing',
      stepIndex: 0,
      progress: 8,
      error: '',
      successMessage: '',
    });

    try {
      setActionLoading('upload');
      try {
        uploadedFile = await uploadInvoiceFile(user.$id, selectedFile);
      } catch (uploadError) {
        uploadWarning = uploadError.message || 'Invoice file upload failed.';
      }
      setScanState((current) => ({
        ...current,
        stepIndex: 1,
        progress: 18,
        error: uploadWarning
          ? `${uploadWarning} OCR will continue and save the invoice without a file attachment.`
          : '',
      }));
      setOcrMeta((current) => ({
        ...current,
        engineStatus: uploadedFile ? 'Uploaded' : 'Upload skipped',
        currentStep: 'Preparing OCR engine',
        progress: 18,
      }));

      if (!isOcrSupportedFile(selectedFile)) {
        if (!uploadedFile) {
          throw new Error(
            `${uploadWarning || 'Invoice file upload failed.'} PDF files cannot be OCR-processed in the browser yet.`,
          );
        }

        const parsed = {
          supplierName: 'Unknown Supplier',
          supplierPhone: '',
          invoiceNumber: '',
          invoiceDate: todayInputDate(),
          subtotal: 0,
          gstAmount: 0,
          totalAmount: 0,
          confidence: null,
          warnings: [
            'PDF OCR is not enabled in the browser yet. Upload JPG, PNG, or WEBP for OCR extraction.',
          ],
          items: [],
        };
        const metadata = buildOcrMetadata(parsed, null, {
          source: 'upload_only_pdf',
          fileName: selectedFile.name,
        });
        const createdInvoice = await createPurchaseInvoice(
          user.$id,
          {
            supplierName: parsed.supplierName,
            supplierPhone: '',
            invoiceDate: parsed.invoiceDate,
            subtotal: 0,
            gstAmount: 0,
            totalAmount: 0,
            status: 'Uploaded',
            inventoryUpdated: false,
            extractedText: '',
            aiExtractedJson: JSON.stringify(metadata),
            fileId: uploadedFile?.$id || '',
            fileName: uploadedFile?.name || selectedFile.name,
            fileType: uploadedFile?.mimeType || selectedFile.type,
          },
          [],
        );

        const scannerInvoice = {
          ...buildScannerInvoiceFromParsed(parsed, '', null, 'Uploaded'),
          id: createdInvoice.id,
          invoiceNumber: createdInvoice.invoiceNumber,
          fileId: uploadedFile?.$id || '',
          fileName: uploadedFile?.name || selectedFile.name,
          fileType: uploadedFile?.mimeType || selectedFile.type,
          warnings: parsed.warnings,
          ocrSource: 'upload_only_pdf',
        };

        setSavedInvoice(createdInvoice);
        setExtractedInvoice(scannerInvoice);
        setScanState({
          status: 'uploaded',
          stepIndex: 1,
          progress: 100,
          error: '',
          successMessage: uploadWarning
            ? 'Invoice record saved without file attachment. Browser OCR currently supports JPG, PNG, and WEBP images.'
            : 'Invoice file uploaded and saved. Browser OCR currently supports JPG, PNG, and WEBP images.',
        });
        setOcrMeta({
          ...initialOcrMeta,
          engineStatus: 'Upload saved',
          currentStep: 'PDF saved for manual review',
          progress: 100,
        });
        await loadRecentScans();
        return;
      }

      const ocrResult = await extractTextFromImage(selectedFile, {
        onProgress: ({ status, step, progress }) => {
          const normalizedProgress = Math.max(18, Math.min(94, progress));
          setOcrMeta((current) => ({
            ...current,
            engineStatus: status,
            currentStep: step,
            progress: normalizedProgress,
          }));
          setScanState((current) => ({
            ...current,
            stepIndex: scanStepIndexForProgress(normalizedProgress),
            progress: normalizedProgress,
            error: '',
          }));
        },
      });

      setOcrMeta((current) => ({
        ...current,
        engineStatus: 'Parsing',
        currentStep: 'Parsing invoice fields',
        progress: 96,
        durationMs: ocrResult.durationMs,
        confidence: ocrResult.confidence,
      }));
      setScanState((current) => ({
        ...current,
        stepIndex: 4,
        progress: 96,
      }));

      const parsedInvoice = parseInvoiceText(ocrResult.normalizedText);
      parsedInvoice.confidence = ocrResult.confidence;
      const scannerInvoice = buildScannerInvoiceFromParsed(
        parsedInvoice,
        ocrResult.normalizedText,
        ocrResult,
        'Pending Review',
      );
      const metadata = buildOcrMetadata(parsedInvoice, ocrResult);
      const createdInvoice = await createPurchaseInvoice(
        user.$id,
        {
          supplierName: parsedInvoice.supplierName,
          supplierPhone: parsedInvoice.supplierPhone,
          invoiceNumber: parsedInvoice.invoiceNumber,
          invoiceDate: parsedInvoice.invoiceDate,
          subtotal: parsedInvoice.subtotal,
          gstAmount: parsedInvoice.gstAmount,
          totalAmount: parsedInvoice.totalAmount,
          status: 'Pending Review',
          inventoryUpdated: false,
          extractedText: ocrResult.normalizedText,
          aiExtractedJson: JSON.stringify(metadata),
          fileId: uploadedFile?.$id || '',
          fileName: uploadedFile?.name || selectedFile.name,
          fileType: uploadedFile?.mimeType || selectedFile.type,
        },
        parsedInvoice.items,
      );

      setSavedInvoice(createdInvoice);
      setExtractedInvoice({
        ...scannerInvoice,
        id: createdInvoice.id,
        invoiceNumber: createdInvoice.invoiceNumber,
        status: 'Pending Review',
        fileId: uploadedFile?.$id || '',
        fileName: uploadedFile?.name || selectedFile.name,
        fileType: uploadedFile?.mimeType || selectedFile.type,
      });
      setScanState({
        status: 'extracted',
        stepIndex: ocrScanSteps.length - 1,
        progress: 100,
        error: '',
        successMessage: uploadWarning
          ? 'OCR completed and invoice data saved. File attachment upload failed, but review and approval can continue.'
          : 'Invoice uploaded and saved for review in Appwrite.',
      });
      setOcrMeta({
        engineStatus: 'Completed',
        currentStep: 'Ready for review',
        progress: 100,
        durationMs: ocrResult.durationMs,
        confidence: ocrResult.confidence,
      });
      await loadRecentScans();
      await runAiParseForInvoice(createdInvoice.id, { auto: true });
    } catch (error) {
      if (uploadedFile?.$id && selectedFile) {
        try {
          const parsed = {
            supplierName: 'Unknown Supplier',
            supplierPhone: '',
            invoiceNumber: '',
            invoiceDate: todayInputDate(),
            subtotal: 0,
            gstAmount: 0,
            totalAmount: 0,
            confidence: null,
            warnings: [error.message || 'OCR failed. Manual review is required.'],
            items: [],
          };
          const metadata = buildOcrMetadata(parsed, null, {
            source: 'tesseract_local_ocr_failed',
            error: error.message || 'OCR failed.',
          });
          const failedInvoice = await createPurchaseInvoice(
            user.$id,
            {
              supplierName: parsed.supplierName,
              invoiceDate: parsed.invoiceDate,
              subtotal: 0,
              gstAmount: 0,
              totalAmount: 0,
              status: 'Failed OCR',
              inventoryUpdated: false,
              extractedText: '',
              aiExtractedJson: JSON.stringify(metadata),
              fileId: uploadedFile.$id,
              fileName: uploadedFile.name || selectedFile.name,
              fileType: uploadedFile.mimeType || selectedFile.type,
            },
            [],
          );

          setSavedInvoice(failedInvoice);
          setExtractedInvoice({
            ...buildScannerInvoiceFromParsed(parsed, '', null, 'Failed OCR'),
            id: failedInvoice.id,
            invoiceNumber: failedInvoice.invoiceNumber,
            fileId: uploadedFile.$id,
            fileName: uploadedFile.name || selectedFile.name,
            fileType: uploadedFile.mimeType || selectedFile.type,
            ocrSource: 'tesseract_local_ocr_failed',
          });
          await loadRecentScans();
        } catch {
          try {
            await deleteInvoiceFile(uploadedFile.$id);
          } catch {
            // Storage cleanup is best-effort when the invoice record could not be saved.
          }
        }
      }

      setScanState((current) => ({
        ...current,
        status: uploadedFile ? 'failed' : 'ready',
        error: error.message || 'Could not upload, OCR, or save invoice record.',
      }));
      setOcrMeta((current) => ({
        ...current,
        engineStatus: 'Failed',
        currentStep: 'OCR needs manual review',
      }));
    } finally {
      setActionLoading('');
    }
  }

  async function approveScan() {
    if (!extractedInvoice || !savedInvoice || !user?.$id) {
      return;
    }

    setActionLoading('approve');
    try {
      const approvedInvoice = await approvePurchaseInvoice(user.$id, savedInvoice.id);
      setSavedInvoice(approvedInvoice);
      setExtractedInvoice(toScannerInvoice(approvedInvoice));
      setScanState((current) => ({
        ...current,
        status: 'approved',
        successMessage:
          'Invoice approved. Inventory stock and supplier purchase data were updated.',
      }));
      await loadRecentScans();
    } catch (error) {
      setScanState((current) => ({
        ...current,
        error: error.message || 'Could not approve invoice.',
      }));
    } finally {
      setActionLoading('');
    }
  }

  async function runAiParseForInvoice(invoiceId, options = {}) {
    if (!user?.$id || !invoiceId) {
      setScanState((current) => ({
        ...current,
        error: 'Save an OCR invoice before running AI extraction.',
      }));
      return;
    }

    setActionLoading('ai-parse');
    setScanState((current) => ({
      ...current,
      error: '',
      successMessage: options.auto
        ? 'OCR saved. AI is now understanding supplier, GST, totals, and items...'
        : 'AI is understanding supplier, GST, totals, and items...',
    }));

    try {
      const result = await parseInvoiceWithAi(invoiceId, {
        force: Boolean(options.force),
        forceReplaceItems: true,
      });
      const refreshedInvoice = await getPurchaseInvoiceWithItems(user.$id, invoiceId);
      setSavedInvoice(refreshedInvoice);
      setExtractedInvoice(toScannerInvoice(refreshedInvoice));
      setScanState((current) => ({
        ...current,
        status: 'extracted',
        successMessage: result.needsManualReview
          ? 'AI extraction completed but needs manual review.'
          : 'AI extraction completed. Please review before approval.',
      }));
      await loadRecentScans();
    } catch (error) {
      setScanState((current) => ({
        ...current,
        error: options.auto
          ? `Local OCR data was saved, but AI parsing did not run: ${error.message || 'AI parser unavailable.'}`
          : error.message || 'AI parser unavailable. Using local OCR parser for now.',
        successMessage: options.auto ? 'You can still review and approve the OCR result manually.' : '',
      }));
    } finally {
      setActionLoading('');
    }
  }

  async function parseCurrentInvoiceWithAi() {
    const invoiceId = savedInvoice?.id || extractedInvoice?.id;
    await runAiParseForInvoice(invoiceId, { force: true });
  }

  async function resetScanner() {
    if (savedInvoice && savedInvoice.status !== 'Approved' && user?.$id) {
      try {
        await deletePurchaseInvoice(user.$id, savedInvoice.id, { deleteFile: true });
        await loadRecentScans();
      } catch (error) {
        setScanState((current) => ({
          ...current,
          error: error.message || 'Could not discard uploaded invoice.',
        }));
        return;
      }
    }

    setSelectedFile(null);
    setExtractedInvoice(null);
    setSavedInvoice(null);
    setScanState(initialScanState);
    setOcrMeta(initialOcrMeta);
    setModalState({ type: null, scan: null });
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        action={
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button as={Link} to="/invoices" variant="secondary">
              <FileText className="h-4 w-4" />
              View Invoices
            </Button>
            <Button onClick={() => document.querySelector('input[type=file]')?.click()}>
              <FileUp className="h-4 w-4" />
              Upload Invoice
            </Button>
          </div>
        }
        subtitle="Upload purchase invoices, extract data with OCR, and let AI update your inventory workflow."
        title="Invoice Scanner"
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={FileScan}
          status="info"
          title="Invoices Scanned"
          trend="Saved in Appwrite"
          value={String(recentScans.length)}
        />
        <StatCard
          icon={RefreshCw}
          status="success"
          title="Auto Updates"
          trend="Automation coming next"
          value={String(recentScans.filter((scan) => scan.invoice?.inventoryUpdated).length)}
        />
        <StatCard
          icon={CircleAlert}
          status="warning"
          title="Pending Review"
          trend="Need owner approval"
          value={String(recentScans.filter((scan) => scan.status === 'Pending Review').length)}
        />
        <StatCard
          icon={TimerReset}
          status="neutral"
          title="Time Saved"
          trend="Estimated manual work"
          value="42 hrs"
        />
      </section>

      <Card className="overflow-hidden bg-gradient-to-br from-slate-950 to-indigo-950 text-white">
        <div className="grid gap-5 lg:grid-cols-[auto_1fr_auto] lg:items-center">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-cyan-200">
            <WandSparkles className="h-6 w-6" />
          </div>
          <div>
            <Badge className="bg-white/10 text-cyan-100 ring-white/15" variant="neutral">
              AI Workflow
            </Badge>
            <p className="mt-3 max-w-3xl text-lg font-bold leading-7 text-white">
              Upload your supplier invoice and MSME Pilot will extract items,
              GST, quantity, and total amount before updating inventory.
            </p>
          </div>
          <Button onClick={startScan} variant="secondary">
            <Sparkles className="h-4 w-4" />
            Start scanning
          </Button>
        </div>
      </Card>

      <section className="relative z-0 grid min-w-0 gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="min-w-0 space-y-6">
          <InvoiceUploadCard
            file={selectedFile}
            onFileChange={handleFileChange}
            onStartScan={startScan}
            scanState={scanState}
          />
          <ScanProgressCard ocrMeta={ocrMeta} scanState={scanState} />
          <InvoicePreviewCard
            file={selectedFile}
            previewUrl={previewUrl}
            scanState={scanState}
          />
          <OcrTipsCard />
        </div>

        <div className="min-w-0 space-y-6">
          {!selectedFile && !extractedInvoice ? (
            <Card className="text-center" padding="lg">
              <FileScan className="mx-auto h-12 w-12 text-indigo-500" />
              <h2 className="mt-5 text-2xl font-black text-slate-950">
                Start by uploading a supplier invoice
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                MSME Pilot will run local OCR for image invoices and save results for review.
              </p>
            </Card>
          ) : null}

          <OcrStatusCard invoice={extractedInvoice} ocrMeta={ocrMeta} />
          <OcrQualityCard invoice={extractedInvoice} />
          <OcrWarningsCard warnings={extractedInvoice?.warnings || []} />
          <OcrTextPanel invoice={extractedInvoice} />
          <AiExtractionPanel invoice={extractedInvoice} />
          <div className="grid min-w-0 gap-6 lg:grid-cols-2 xl:grid-cols-1">
            <InventoryUpdatePreview invoice={extractedInvoice} />
            <SupplierUpdatePreview invoice={extractedInvoice} />
          </div>
          <ReviewActions
            actionLoading={actionLoading}
            invoice={extractedInvoice}
            onAiParse={parseCurrentInvoiceWithAi}
            onApprove={approveScan}
            onDiscard={() => setModalState({ type: 'discard', scan: null })}
            onEdit={() => setModalState({ type: 'edit', scan: null })}
            scanState={scanState}
          />
        </div>
      </section>

      <section className="relative z-0 space-y-4">
        <SectionHeader
          subtitle="Recent scanned invoices saved in Appwrite for review workflows."
          title="Recent Scanned Invoices"
        />
        {loadingScans ? (
          <Card className="text-center" padding="lg">
            <Clock className="mx-auto h-10 w-10 animate-pulse text-indigo-500" />
            <p className="mt-4 font-black text-slate-950">Loading scanned invoices...</p>
          </Card>
        ) : (
          <RecentScansTable
            onDelete={async (scan) => {
              if (!user?.$id) return;
              try {
                await deletePurchaseInvoice(user.$id, scan.id, { deleteFile: false });
                await loadRecentScans();
              } catch (error) {
                setScanState((current) => ({
                  ...current,
                  error: error.message || 'Could not delete invoice.',
                }));
              }
            }}
            onReview={(scan) => {
              setSavedInvoice(scan.invoice);
              setExtractedInvoice(toScannerInvoice(scan.invoice));
            }}
            onView={(scan) => {
              setSavedInvoice(scan.invoice);
              setExtractedInvoice(toScannerInvoice(scan.invoice));
            }}
            scans={recentScans}
          />
        )}
      </section>

      {modalState.type === 'edit' && extractedInvoice ? (
        <ExtractionEditModal
          invoice={extractedInvoice}
          onClose={() => setModalState({ type: null, scan: null })}
          onSave={async (invoice) => {
            setExtractedInvoice(invoice);
            if (savedInvoice && user?.$id) {
              try {
                await updatePurchaseInvoice(user.$id, savedInvoice.id, {
                  supplierName: invoice.supplierName,
                  supplierPhone: invoice.supplierPhone,
                  invoiceNumber: invoice.invoiceNumber,
                  invoiceDate: invoice.invoiceDate,
                  subtotal: invoice.subtotal,
                  gstAmount: invoice.gstAmount,
                  totalAmount: invoice.totalAmount,
                  status: invoice.status,
                  aiExtractedJson: JSON.stringify(buildOcrMetadata(invoice, {
                    confidence: invoice.confidence,
                    durationMs: invoice.durationMs,
                  }, { source: invoice.ocrSource || 'local_manual_review' })),
                });
                await deleteInvoiceItemsForInvoice(user.$id, savedInvoice.id);
                await Promise.all(
                  invoice.items
                    .filter((item) => item.productName)
                    .map((item) => createInvoiceItem(user.$id, savedInvoice.id, item)),
                );
                const refreshedInvoice = await getPurchaseInvoiceWithItems(user.$id, savedInvoice.id);
                setSavedInvoice(refreshedInvoice);
                setExtractedInvoice(toScannerInvoice(refreshedInvoice));
                await loadRecentScans();
              } catch (error) {
                setScanState((current) => ({
                  ...current,
                  error: error.message || 'Could not save extracted invoice changes.',
                }));
              }
            }
            setModalState({ type: null, scan: null });
          }}
        />
      ) : null}

      {modalState.type === 'discard' ? (
        <ConfirmDiscardModal
          onCancel={() => setModalState({ type: null, scan: null })}
          onConfirm={resetScanner}
        />
      ) : null}
    </div>
  );
}
