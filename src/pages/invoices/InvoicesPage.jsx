import { AnimatePresence, motion } from 'framer-motion';
import {
  CheckCircle2,
  CircleAlert,
  Clock,
  Eye,
  FileCheck2,
  FileSearch,
  FileText,
  IndianRupee,
  ReceiptText,
  Search,
  SearchX,
  Send,
  Sparkles,
  Trash2,
  WandSparkles,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import clsx from 'clsx';
import Badge from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import Input from '../../components/common/Input.jsx';
import SectionHeader from '../../components/common/SectionHeader.jsx';
import StatCard from '../../components/common/StatCard.jsx';
import { purchaseInvoices } from '../../data/mockData.js';
import {
  formatCurrency,
  formatDate,
  getInventoryUpdateLabel,
  getInvoiceStatusBadge,
} from '../../utils/formatters.js';

const statusFilters = [
  'All Invoices',
  'Approved',
  'Pending Review',
  'Processing',
  'Failed OCR',
  'Rejected',
];
const supplierFilters = [
  'All Suppliers',
  'ABC Traders',
  'Metro Suppliers',
  'Fresh Wholesale',
  'CleanCo Distributors',
  'Sunrise Distributors',
];
const dateFilters = ['Today', 'This Week', 'This Month', 'All Time'];
const sortOptions = ['Latest', 'Highest Amount', 'Supplier Name', 'Status'];

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

function InvoiceFilters({ filters, onChange, onClear }) {
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
          {supplierFilters.map((supplier) => (
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

function ItemPills({ items }) {
  const visibleItems = items.slice(0, 2);
  const hiddenCount = Math.max(0, items.length - visibleItems.length);

  return (
    <div className="flex flex-wrap gap-2">
      {visibleItems.map((item) => (
        <span
          className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600"
          key={item.productName}
        >
          {item.productName}
        </span>
      ))}
      {hiddenCount > 0 ? <Badge>+{hiddenCount} more</Badge> : null}
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
          Add invoices to see purchase insights here.
        </div>
      </Card>
    );
  }

  const highestInvoice = [...invoices].sort((a, b) => b.totalAmount - a.totalAmount)[0];
  const insights = [
    {
      label: 'Highest Purchase Invoice',
      value: `${highestInvoice.supplierName} — ${formatCurrency(highestInvoice.totalAmount)}`,
      icon: ReceiptText,
      tone: 'text-indigo-600 bg-indigo-50',
    },
    {
      label: 'Pending Review',
      value: '5 invoices',
      icon: CircleAlert,
      tone: 'text-amber-600 bg-amber-50',
    },
    {
      label: 'This Month Purchase Value',
      value: '₹12,84,500',
      icon: IndianRupee,
      tone: 'text-emerald-600 bg-emerald-50',
    },
    {
      label: 'Most Frequent Supplier',
      value: 'ABC Traders',
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

function InvoiceTable({ invoices, onApprove, onDelete, onReview, onView }) {
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
              const canApprove =
                invoice.status === 'Pending Review' || invoice.status === 'Processing';
              return (
                <tr key={invoice.id}>
                  <td className="border-t border-slate-100 px-5 py-4">
                    <p className="font-black text-slate-950">{invoice.invoiceNumber}</p>
                    <p className="text-sm text-slate-500">{invoice.fileName}</p>
                  </td>
                  <td className="border-t border-slate-100 px-5 py-4">
                    <p className="font-black text-slate-950">{invoice.supplierName}</p>
                    <p className="text-sm text-slate-500">{invoice.supplierPhone}</p>
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
                    <Badge variant={getInvoiceStatusBadge(invoice.status)}>
                      {invoice.status}
                    </Badge>
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

function InvoiceCard({ invoice, onApprove, onDelete, onReview, onView }) {
  const canApprove =
    invoice.status === 'Pending Review' || invoice.status === 'Processing';

  return (
    <Card className="xl:hidden" hover>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-black text-slate-950">{invoice.invoiceNumber}</p>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            {invoice.supplierName}
          </p>
        </div>
        <Badge variant={getInvoiceStatusBadge(invoice.status)}>{invoice.status}</Badge>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 rounded-3xl bg-slate-50 p-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Total
          </p>
          <p className="mt-1 text-sm font-black text-slate-950">
            {formatCurrency(invoice.totalAmount)}
          </p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            GST
          </p>
          <p className="mt-1 text-sm font-black text-slate-950">
            {formatCurrency(invoice.gstAmount)}
          </p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Items
          </p>
          <p className="mt-1 text-sm font-black text-slate-950">
            {invoice.itemCount}
          </p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Inventory
          </p>
          <p className="mt-1 text-sm font-black text-slate-950">
            {getInventoryUpdateLabel(invoice.inventoryUpdated)}
          </p>
        </div>
        <div className="col-span-2">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Invoice Date
          </p>
          <p className="mt-1 text-sm font-black text-slate-950">
            {formatDate(invoice.invoiceDate)}
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        <Button onClick={() => onView(invoice)} size="sm" variant="secondary">
          View
        </Button>
        <Button onClick={() => onReview(invoice)} size="sm" variant="secondary">
          Review
        </Button>
        <Button disabled={!canApprove} onClick={() => onApprove(invoice)} size="sm">
          Approve
        </Button>
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

function InvoiceDetailsModal({ invoice, onClose }) {
  return (
    <ModalShell onClose={onClose} size="max-w-3xl">
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-950">
              {invoice.invoiceNumber}
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              {invoice.supplierName} · {invoice.supplierPhone}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant={getInvoiceStatusBadge(invoice.status)}>
                {invoice.status}
              </Badge>
              <Badge variant={invoice.inventoryUpdated ? 'success' : 'neutral'}>
                {getInventoryUpdateLabel(invoice.inventoryUpdated)}
              </Badge>
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

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            ['Invoice date', formatDate(invoice.invoiceDate)],
            ['File name', invoice.fileName],
            ['File type', invoice.fileType],
            ['Subtotal', formatCurrency(invoice.subtotal)],
            ['GST amount', formatCurrency(invoice.gstAmount)],
            ['Total amount', formatCurrency(invoice.totalAmount)],
          ].map(([label, value]) => (
            <div className="rounded-2xl bg-slate-50 p-4" key={label}>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                {label}
              </p>
              <p className="mt-1 font-black text-slate-950">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 overflow-hidden rounded-3xl border border-slate-100">
          {invoice.items.map((item) => (
            <div
              className="grid gap-2 border-b border-slate-100 bg-white p-4 last:border-b-0 sm:grid-cols-[1fr_0.6fr_0.8fr_0.5fr_1fr]"
              key={item.productName}
            >
              <p className="font-black text-slate-950">{item.productName}</p>
              <p className="text-sm text-slate-500">
                {item.quantity} {item.unit}
              </p>
              <p className="text-sm font-bold text-slate-950">
                {formatCurrency(item.amount)}
              </p>
              <p className="text-sm text-slate-500">{item.gstPercentage}%</p>
              <p className="text-sm font-semibold text-emerald-600">
                {item.inventoryAction}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl bg-slate-950 p-5">
            <p className="text-sm font-bold text-cyan-100">Extracted OCR text</p>
            <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap text-sm leading-6 text-slate-100">
              {invoice.extractedText}
            </pre>
          </div>
          <div className="rounded-3xl bg-indigo-50 p-5">
            <p className="text-sm font-bold text-indigo-700">AI extracted summary</p>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              {invoice.aiExtractedData}
            </p>
            <div className="mt-4 rounded-2xl bg-white p-4 text-sm leading-6 text-slate-700">
              This invoice includes fast-moving grocery products. Approve
              inventory update after checking quantities.
            </div>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

function InvoiceReviewModal({ invoice, onClose, onSave }) {
  const [values, setValues] = useState({
    supplierName: invoice.supplierName,
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

  function handleSave() {
    onSave({
      ...invoice,
      supplierName: values.supplierName,
      invoiceNumber: values.invoiceNumber,
      invoiceDate: values.invoiceDate,
      subtotal: Number(values.subtotal),
      gstAmount: Number(values.gstAmount),
      totalAmount: Number(values.totalAmount),
      status: values.status,
      items: values.items.map((item) => ({
        ...item,
        quantity: Number(item.quantity),
        amount: Number(item.amount),
      })),
      itemCount: values.items.length,
      updatedAt: new Date().toISOString(),
    });
  }

  return (
    <ModalShell onClose={onClose} size="max-w-3xl">
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-indigo-600">Local review mode</p>
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
            label="Invoice date"
            name="invoiceDate"
            onChange={updateField}
            type="date"
            value={values.invoiceDate}
          />
          <label className="block" htmlFor="status">
            <span className="mb-2 block text-sm font-semibold text-slate-700">
              Status
            </span>
            <select
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition-all focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
              id="status"
              name="status"
              onChange={updateField}
              value={values.status}
            >
              {statusFilters.slice(1).map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </label>
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
        </div>

        <div className="mt-6 space-y-3">
          {values.items.map((item, index) => (
            <div className="rounded-3xl bg-slate-50 p-4" key={item.productName}>
              <p className="mb-3 font-black text-slate-950">{item.productName}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="Quantity"
                  name={`quantity-${index}`}
                  onChange={(event) => updateItem(index, 'quantity', event.target.value)}
                  type="number"
                  value={String(item.quantity)}
                />
                <Input
                  label="Amount"
                  name={`amount-${index}`}
                  onChange={(event) => updateItem(index, 'amount', event.target.value)}
                  type="number"
                  value={String(item.amount)}
                />
              </div>
            </div>
          ))}
          <p className="text-sm text-slate-500">
            More detailed item editing can be connected later with real invoice
            extraction.
          </p>
        </div>

        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button onClick={onClose} rounded="2xl" variant="secondary">
            Cancel
          </Button>
          <Button onClick={handleSave} rounded="2xl">
            Save Review
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}

function ApproveInvoiceModal({ invoice, onCancel, onConfirm }) {
  return (
    <ModalShell onClose={onCancel} size="max-w-md">
      <div className="p-5 sm:p-6">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <h2 className="mt-5 text-2xl font-black tracking-tight text-slate-950">
          Approve invoice and update inventory?
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          This will mark {invoice.invoiceNumber} as approved and simulate
          inventory update for extracted items.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button onClick={onCancel} rounded="2xl" variant="secondary">
            Cancel
          </Button>
          <Button onClick={onConfirm} rounded="2xl">
            Approve Invoice
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}

function DeleteConfirmModal({ invoice, onCancel, onConfirm }) {
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
          {invoice.invoiceNumber} will be removed from this local invoice list.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button onClick={onCancel} rounded="2xl" variant="secondary">
            Cancel
          </Button>
          <Button onClick={onConfirm} rounded="2xl" variant="danger">
            Delete Invoice
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}

function EmptyState({ onClear }) {
  return (
    <Card className="text-center" padding="lg">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-3xl bg-slate-100 text-slate-500">
        <SearchX className="h-7 w-7" />
      </div>
      <h2 className="mt-5 text-2xl font-black text-slate-950">
        No invoices found
      </h2>
      <p className="mt-2 text-sm text-slate-500">
        Try changing your search or filters.
      </p>
      <Button className="mt-6" onClick={onClear} variant="secondary">
        Clear filters
      </Button>
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
            Use Invoice Scanner to extract supplier, items, GST, and total amount
            automatically.
          </p>
        </div>
        <Button as={Link} to="/invoice-scanner" variant="secondary">
          Open Invoice Scanner
        </Button>
      </div>
    </Card>
  );
}

function isWithinDateFilter(invoiceDate, filter, referenceDate) {
  if (filter === 'All Time') {
    return true;
  }

  const invoiceTime = new Date(`${invoiceDate}T00:00:00`).getTime();
  const referenceTime = new Date(`${referenceDate}T00:00:00`).getTime();

  if (filter === 'Today') {
    return invoiceDate === referenceDate;
  }

  if (filter === 'This Week') {
    const sevenDays = 6 * 24 * 60 * 60 * 1000;
    return invoiceTime >= referenceTime - sevenDays && invoiceTime <= referenceTime;
  }

  if (filter === 'This Month') {
    return invoiceDate.slice(0, 7) === referenceDate.slice(0, 7);
  }

  return true;
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState(purchaseInvoices);
  const [filters, setFilters] = useState({
    search: '',
    status: 'All Invoices',
    supplier: 'All Suppliers',
    dateFilter: 'All Time',
    sortBy: 'Latest',
  });
  const [modalState, setModalState] = useState({ type: null, invoice: null });
  const [successMessage, setSuccessMessage] = useState('');

  const referenceDate = useMemo(
    () =>
      [...invoices].sort((a, b) => b.invoiceDate.localeCompare(a.invoiceDate))[0]
        ?.invoiceDate || '2026-07-05',
    [invoices],
  );

  const filteredInvoices = useMemo(() => {
    const searchTerm = filters.search.trim().toLowerCase();
    const nextInvoices = invoices.filter((invoice) => {
      const matchesSearch =
        !searchTerm ||
        invoice.invoiceNumber.toLowerCase().includes(searchTerm) ||
        invoice.supplierName.toLowerCase().includes(searchTerm) ||
        invoice.items.some((item) => item.productName.toLowerCase().includes(searchTerm));
      const matchesStatus =
        filters.status === 'All Invoices' || invoice.status === filters.status;
      const matchesSupplier =
        filters.supplier === 'All Suppliers' ||
        invoice.supplierName === filters.supplier;
      const matchesDate = isWithinDateFilter(
        invoice.invoiceDate,
        filters.dateFilter,
        referenceDate,
      );

      return matchesSearch && matchesStatus && matchesSupplier && matchesDate;
    });

    return [...nextInvoices].sort((a, b) => {
      if (filters.sortBy === 'Highest Amount') {
        return b.totalAmount - a.totalAmount;
      }

      if (filters.sortBy === 'Supplier Name') {
        return a.supplierName.localeCompare(b.supplierName);
      }

      if (filters.sortBy === 'Status') {
        return a.status.localeCompare(b.status);
      }

      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }, [filters, invoices, referenceDate]);

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

  function saveReview(invoice) {
    setInvoices((current) =>
      current.map((item) => (item.id === invoice.id ? invoice : item)),
    );
    setModalState({ type: null, invoice: null });
  }

  function approveInvoice() {
    const now = new Date().toISOString();
    setInvoices((current) =>
      current.map((invoice) =>
        invoice.id === modalState.invoice.id
          ? {
              ...invoice,
              status: 'Approved',
              inventoryUpdated: true,
              updatedAt: now,
            }
          : invoice,
      ),
    );
    setSuccessMessage('Invoice approved. Inventory update simulated.');
    setModalState({ type: null, invoice: null });
    window.setTimeout(() => setSuccessMessage(''), 2600);
  }

  function deleteInvoice() {
    setInvoices((current) =>
      current.filter((invoice) => invoice.id !== modalState.invoice.id),
    );
    setModalState({ type: null, invoice: null });
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        action={
          <div className="flex flex-col gap-3 sm:flex-row">
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

      {successMessage ? (
        <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={ReceiptText}
          status="info"
          title="Total Invoices"
          trend="All scanned purchases"
          value="128"
        />
        <StatCard
          icon={FileCheck2}
          status="success"
          title="Approved"
          trend="Inventory-ready"
          value="96"
        />
        <StatCard
          icon={Clock}
          status="warning"
          title="Pending Review"
          trend="Needs owner check"
          value="5"
        />
        <StatCard
          icon={IndianRupee}
          status="success"
          title="Total Purchase Value"
          trend="This month"
          value="₹12,84,500"
        />
      </section>

      <Card className="overflow-hidden bg-gradient-to-br from-slate-950 to-indigo-950 text-white">
        <div className="grid gap-5 lg:grid-cols-[auto_1fr_auto] lg:items-center">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-cyan-200">
            <WandSparkles className="h-6 w-6" />
          </div>
          <div>
            <Badge className="bg-white/10 text-cyan-100 ring-white/15" variant="neutral">
              AI Insight
            </Badge>
            <p className="mt-3 max-w-3xl text-lg font-bold leading-7 text-white">
              ABC Traders and Fresh Wholesale account for 42% of this month&apos;s
              purchase value. Review pending invoices to keep inventory accurate.
            </p>
          </div>
          <Button
            onClick={() =>
              setFilters((current) => ({ ...current, status: 'Pending Review' }))
            }
            variant="secondary"
          >
            <Sparkles className="h-4 w-4" />
            Review pending invoices
          </Button>
        </div>
      </Card>

      <InvoiceInsights invoices={invoices} />
      <InvoiceScannerCTA />

      <InvoiceFilters filters={filters} onChange={updateFilter} onClear={clearFilters} />

      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-950">Purchase Invoices</h2>
            <p className="mt-1 text-sm text-slate-500">
              Showing {filteredInvoices.length} of {invoices.length} local demo invoices.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
            <FileText className="h-4 w-4 text-indigo-500" />
            Local invoice data only
          </div>
        </div>
      </Card>

      {filteredInvoices.length ? (
        <>
          <InvoiceTable
            invoices={filteredInvoices}
            onApprove={(invoice) => setModalState({ type: 'approve', invoice })}
            onDelete={(invoice) => setModalState({ type: 'delete', invoice })}
            onReview={(invoice) => setModalState({ type: 'review', invoice })}
            onView={(invoice) => setModalState({ type: 'view', invoice })}
          />
          <div className="grid gap-4 xl:hidden">
            {filteredInvoices.map((invoice) => (
              <InvoiceCard
                invoice={invoice}
                key={invoice.id}
                onApprove={(selectedInvoice) =>
                  setModalState({ type: 'approve', invoice: selectedInvoice })
                }
                onDelete={(selectedInvoice) =>
                  setModalState({ type: 'delete', invoice: selectedInvoice })
                }
                onReview={(selectedInvoice) =>
                  setModalState({ type: 'review', invoice: selectedInvoice })
                }
                onView={(selectedInvoice) =>
                  setModalState({ type: 'view', invoice: selectedInvoice })
                }
              />
            ))}
          </div>
        </>
      ) : (
        <EmptyState onClear={clearFilters} />
      )}

      {modalState.type === 'view' && modalState.invoice ? (
        <InvoiceDetailsModal
          invoice={modalState.invoice}
          onClose={() => setModalState({ type: null, invoice: null })}
        />
      ) : null}

      {modalState.type === 'review' && modalState.invoice ? (
        <InvoiceReviewModal
          invoice={modalState.invoice}
          onClose={() => setModalState({ type: null, invoice: null })}
          onSave={saveReview}
        />
      ) : null}

      {modalState.type === 'approve' && modalState.invoice ? (
        <ApproveInvoiceModal
          invoice={modalState.invoice}
          onCancel={() => setModalState({ type: null, invoice: null })}
          onConfirm={approveInvoice}
        />
      ) : null}

      {modalState.type === 'delete' && modalState.invoice ? (
        <DeleteConfirmModal
          invoice={modalState.invoice}
          onCancel={() => setModalState({ type: null, invoice: null })}
          onConfirm={deleteInvoice}
        />
      ) : null}
    </div>
  );
}
