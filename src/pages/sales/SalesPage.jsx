import { AnimatePresence, motion } from 'framer-motion';
import {
  BarChart3,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  Eye,
  IndianRupee,
  LineChart,
  Pencil,
  Plus,
  ReceiptText,
  Search,
  SearchX,
  Send,
  Sparkles,
  Trash2,
  TrendingUp,
  WalletCards,
  WandSparkles,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import clsx from 'clsx';
import Badge from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import Input from '../../components/common/Input.jsx';
import SectionHeader from '../../components/common/SectionHeader.jsx';
import StatCard from '../../components/common/StatCard.jsx';
import { sales as mockSales } from '../../data/mockData.js';
import {
  calculateSaleProfit,
  calculateSaleTotals,
  formatCurrency,
  formatDate,
  getSalePaymentStatusBadge,
} from '../../utils/formatters.js';
import { isValidIndianPhone } from '../../utils/validators.js';

const paymentFilters = ['All Sales', 'Paid', 'Pending', 'Partial', 'Cancelled'];
const dateFilters = ['Today', 'This Week', 'This Month', 'All Time'];
const sortOptions = ['Latest', 'Highest Amount', 'Highest Profit', 'Customer Name'];
const paymentStatuses = ['Paid', 'Pending', 'Partial', 'Cancelled'];

const emptySaleForm = {
  customerName: '',
  customerPhone: '',
  paymentStatus: 'Paid',
  saleDate: '2026-07-05',
};

const emptyLineItem = {
  productName: '',
  quantity: '',
  sellingPrice: '',
  gstPercentage: '',
};

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

function SalesFilters({ filters, onChange, onClear }) {
  return (
    <Card>
      <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr_0.7fr_0.75fr_auto] lg:items-end">
        <Input
          icon={Search}
          label="Search"
          name="search"
          onChange={onChange}
          placeholder="Search invoice, customer, product..."
          value={filters.search}
        />
        <SelectControl
          label="Payment status"
          name="paymentStatus"
          onChange={onChange}
          value={filters.paymentStatus}
        >
          {paymentFilters.map((status) => (
            <option key={status}>{status}</option>
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

function ItemPills({ items }) {
  const visibleItems = items.slice(0, 2);
  const hiddenCount = Math.max(0, items.length - visibleItems.length);

  return (
    <div className="flex flex-wrap gap-2">
      {visibleItems.map((item) => (
        <span
          className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600"
          key={`${item.productName}-${item.quantity}`}
        >
          {item.productName}
        </span>
      ))}
      {hiddenCount > 0 ? <Badge>+{hiddenCount} more</Badge> : null}
    </div>
  );
}

function SalesInsights({ sales }) {
  if (!sales.length) {
    return (
      <Card>
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <ReceiptText className="h-5 w-5 text-indigo-500" />
          Create sales to see billing insights here.
        </div>
      </Card>
    );
  }

  const highestSale = [...sales].sort((a, b) => b.totalAmount - a.totalAmount)[0];
  const bestProfit = [...sales].sort((a, b) => b.profit - a.profit)[0];
  const insights = [
    {
      label: 'Highest Sale',
      value: `${highestSale.customerName} — ${formatCurrency(highestSale.totalAmount)}`,
      icon: ReceiptText,
      tone: 'text-indigo-600 bg-indigo-50',
    },
    {
      label: 'Best Profit Sale',
      value: `${bestProfit.customerName} — ${formatCurrency(bestProfit.profit)} profit`,
      icon: CircleDollarSign,
      tone: 'text-emerald-600 bg-emerald-50',
    },
    {
      label: 'Pending Sales',
      value: '₹58,000',
      icon: WalletCards,
      tone: 'text-amber-600 bg-amber-50',
    },
    {
      label: 'Fast-Moving Items',
      value: 'Rice, Cooking Oil, Sugar',
      icon: TrendingUp,
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

function SalesTable({ onDelete, onEdit, onMarkPaid, onView, sales }) {
  return (
    <Card className="hidden overflow-hidden xl:block" padding="none">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1040px] border-separate border-spacing-0">
          <thead>
            <tr className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-400">
              <th className="px-5 py-4">Invoice</th>
              <th className="px-5 py-4">Customer</th>
              <th className="px-5 py-4">Items</th>
              <th className="px-5 py-4">Total Amount</th>
              <th className="px-5 py-4">Profit</th>
              <th className="px-5 py-4">Sale Date</th>
              <th className="px-5 py-4">Payment Status</th>
              <th className="px-5 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((sale) => (
              <tr key={sale.id}>
                <td className="border-t border-slate-100 px-5 py-4">
                  <p className="font-black text-slate-950">{sale.invoiceNumber}</p>
                  <p className="text-sm text-slate-500">{formatDate(sale.saleDate)}</p>
                </td>
                <td className="border-t border-slate-100 px-5 py-4">
                  <p className="font-black text-slate-950">{sale.customerName}</p>
                  <p className="text-sm text-slate-500">{sale.customerPhone}</p>
                </td>
                <td className="border-t border-slate-100 px-5 py-4">
                  <ItemPills items={sale.items} />
                </td>
                <td className="border-t border-slate-100 px-5 py-4 text-sm font-black text-slate-950">
                  {formatCurrency(sale.totalAmount)}
                </td>
                <td className="border-t border-slate-100 px-5 py-4 text-sm font-black text-emerald-600">
                  {formatCurrency(sale.profit)}
                </td>
                <td className="border-t border-slate-100 px-5 py-4 text-sm text-slate-500">
                  {formatDate(sale.saleDate)}
                </td>
                <td className="border-t border-slate-100 px-5 py-4">
                  <Badge variant={getSalePaymentStatusBadge(sale.paymentStatus)}>
                    {sale.paymentStatus}
                  </Badge>
                </td>
                <td className="border-t border-slate-100 px-5 py-4">
                  <div className="flex justify-end gap-2">
                    <ActionButton icon={Eye} label="View sale" onClick={() => onView(sale)} />
                    <ActionButton icon={Pencil} label="Edit sale" onClick={() => onEdit(sale)} />
                    <ActionButton
                      disabled={sale.paymentStatus === 'Paid' || sale.paymentStatus === 'Cancelled'}
                      icon={CheckCircle2}
                      label="Mark paid"
                      onClick={() => onMarkPaid(sale)}
                      tone="accent"
                    />
                    <ActionButton
                      icon={Trash2}
                      label="Delete sale"
                      onClick={() => onDelete(sale)}
                      tone="danger"
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function SaleCard({ onDelete, onEdit, onMarkPaid, onView, sale }) {
  const canMarkPaid = sale.paymentStatus !== 'Paid' && sale.paymentStatus !== 'Cancelled';

  return (
    <Card className="xl:hidden" hover>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-black text-slate-950">{sale.invoiceNumber}</p>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            {sale.customerName}
          </p>
        </div>
        <Badge variant={getSalePaymentStatusBadge(sale.paymentStatus)}>
          {sale.paymentStatus}
        </Badge>
      </div>

      <div className="mt-4">
        <ItemPills items={sale.items} />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 rounded-3xl bg-slate-50 p-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Total Amount
          </p>
          <p className="mt-1 text-sm font-black text-slate-950">
            {formatCurrency(sale.totalAmount)}
          </p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Profit
          </p>
          <p className="mt-1 text-sm font-black text-emerald-600">
            {formatCurrency(sale.profit)}
          </p>
        </div>
        <div className="col-span-2">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Sale Date
          </p>
          <p className="mt-1 text-sm font-black text-slate-950">
            {formatDate(sale.saleDate)}
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        <Button onClick={() => onView(sale)} size="sm" variant="secondary">
          <Eye className="h-4 w-4" />
          View
        </Button>
        <Button onClick={() => onEdit(sale)} size="sm" variant="secondary">
          <Pencil className="h-4 w-4" />
          Edit
        </Button>
        <Button disabled={!canMarkPaid} onClick={() => onMarkPaid(sale)} size="sm">
          <CheckCircle2 className="h-4 w-4" />
          Paid
        </Button>
      </div>
      <Button className="mt-2 w-full" onClick={() => onDelete(sale)} size="sm" variant="danger">
        <Trash2 className="h-4 w-4" />
        Delete
      </Button>
    </Card>
  );
}

function ModalShell({ children, onClose, size = 'max-w-3xl' }) {
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

function SaleLineItemsEditor({ errors, items, onAdd, onRemove, onUpdate }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-black text-slate-950">Line items</h3>
          <p className="mt-1 text-sm text-slate-500">
            Add products sold in this invoice.
          </p>
        </div>
        <Button onClick={onAdd} size="sm" type="button" variant="secondary">
          <Plus className="h-4 w-4" />
          Add Item
        </Button>
      </div>

      {errors.items ? <p className="text-sm text-rose-600">{errors.items}</p> : null}

      {items.map((item, index) => (
        <div className="rounded-3xl bg-slate-50 p-4" key={index}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.3fr_0.6fr_0.7fr_0.7fr_auto] lg:items-start">
            <Input
              error={errors[`item-${index}-productName`]}
              label="Product name"
              name="productName"
              onChange={(event) => onUpdate(index, event)}
              placeholder="Rice"
              value={item.productName}
            />
            <Input
              error={errors[`item-${index}-quantity`]}
              label="Quantity"
              name="quantity"
              onChange={(event) => onUpdate(index, event)}
              placeholder="2"
              type="number"
              value={item.quantity}
            />
            <Input
              error={errors[`item-${index}-sellingPrice`]}
              label="Selling price"
              name="sellingPrice"
              onChange={(event) => onUpdate(index, event)}
              placeholder="720"
              type="number"
              value={item.sellingPrice}
            />
            <Input
              label="GST %"
              name="gstPercentage"
              onChange={(event) => onUpdate(index, event)}
              placeholder="18"
              type="number"
              value={item.gstPercentage}
            />
            <button
              aria-label="Remove item"
              className="mt-0 grid h-12 w-full place-items-center rounded-2xl bg-rose-50 text-rose-600 transition hover:bg-rose-100 lg:mt-7 lg:w-12"
              onClick={() => onRemove(index)}
              type="button"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function SaleModal({ mode, onClose, onSave, sale }) {
  const [values, setValues] = useState(() => {
    if (!sale) {
      return emptySaleForm;
    }

    return {
      customerName: sale.customerName,
      customerPhone: sale.customerPhone,
      paymentStatus: sale.paymentStatus,
      saleDate: sale.saleDate,
    };
  });
  const [items, setItems] = useState(() =>
    sale
      ? sale.items.map((item) => ({
          productName: item.productName,
          quantity: String(item.quantity),
          sellingPrice: String(item.sellingPrice),
          gstPercentage: String(item.gstPercentage),
          purchasePrice: item.purchasePrice,
        }))
      : [{ ...emptyLineItem }],
  );
  const [errors, setErrors] = useState({});

  const calculatedItems = items.map((item) => {
    const quantity = Number(item.quantity || 0);
    const sellingPrice = Number(item.sellingPrice || 0);
    const gstPercentage = Number(item.gstPercentage || 0);
    const taxableAmount = quantity * sellingPrice;

    return {
      ...item,
      quantity,
      sellingPrice,
      gstPercentage,
      lineTotal: taxableAmount + (taxableAmount * gstPercentage) / 100,
    };
  });
  const totals = calculateSaleTotals(calculatedItems);
  const estimatedProfit = calculateSaleProfit(calculatedItems);

  function updateField(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  }

  function updateItem(index, event) {
    const { name, value } = event.target;
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [name]: value } : item,
      ),
    );
    setErrors((current) => ({ ...current, [`item-${index}-${name}`]: undefined }));
  }

  function addItem() {
    setItems((current) => [...current, { ...emptyLineItem }]);
  }

  function removeItem(index) {
    setItems((current) =>
      current.length === 1 ? current : current.filter((_, itemIndex) => itemIndex !== index),
    );
  }

  function validate() {
    const nextErrors = {};

    if (!values.customerName.trim()) {
      nextErrors.customerName = 'Customer name is required.';
    }

    if (!values.customerPhone.trim()) {
      nextErrors.customerPhone = 'Customer phone is required.';
    } else if (!isValidIndianPhone(values.customerPhone)) {
      nextErrors.customerPhone = 'Enter a valid 10-digit Indian mobile number.';
    }

    if (!items.length) {
      nextErrors.items = 'At least one item is required.';
    }

    items.forEach((item, index) => {
      if (!item.productName.trim()) {
        nextErrors[`item-${index}-productName`] = 'Product name is required.';
      }

      if (!item.quantity || Number(item.quantity) <= 0) {
        nextErrors[`item-${index}-quantity`] = 'Quantity must be greater than 0.';
      }

      if (!item.sellingPrice || Number(item.sellingPrice) <= 0) {
        nextErrors[`item-${index}-sellingPrice`] = 'Selling price must be greater than 0.';
      }
    });

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    const now = new Date().toISOString();
    onSave({
      id: sale?.id ?? Date.now(),
      invoiceNumber: sale?.invoiceNumber,
      customerName: values.customerName.trim(),
      customerPhone: values.customerPhone.trim(),
      items: calculatedItems.map((item) => ({
        productName: item.productName.trim(),
        quantity: item.quantity,
        sellingPrice: item.sellingPrice,
        purchasePrice: item.purchasePrice,
        gstPercentage: item.gstPercentage,
        lineTotal: item.lineTotal,
      })),
      subtotal: totals.subtotal,
      gstAmount: totals.gstAmount,
      totalAmount: totals.totalAmount,
      profit: estimatedProfit,
      paymentStatus: values.paymentStatus,
      saleDate: values.saleDate,
      createdAt: sale?.createdAt ?? now,
      updatedAt: now,
    });
  }

  return (
    <ModalShell onClose={onClose}>
      <form className="p-5 sm:p-6" noValidate onSubmit={handleSubmit}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-indigo-600">
              {mode === 'edit' ? 'Update sale invoice' : 'New sale invoice'}
            </p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
              {mode === 'edit' ? 'Edit Sale' : 'Create Sale'}
            </h2>
          </div>
          <button
            aria-label="Close sale form"
            className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-950"
            onClick={onClose}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Input
            error={errors.customerName}
            label="Customer name"
            name="customerName"
            onChange={updateField}
            placeholder="Ramesh Stores"
            value={values.customerName}
          />
          <Input
            error={errors.customerPhone}
            label="Customer phone"
            name="customerPhone"
            onChange={updateField}
            placeholder="+91 91234 56780"
            type="tel"
            value={values.customerPhone}
          />
          <SelectControl
            label="Payment status"
            name="paymentStatus"
            onChange={updateField}
            value={values.paymentStatus}
          >
            {paymentStatuses.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </SelectControl>
          <Input
            label="Sale date"
            name="saleDate"
            onChange={updateField}
            type="date"
            value={values.saleDate}
          />
        </div>

        <div className="mt-7">
          <SaleLineItemsEditor
            errors={errors}
            items={items}
            onAdd={addItem}
            onRemove={removeItem}
            onUpdate={updateItem}
          />
        </div>

        <div className="mt-6 grid gap-3 rounded-3xl bg-slate-50 p-4 sm:grid-cols-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Subtotal
            </p>
            <p className="mt-1 font-black text-slate-950">
              {formatCurrency(totals.subtotal)}
            </p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              GST
            </p>
            <p className="mt-1 font-black text-slate-950">
              {formatCurrency(totals.gstAmount)}
            </p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Total
            </p>
            <p className="mt-1 font-black text-slate-950">
              {formatCurrency(totals.totalAmount)}
            </p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Est. Profit
            </p>
            <p className="mt-1 font-black text-emerald-600">
              {formatCurrency(estimatedProfit)}
            </p>
          </div>
        </div>

        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button onClick={onClose} rounded="2xl" type="button" variant="secondary">
            Cancel
          </Button>
          <Button rounded="2xl" type="submit">
            {mode === 'edit' ? 'Save Changes' : 'Save Sale'}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}

function SaleDetailsModal({ onClose, sale }) {
  return (
    <ModalShell onClose={onClose} size="max-w-2xl">
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-950">
              {sale.invoiceNumber}
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              {sale.customerName} · {sale.customerPhone}
            </p>
            <Badge className="mt-3" variant={getSalePaymentStatusBadge(sale.paymentStatus)}>
              {sale.paymentStatus}
            </Badge>
          </div>
          <button
            aria-label="Close sale details"
            className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-950"
            onClick={onClose}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 overflow-hidden rounded-3xl border border-slate-100">
          {sale.items.map((item) => (
            <div
              className="grid gap-2 border-b border-slate-100 bg-white p-4 last:border-b-0 sm:grid-cols-[1fr_0.4fr_0.6fr_0.4fr_0.7fr]"
              key={`${item.productName}-${item.quantity}`}
            >
              <p className="font-black text-slate-950">{item.productName}</p>
              <p className="text-sm text-slate-500">Qty {item.quantity}</p>
              <p className="text-sm font-bold text-slate-950">
                {formatCurrency(item.sellingPrice)}
              </p>
              <p className="text-sm text-slate-500">{item.gstPercentage}% GST</p>
              <p className="text-sm font-black text-slate-950">
                {formatCurrency(item.lineTotal)}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          {[
            ['Sale date', formatDate(sale.saleDate)],
            ['Subtotal', formatCurrency(sale.subtotal)],
            ['GST amount', formatCurrency(sale.gstAmount)],
            ['Total', formatCurrency(sale.totalAmount)],
            ['Profit', formatCurrency(sale.profit)],
          ].map(([label, value]) => (
            <div className="rounded-2xl bg-slate-50 p-4" key={label}>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                {label}
              </p>
              <p className="mt-1 font-black text-slate-950">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-3xl border border-indigo-100 bg-indigo-50 p-4">
          <div className="flex gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" />
            <p className="text-sm leading-6 text-slate-700">
              This sale includes fast-moving products. Keep Rice and Cooking Oil
              stocked before the weekend.
            </p>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

function MarkPaidModal({ onCancel, onConfirm, sale }) {
  return (
    <ModalShell onClose={onCancel} size="max-w-md">
      <div className="p-5 sm:p-6">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <h2 className="mt-5 text-2xl font-black tracking-tight text-slate-950">
          Mark this sale as paid?
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          {sale.invoiceNumber} for {formatCurrency(sale.totalAmount)} will be
          marked paid in local state only.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button onClick={onCancel} rounded="2xl" variant="secondary">
            Cancel
          </Button>
          <Button onClick={onConfirm} rounded="2xl">
            Mark Paid
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}

function DeleteConfirmModal({ onCancel, onConfirm, sale }) {
  return (
    <ModalShell onClose={onCancel} size="max-w-md">
      <div className="p-5 sm:p-6">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-rose-50 text-rose-600">
          <Trash2 className="h-6 w-6" />
        </div>
        <h2 className="mt-5 text-2xl font-black tracking-tight text-slate-950">
          Delete this sale record?
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          {sale.invoiceNumber} will be removed from this local sales list. No
          backend data is touched.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button onClick={onCancel} rounded="2xl" variant="secondary">
            Cancel
          </Button>
          <Button onClick={onConfirm} rounded="2xl" variant="danger">
            Delete Sale
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
      <h2 className="mt-5 text-2xl font-black text-slate-950">No sales found</h2>
      <p className="mt-2 text-sm text-slate-500">
        Try changing your search or filters.
      </p>
      <Button className="mt-6" onClick={onClear} variant="secondary">
        Clear filters
      </Button>
    </Card>
  );
}

function isWithinDateFilter(saleDate, filter, referenceDate) {
  if (filter === 'All Time') {
    return true;
  }

  const saleTime = new Date(`${saleDate}T00:00:00`).getTime();
  const referenceTime = new Date(`${referenceDate}T00:00:00`).getTime();

  if (filter === 'Today') {
    return saleDate === referenceDate;
  }

  if (filter === 'This Week') {
    const sevenDays = 6 * 24 * 60 * 60 * 1000;
    return saleTime >= referenceTime - sevenDays && saleTime <= referenceTime;
  }

  if (filter === 'This Month') {
    return saleDate.slice(0, 7) === referenceDate.slice(0, 7);
  }

  return true;
}

export default function SalesPage() {
  const [sales, setSales] = useState(mockSales);
  const [filters, setFilters] = useState({
    search: '',
    paymentStatus: 'All Sales',
    dateFilter: 'All Time',
    sortBy: 'Latest',
  });
  const [modalState, setModalState] = useState({ type: null, sale: null });

  const referenceDate = useMemo(
    () => [...sales].sort((a, b) => b.saleDate.localeCompare(a.saleDate))[0]?.saleDate || '2026-07-05',
    [sales],
  );

  const filteredSales = useMemo(() => {
    const searchTerm = filters.search.trim().toLowerCase();
    const nextSales = sales.filter((sale) => {
      const matchesSearch =
        !searchTerm ||
        sale.invoiceNumber.toLowerCase().includes(searchTerm) ||
        sale.customerName.toLowerCase().includes(searchTerm) ||
        sale.items.some((item) => item.productName.toLowerCase().includes(searchTerm));
      const matchesPayment =
        filters.paymentStatus === 'All Sales' ||
        sale.paymentStatus === filters.paymentStatus;
      const matchesDate = isWithinDateFilter(
        sale.saleDate,
        filters.dateFilter,
        referenceDate,
      );

      return matchesSearch && matchesPayment && matchesDate;
    });

    return [...nextSales].sort((a, b) => {
      if (filters.sortBy === 'Highest Amount') {
        return b.totalAmount - a.totalAmount;
      }

      if (filters.sortBy === 'Highest Profit') {
        return b.profit - a.profit;
      }

      if (filters.sortBy === 'Customer Name') {
        return a.customerName.localeCompare(b.customerName);
      }

      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }, [filters, referenceDate, sales]);

  function updateFilter(event) {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  }

  function clearFilters() {
    setFilters({
      search: '',
      paymentStatus: 'All Sales',
      dateFilter: 'All Time',
      sortBy: 'Latest',
    });
  }

  function generateInvoiceNumber() {
    const maxInvoice = sales.reduce((max, sale) => {
      const number = Number(sale.invoiceNumber.replace('INV-', ''));
      return Math.max(max, number);
    }, 1000);

    return `INV-${maxInvoice + 1}`;
  }

  function saveSale(sale) {
    setSales((current) => {
      const exists = current.some((item) => item.id === sale.id);
      const nextSale = {
        ...sale,
        invoiceNumber: sale.invoiceNumber || generateInvoiceNumber(),
      };

      if (exists) {
        return current.map((item) => (item.id === sale.id ? nextSale : item));
      }

      return [nextSale, ...current];
    });
    setModalState({ type: null, sale: null });
  }

  function markSalePaid() {
    const now = new Date().toISOString();
    setSales((current) =>
      current.map((sale) =>
        sale.id === modalState.sale.id
          ? { ...sale, paymentStatus: 'Paid', updatedAt: now }
          : sale,
      ),
    );
    setModalState({ type: null, sale: null });
  }

  function confirmDelete() {
    setSales((current) => current.filter((sale) => sale.id !== modalState.sale.id));
    setModalState({ type: null, sale: null });
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
            <Button onClick={() => setModalState({ type: 'add', sale: null })}>
              <Plus className="h-4 w-4" />
              Create Sale
            </Button>
          </div>
        }
        subtitle="Create invoices, track revenue, calculate GST, and monitor payments."
        title="Sales"
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={TrendingUp}
          status="success"
          title="Today's Sales"
          trend="+14% this week"
          value="₹12,400"
        />
        <StatCard
          icon={LineChart}
          status="info"
          title="Monthly Revenue"
          trend="Growing month over month"
          value="₹3,48,000"
        />
        <StatCard
          icon={WalletCards}
          status="warning"
          title="Pending Sales"
          trend="Needs payment follow-up"
          value="₹58,000"
        />
        <StatCard
          icon={IndianRupee}
          status="success"
          title="Profit This Month"
          trend="Healthy margin"
          value="₹82,500"
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
              Sales are 14% higher this week. Sugar and Cooking Oil are moving
              faster before weekends. Keep extra stock ready.
            </p>
          </div>
          <Button variant="secondary">
            <Sparkles className="h-4 w-4" />
            View sales plan
          </Button>
        </div>
      </Card>

      <SalesInsights sales={sales} />

      <SalesFilters filters={filters} onChange={updateFilter} onClear={clearFilters} />

      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-950">Sales History</h2>
            <p className="mt-1 text-sm text-slate-500">
              Showing {filteredSales.length} of {sales.length} local demo sales.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
            <BarChart3 className="h-4 w-4 text-indigo-500" />
            Local billing data only
          </div>
        </div>
      </Card>

      {filteredSales.length ? (
        <>
          <SalesTable
            onDelete={(sale) => setModalState({ type: 'delete', sale })}
            onEdit={(sale) => setModalState({ type: 'edit', sale })}
            onMarkPaid={(sale) => setModalState({ type: 'paid', sale })}
            onView={(sale) => setModalState({ type: 'view', sale })}
            sales={filteredSales}
          />
          <div className="grid gap-4 xl:hidden">
            {filteredSales.map((sale) => (
              <SaleCard
                key={sale.id}
                onDelete={(selectedSale) =>
                  setModalState({ type: 'delete', sale: selectedSale })
                }
                onEdit={(selectedSale) =>
                  setModalState({ type: 'edit', sale: selectedSale })
                }
                onMarkPaid={(selectedSale) =>
                  setModalState({ type: 'paid', sale: selectedSale })
                }
                onView={(selectedSale) =>
                  setModalState({ type: 'view', sale: selectedSale })
                }
                sale={sale}
              />
            ))}
          </div>
        </>
      ) : (
        <EmptyState onClear={clearFilters} />
      )}

      {modalState.type === 'add' || modalState.type === 'edit' ? (
        <SaleModal
          mode={modalState.type}
          onClose={() => setModalState({ type: null, sale: null })}
          onSave={saveSale}
          sale={modalState.sale}
        />
      ) : null}

      {modalState.type === 'view' && modalState.sale ? (
        <SaleDetailsModal
          onClose={() => setModalState({ type: null, sale: null })}
          sale={modalState.sale}
        />
      ) : null}

      {modalState.type === 'paid' && modalState.sale ? (
        <MarkPaidModal
          onCancel={() => setModalState({ type: null, sale: null })}
          onConfirm={markSalePaid}
          sale={modalState.sale}
        />
      ) : null}

      {modalState.type === 'delete' && modalState.sale ? (
        <DeleteConfirmModal
          onCancel={() => setModalState({ type: null, sale: null })}
          onConfirm={confirmDelete}
          sale={modalState.sale}
        />
      ) : null}
    </div>
  );
}
