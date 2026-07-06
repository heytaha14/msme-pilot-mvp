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
import { useEffect, useRef, useState } from 'react';
import Badge from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import Input from '../../components/common/Input.jsx';
import SectionHeader from '../../components/common/SectionHeader.jsx';
import StatCard from '../../components/common/StatCard.jsx';
import {
  mockExtractedInvoice,
  recentScannedInvoices,
  scanSteps,
} from '../../data/mockData.js';
import {
  formatCurrency,
  formatDate,
  formatFileSize,
  getInvoiceScanStatusBadge,
} from '../../utils/formatters.js';

const initialScanState = {
  status: 'idle',
  stepIndex: -1,
  progress: 0,
  error: '',
  successMessage: '',
};

function cloneExtractedInvoice() {
  return JSON.parse(JSON.stringify(mockExtractedInvoice));
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
          Supports JPG, PNG, PDF preview style for now.
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
          Demo mode: OCR and AI extraction are simulated locally.
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

function ScanProgressCard({ scanState }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-950">Mock scan process</h2>
          <p className="mt-1 text-sm text-slate-500">
            Demo mode: extraction is simulated locally. Real OCR + AI integration comes next.
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

      <div className="mt-5 space-y-3">
        {scanSteps.map((step, index) => {
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

function AiExtractionPanel({ invoice }) {
  if (!invoice) {
    return null;
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-950">
            AI structured extraction
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Supplier, invoice, GST, and item details parsed for review.
          </p>
        </div>
        <Badge variant="info">{invoice.status}</Badge>
      </div>

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
        {invoice.items.map((item) => (
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
        ))}
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
            Inventory Update Preview
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            3 products will be updated after approval.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {invoice.items.map((item) => (
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
        ))}
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
  invoice,
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
          disabled={scanState.status === 'approved'}
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
    invoiceNumber: invoice.invoiceNumber,
    totalAmount: String(invoice.totalAmount),
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

  function handleSave() {
    onSave({
      ...invoice,
      supplierName: values.supplierName,
      invoiceNumber: values.invoiceNumber,
      totalAmount: Number(values.totalAmount),
      items: values.items,
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
            label="Invoice number"
            name="invoiceNumber"
            onChange={updateField}
            value={values.invoiceNumber}
          />
          <Input
            label="Total amount"
            name="totalAmount"
            onChange={updateField}
            type="number"
            value={values.totalAmount}
          />
        </div>

        <div className="mt-5 space-y-3">
          {values.items.map((item, index) => (
            <Input
              key={item.productName}
              label={`${item.productName} quantity`}
              name={`quantity-${index}`}
              onChange={(event) => updateQuantity(index, event.target.value)}
              value={item.quantity}
            />
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

export default function InvoiceScannerPage() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [scanState, setScanState] = useState(initialScanState);
  const [extractedInvoice, setExtractedInvoice] = useState(null);
  const [recentScans, setRecentScans] = useState(recentScannedInvoices);
  const [modalState, setModalState] = useState({ type: null, scan: null });

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
    setScanState({
      ...initialScanState,
      status: 'ready',
      error: '',
    });
  }

  async function startScan() {
    if (!selectedFile) {
      setScanState((current) => ({
        ...current,
        error: 'Please choose an invoice file first.',
      }));
      return;
    }

    setExtractedInvoice(null);
    setScanState({
      status: 'processing',
      stepIndex: 0,
      progress: 8,
      error: '',
      successMessage: '',
    });

    for (let index = 0; index < scanSteps.length; index += 1) {
      await new Promise((resolve) => {
        window.setTimeout(resolve, 520);
      });
      setScanState({
        status: index === scanSteps.length - 1 ? 'extracted' : 'processing',
        stepIndex: index,
        progress: Math.round(((index + 1) / scanSteps.length) * 100),
        error: '',
        successMessage: '',
      });
    }

    setExtractedInvoice(cloneExtractedInvoice());
  }

  function approveScan() {
    if (!extractedInvoice) {
      return;
    }

    setRecentScans((current) => [
      {
        id: Date.now(),
        supplier: extractedInvoice.supplierName,
        invoiceNumber: extractedInvoice.invoiceNumber,
        amount: extractedInvoice.totalAmount,
        itemsCount: extractedInvoice.items.length,
        status: 'Approved',
        date: extractedInvoice.invoiceDate,
      },
      ...current,
    ]);
    setScanState((current) => ({
      ...current,
      status: 'approved',
      successMessage:
        'Invoice approved. Inventory, supplier, dashboard, and notification updates are simulated.',
    }));
  }

  function resetScanner() {
    setSelectedFile(null);
    setExtractedInvoice(null);
    setScanState(initialScanState);
    setModalState({ type: null, scan: null });
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        action={
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant="secondary">
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
          trend="All-time demo scans"
          value="128"
        />
        <StatCard
          icon={RefreshCw}
          status="success"
          title="Auto Updates"
          trend="Inventory workflows"
          value="96"
        />
        <StatCard
          icon={CircleAlert}
          status="warning"
          title="Pending Review"
          trend="Need owner approval"
          value="5"
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

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <InvoiceUploadCard
            file={selectedFile}
            onFileChange={handleFileChange}
            onStartScan={startScan}
            scanState={scanState}
          />
          <ScanProgressCard scanState={scanState} />
          <InvoicePreviewCard
            file={selectedFile}
            previewUrl={previewUrl}
            scanState={scanState}
          />
        </div>

        <div className="space-y-6">
          {!selectedFile && !extractedInvoice ? (
            <Card className="text-center" padding="lg">
              <FileScan className="mx-auto h-12 w-12 text-indigo-500" />
              <h2 className="mt-5 text-2xl font-black text-slate-950">
                Start by uploading a supplier invoice
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                MSME Pilot will simulate OCR and AI extraction in this demo.
              </p>
            </Card>
          ) : null}

          <OcrTextPanel invoice={extractedInvoice} />
          <AiExtractionPanel invoice={extractedInvoice} />
          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-1">
            <InventoryUpdatePreview invoice={extractedInvoice} />
            <SupplierUpdatePreview invoice={extractedInvoice} />
          </div>
          <ReviewActions
            invoice={extractedInvoice}
            onApprove={approveScan}
            onDiscard={() => setModalState({ type: 'discard', scan: null })}
            onEdit={() => setModalState({ type: 'edit', scan: null })}
            scanState={scanState}
          />
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeader
          subtitle="Recent local scan history for demo review workflows."
          title="Recent Scanned Invoices"
        />
        <RecentScansTable
          onDelete={(scan) =>
            setRecentScans((current) => current.filter((item) => item.id !== scan.id))
          }
          onReview={() => setExtractedInvoice(cloneExtractedInvoice())}
          onView={() => setExtractedInvoice(cloneExtractedInvoice())}
          scans={recentScans}
        />
      </section>

      {modalState.type === 'edit' && extractedInvoice ? (
        <ExtractionEditModal
          invoice={extractedInvoice}
          onClose={() => setModalState({ type: null, scan: null })}
          onSave={(invoice) => {
            setExtractedInvoice(invoice);
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
