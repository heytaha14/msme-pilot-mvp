import { AnimatePresence, motion } from 'framer-motion';
import {
  BarChart3,
  CheckCircle2,
  CircleDollarSign,
  Eye,
  IndianRupee,
  LineChart,
  Loader2,
  PackageOpen,
  Pencil,
  Plus,
  ReceiptText,
  RefreshCw,
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
import { useCallback, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import Badge from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import Input from '../../components/common/Input.jsx';
import SectionHeader from '../../components/common/SectionHeader.jsx';
import StatCard from '../../components/common/StatCard.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { listCustomers } from '../../services/customerService.js';
import { listProducts } from '../../services/productService.js';
import {
  createSale,
  deleteSale,
  getSalesStats,
  listSales,
  markSalePaid as markSalePaidService,
  updateSale,
} from '../../services/salesService.js';
import {
  formatCurrency,
  formatDate,
  getSalePaymentStatusBadge,
} from '../../utils/formatters.js';
import {
  calculateDueAmount,
  calculateSaleGstAmount,
  calculateSaleProfit,
  calculateSaleSubtotal,
  calculateSaleTotalAmount,
  deriveSalePaymentStatus,
  normalizeSaleItem,
} from '../../utils/salesCalculations.js';
import { isValidIndianPhone } from '../../utils/validators.js';

const paymentFilters = ['All Sales', 'Paid', 'Pending', 'Partial', 'Cancelled'];
const dateFilters = ['Today', 'This Week', 'This Month', 'All Time'];
const sortOptions = ['Latest', 'Highest Amount', 'Highest Profit', 'Customer Name'];
const emptyLineItem = {
  productId: '',
  productName: '',
  quantity: '',
  unit: '',
  sellingPrice: '',
  purchasePrice: '',
  gstPercentage: '',
};

function todayInputDate() {
  return new Date().toISOString().slice(0, 10);
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

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

function FeedbackBanner({ message, tone = 'info', onDismiss }) {
  if (!message) return null;

  const toneClasses = {
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    warning: 'border-amber-200 bg-amber-50 text-amber-800',
    danger: 'border-rose-200 bg-rose-50 text-rose-800',
    info: 'border-cyan-200 bg-cyan-50 text-cyan-800',
  };

  return (
    <div
      className={clsx(
        'flex items-start justify-between gap-4 rounded-3xl border px-4 py-3 text-sm font-semibold',
        toneClasses[tone],
      )}
    >
      <p>{message}</p>
      {onDismiss ? (
        <button
          aria-label="Dismiss message"
          className="rounded-full p-1 transition hover:bg-white/60"
          onClick={onDismiss}
          type="button"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
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

function ItemPills({ items = [] }) {
  const visibleItems = items.slice(0, 2);
  const hiddenCount = Math.max(0, items.length - visibleItems.length);

  return (
    <div className="flex flex-wrap gap-2">
      {visibleItems.map((item) => (
        <span
          className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600"
          key={`${item.id || item.productName}-${item.quantity}`}
        >
          {item.productName}
        </span>
      ))}
      {hiddenCount > 0 ? <Badge>+{hiddenCount} more</Badge> : null}
      {!items.length ? <Badge>No items</Badge> : null}
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
  const pendingTotal = sales
    .filter((sale) => ['Pending', 'Partial'].includes(sale.paymentStatus))
    .reduce((sum, sale) => sum + Number(sale.dueAmount || 0), 0);
  const itemCounts = sales.flatMap((sale) => sale.items).reduce((counts, item) => {
    counts[item.productName] = (counts[item.productName] || 0) + Number(item.quantity || 0);
    return counts;
  }, {});
  const fastMovingItems = Object.entries(itemCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([name]) => name)
    .join(', ') || 'Add more sales';

  const insights = [
    {
      label: 'Highest Sale',
      value: `${highestSale.customerName} - ${formatCurrency(highestSale.totalAmount)}`,
      icon: ReceiptText,
      tone: 'text-indigo-600 bg-indigo-50',
    },
    {
      label: 'Best Profit Sale',
      value: `${bestProfit.customerName} - ${formatCurrency(bestProfit.profit)} profit`,
      icon: CircleDollarSign,
      tone: 'text-emerald-600 bg-emerald-50',
    },
    {
      label: 'Pending Sales',
      value: formatCurrency(pendingTotal),
      icon: WalletCards,
      tone: 'text-amber-600 bg-amber-50',
    },
    {
      label: 'Fast-Moving Items',
      value: fastMovingItems,
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
              <th className="px-5 py-4">Due</th>
              <th className="px-5 py-4">Profit</th>
              <th className="px-5 py-4">Sale Date</th>
              <th className="px-5 py-4">Payment Status</th>
              <th className="px-5 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((sale) => (
              <tr className="transition hover:bg-slate-50/70" key={sale.id}>
                <td className="border-t border-slate-100 px-5 py-4">
                  <p className="font-black text-slate-950">{sale.invoiceNumber}</p>
                  <p className="text-sm text-slate-500">{formatDate(sale.saleDate)}</p>
                </td>
                <td className="border-t border-slate-100 px-5 py-4">
                  <p className="font-black text-slate-950">{sale.customerName}</p>
                  <p className="text-sm text-slate-500">{sale.customerPhone || 'No phone'}</p>
                </td>
                <td className="border-t border-slate-100 px-5 py-4">
                  <ItemPills items={sale.items} />
                </td>
                <td className="border-t border-slate-100 px-5 py-4 text-sm font-black text-slate-950">
                  {formatCurrency(sale.totalAmount)}
                </td>
                <td className="border-t border-slate-100 px-5 py-4 text-sm font-black text-amber-600">
                  {formatCurrency(sale.dueAmount)}
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
          <p className="mt-1 text-sm font-semibold text-slate-500">{sale.customerName}</p>
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
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Total Amount</p>
          <p className="mt-1 text-sm font-black text-slate-950">
            {formatCurrency(sale.totalAmount)}
          </p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Due</p>
          <p className="mt-1 text-sm font-black text-amber-600">
            {formatCurrency(sale.dueAmount)}
          </p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Profit</p>
          <p className="mt-1 text-sm font-black text-emerald-600">
            {formatCurrency(sale.profit)}
          </p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Sale Date</p>
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

function SaleLineItemsEditor({ errors, items, onAdd, onRemove, onUpdate, products }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-black text-slate-950">Line items</h3>
          <p className="mt-1 text-sm text-slate-500">
            Select products for inventory deduction, or use custom items.
          </p>
        </div>
        <Button onClick={onAdd} size="sm" type="button" variant="secondary">
          <Plus className="h-4 w-4" />
          Add Item
        </Button>
      </div>

      {errors.items ? <p className="text-sm text-rose-600">{errors.items}</p> : null}

      {items.map((item, index) => {
        const selectedProduct = products.find((product) => product.id === item.productId);
        const availableStock = Number(selectedProduct?.currentStock ?? selectedProduct?.stock ?? 0);
        const quantity = Number(item.quantity || 0);
        const isOverStock = item.productId && quantity > availableStock;

        return (
          <div className="rounded-3xl bg-slate-50 p-4" key={index}>
            <div className="grid gap-3 lg:grid-cols-[1fr_1fr_0.55fr_0.65fr_0.55fr_auto] lg:items-start">
              <SelectControl
                label="Product"
                name="productId"
                onChange={(event) => onUpdate(index, event)}
                value={item.productId}
              >
                <option value="">Custom item</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.productName} - stock {product.currentStock}
                  </option>
                ))}
              </SelectControl>
              <Input
                error={errors[`item-${index}-productName`]}
                label="Product name"
                name="productName"
                onChange={(event) => onUpdate(index, event)}
                placeholder="Rice"
                readOnly={Boolean(item.productId)}
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
            {item.productId ? (
              <p
                className={clsx(
                  'mt-3 text-sm font-semibold',
                  isOverStock ? 'text-rose-600' : 'text-slate-500',
                )}
              >
                Available stock: {availableStock}. Selling this item will deduct stock.
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function ReadOnlyItems({ items }) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
      <p className="text-sm font-semibold text-slate-500">
        Line item editing after posting is disabled to protect inventory accuracy.
      </p>
      <div className="mt-4 space-y-2">
        {items.map((item) => (
          <div
            className="flex flex-col gap-1 rounded-2xl bg-white p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
            key={item.id || `${item.productName}-${item.quantity}`}
          >
            <span className="font-black text-slate-950">{item.productName}</span>
            <span className="font-semibold text-slate-500">
              Qty {item.quantity} {item.unit || ''} - {formatCurrency(item.lineTotal)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SaleModal({ customers, mode, onClose, onSave, products, sale, saving }) {
  const [values, setValues] = useState(() => ({
    customerId: sale?.customerId || '',
    customerName: sale?.customerName || '',
    customerPhone: sale?.customerPhone || '',
    saleDate: sale?.saleDate || todayInputDate(),
    paidAmount: String(sale?.paidAmount ?? 0),
    notes: sale?.notes || '',
    paymentStatus: sale?.paymentStatus || 'Pending',
  }));
  const [items, setItems] = useState(() =>
    sale
      ? sale.items.map((item) => ({
          productId: item.productId || '',
          productName: item.productName,
          quantity: String(item.quantity),
          unit: item.unit || '',
          sellingPrice: String(item.sellingPrice),
          purchasePrice: String(item.purchasePrice || 0),
          gstPercentage: String(item.gstPercentage || 0),
        }))
      : [{ ...emptyLineItem }],
  );
  const [errors, setErrors] = useState({});

  const calculatedItems = useMemo(() => items.map(normalizeSaleItem), [items]);
  const subtotal = calculateSaleSubtotal(calculatedItems);
  const gstAmount = calculateSaleGstAmount(calculatedItems);
  const totalAmount = calculateSaleTotalAmount(calculatedItems);
  const profit = calculateSaleProfit(calculatedItems);
  const paidAmount = Math.min(toNumber(values.paidAmount), totalAmount);
  const dueAmount = calculateDueAmount(totalAmount, paidAmount);
  const derivedPaymentStatus = deriveSalePaymentStatus(
    totalAmount,
    paidAmount,
    values.paymentStatus,
  );

  function updateField(event) {
    const { name, value } = event.target;

    if (name === 'customerId') {
      const customer = customers.find((item) => item.id === value);
      setValues((current) => ({
        ...current,
        customerId: value,
        customerName: customer ? customer.name : '',
        customerPhone: customer ? customer.phone : '',
      }));
      setErrors((current) => ({ ...current, customerName: undefined }));
      return;
    }

    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  }

  function updateItem(index, event) {
    const { name, value } = event.target;

    setItems((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) return item;

        if (name === 'productId') {
          const product = products.find((entry) => entry.id === value);
          return product
            ? {
                ...item,
                productId: value,
                productName: product.productName,
                unit: product.unit || '',
                sellingPrice: String(product.sellingPrice || ''),
                purchasePrice: String(product.purchasePrice || 0),
                gstPercentage: String(product.gstPercentage || 0),
              }
            : { ...emptyLineItem, quantity: item.quantity };
        }

        return { ...item, [name]: value };
      }),
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

    if (values.customerPhone.trim() && !isValidIndianPhone(values.customerPhone)) {
      nextErrors.customerPhone = 'Enter a valid 10-digit Indian mobile number.';
    }

    if (toNumber(values.paidAmount) < 0) {
      nextErrors.paidAmount = 'Paid amount must be 0 or more.';
    }

    if (mode !== 'edit') {
      if (!items.length) {
        nextErrors.items = 'At least one item is required.';
      }

      items.forEach((item, index) => {
        const selectedProduct = products.find((product) => product.id === item.productId);
        const availableStock = Number(selectedProduct?.currentStock ?? selectedProduct?.stock ?? 0);

        if (!item.productName.trim()) {
          nextErrors[`item-${index}-productName`] = 'Product name is required.';
        }

        if (!item.quantity || Number(item.quantity) <= 0) {
          nextErrors[`item-${index}-quantity`] = 'Quantity must be greater than 0.';
        }

        if (!item.sellingPrice || Number(item.sellingPrice) <= 0) {
          nextErrors[`item-${index}-sellingPrice`] = 'Selling price must be greater than 0.';
        }

        if (item.productId && Number(item.quantity) > availableStock) {
          nextErrors[`item-${index}-quantity`] =
            `Only ${availableStock} units available for ${selectedProduct.productName}.`;
        }
      });
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    onSave({
      id: sale?.id,
      customerId: values.customerId,
      customerName: values.customerName.trim(),
      customerPhone: values.customerPhone.trim(),
      saleDate: values.saleDate,
      paidAmount,
      paymentStatus: derivedPaymentStatus,
      notes: values.notes.trim(),
      items: calculatedItems,
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
          <SelectControl
            label="Customer"
            name="customerId"
            onChange={updateField}
            value={values.customerId}
          >
            <option value="">Walk-in / New customer</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </SelectControl>
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
          <Input
            label="Sale date"
            name="saleDate"
            onChange={updateField}
            type="date"
            value={values.saleDate}
          />
          <Input
            error={errors.paidAmount}
            label="Paid amount"
            name="paidAmount"
            onChange={updateField}
            placeholder="0"
            type="number"
            value={values.paidAmount}
          />
          <Input
            label="Notes"
            name="notes"
            onChange={updateField}
            placeholder="Payment terms or invoice note"
            value={values.notes}
          />
        </div>

        <div className="mt-7">
          {mode === 'edit' ? (
            <ReadOnlyItems items={sale.items} />
          ) : (
            <SaleLineItemsEditor
              errors={errors}
              items={items}
              onAdd={addItem}
              onRemove={removeItem}
              onUpdate={updateItem}
              products={products}
            />
          )}
        </div>

        <div className="mt-6 grid gap-3 rounded-3xl bg-slate-50 p-4 sm:grid-cols-5">
          {[
            ['Subtotal', formatCurrency(subtotal)],
            ['GST', formatCurrency(gstAmount)],
            ['Total', formatCurrency(totalAmount)],
            ['Paid', formatCurrency(paidAmount)],
            ['Due', formatCurrency(dueAmount)],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
              <p className="mt-1 font-black text-slate-950">{value}</p>
            </div>
          ))}
          <div className="sm:col-span-2">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Est. Profit</p>
            <p className="mt-1 font-black text-emerald-600">{formatCurrency(profit)}</p>
          </div>
          <div className="sm:col-span-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Payment Status</p>
            <Badge className="mt-1" variant={getSalePaymentStatusBadge(derivedPaymentStatus)}>
              {derivedPaymentStatus}
            </Badge>
          </div>
        </div>

        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button onClick={onClose} rounded="2xl" type="button" variant="secondary">
            Cancel
          </Button>
          <Button loading={saving} rounded="2xl" type="submit">
            {mode === 'edit' ? 'Save Changes' : 'Save Sale'}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}

function SaleDetailsModal({ onClose, sale }) {
  const aiAction =
    sale.paymentStatus === 'Paid'
      ? 'This sale is fully paid. Review fast-moving products for restocking.'
      : sale.paymentStatus === 'Partial'
        ? `Collect remaining ${formatCurrency(sale.dueAmount)} to close this sale.`
        : `Follow up to collect ${formatCurrency(sale.dueAmount)} for this invoice.`;

  return (
    <ModalShell onClose={onClose} size="max-w-2xl">
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-950">
              {sale.invoiceNumber}
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              {sale.customerName} {sale.customerPhone ? `- ${sale.customerPhone}` : ''}
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
              className="grid gap-2 border-b border-slate-100 bg-white p-4 last:border-b-0 sm:grid-cols-[1fr_0.4fr_0.55fr_0.45fr_0.6fr_0.6fr]"
              key={item.id || `${item.productName}-${item.quantity}`}
            >
              <p className="font-black text-slate-950">{item.productName}</p>
              <p className="text-sm text-slate-500">
                Qty {item.quantity} {item.unit || ''}
              </p>
              <p className="text-sm font-bold text-slate-950">
                {formatCurrency(item.sellingPrice)}
              </p>
              <p className="text-sm text-slate-500">{item.gstPercentage}% GST</p>
              <p className="text-sm font-black text-slate-950">
                {formatCurrency(item.lineTotal)}
              </p>
              <p className="text-sm font-black text-emerald-600">
                {formatCurrency(item.profit)}
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
            ['Paid', formatCurrency(sale.paidAmount)],
            ['Due', formatCurrency(sale.dueAmount)],
            ['Profit', formatCurrency(sale.profit)],
            ['Notes', sale.notes || 'No notes'],
          ].map(([label, value]) => (
            <div className="rounded-2xl bg-slate-50 p-4" key={label}>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
              <p className="mt-1 font-black text-slate-950">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-3xl border border-indigo-100 bg-indigo-50 p-4">
          <div className="flex gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" />
            <p className="text-sm leading-6 text-slate-700">{aiAction}</p>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

function MarkPaidModal({ loading, onCancel, onConfirm, sale }) {
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
          {sale.invoiceNumber} for {formatCurrency(sale.totalAmount)} will be marked paid in
          Appwrite and customer dues will be updated.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button onClick={onCancel} rounded="2xl" variant="secondary">
            Cancel
          </Button>
          <Button loading={loading} onClick={onConfirm} rounded="2xl">
            Mark Paid
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}

function DeleteConfirmModal({ loading, onCancel, onConfirm, sale }) {
  const [restoreStock, setRestoreStock] = useState(true);

  return (
    <ModalShell onClose={onCancel} size="max-w-md">
      <div className="p-5 sm:p-6">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-rose-50 text-rose-600">
          <Trash2 className="h-6 w-6" />
        </div>
        <h2 className="mt-5 text-2xl font-black tracking-tight text-slate-950">
          Delete this sale?
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          This removes {sale.invoiceNumber}. Deducted product stock can be restored before the
          sale is deleted.
        </p>
        <label className="mt-5 flex items-center gap-3 rounded-2xl bg-slate-50 p-3 text-sm font-semibold text-slate-700">
          <input
            checked={restoreStock}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            onChange={(event) => setRestoreStock(event.target.checked)}
            type="checkbox"
          />
          Restore deducted stock before deleting
        </label>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button onClick={onCancel} rounded="2xl" variant="secondary">
            Cancel
          </Button>
          <Button
            loading={loading}
            onClick={() => onConfirm({ restoreStock })}
            rounded="2xl"
            variant="danger"
          >
            Delete Sale
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}

function EmptyState({ isInitialEmpty, onClear, onCreate }) {
  return (
    <Card className="text-center" padding="lg">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-3xl bg-slate-100 text-slate-500">
        {isInitialEmpty ? <PackageOpen className="h-7 w-7" /> : <SearchX className="h-7 w-7" />}
      </div>
      <h2 className="mt-5 text-2xl font-black text-slate-950">
        {isInitialEmpty ? 'No sales yet' : 'No sales found'}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
        {isInitialEmpty
          ? 'Create your first sale to track revenue, GST, profit, and inventory deduction.'
          : 'Try changing your search or filters.'}
      </p>
      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        {isInitialEmpty ? (
          <Button onClick={onCreate}>
            <Plus className="h-4 w-4" />
            Create Sale
          </Button>
        ) : (
          <Button onClick={onClear} variant="secondary">
            Clear filters
          </Button>
        )}
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
        <h2 className="mt-5 text-xl font-black text-slate-950">Loading sales workspace</h2>
        <p className="mt-2 text-sm text-slate-500">
          Fetching sales, customers, products, and line items from Appwrite.
        </p>
      </div>
    </Card>
  );
}

function isWithinDateFilter(saleDate, filter) {
  if (filter === 'All Time') return true;

  const parsedSale = new Date(saleDate);
  const now = new Date();

  if (Number.isNaN(parsedSale.getTime())) return false;

  if (filter === 'Today') {
    return parsedSale.toISOString().slice(0, 10) === now.toISOString().slice(0, 10);
  }

  if (filter === 'This Week') {
    const sevenDays = 6 * 24 * 60 * 60 * 1000;
    return parsedSale.getTime() >= now.getTime() - sevenDays && parsedSale <= now;
  }

  if (filter === 'This Month') {
    return parsedSale.toISOString().slice(0, 7) === now.toISOString().slice(0, 7);
  }

  return true;
}

function getAiInsight(stats, products) {
  const lowStockProducts = products.filter((product) => {
    const stock = Number(product.currentStock ?? product.stock ?? 0);
    const minStock = Number(product.minimumStock ?? product.minStock ?? 0);
    return stock > 0 && stock <= minStock;
  });

  if (stats.pendingSales > 0) {
    return `You have ${formatCurrency(stats.pendingSales)} pending from sales. Mark paid after collection to improve cash flow.`;
  }

  if (lowStockProducts.length) {
    return 'Recent sales reduced stock for fast-moving products. Review inventory before weekend.';
  }

  if (stats.monthlyRevenue <= 0) {
    return 'Create more sales to unlock trend insights and profit recommendations.';
  }

  return 'Sales are moving cleanly. Keep recording paid amounts so revenue, dues, and profit stay accurate.';
}

export default function SalesPage() {
  const { user } = useAuth();
  const [sales, setSales] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [feedback, setFeedback] = useState({ message: '', tone: 'info' });
  const [filters, setFilters] = useState({
    search: '',
    paymentStatus: 'All Sales',
    dateFilter: 'All Time',
    sortBy: 'Latest',
  });
  const [modalState, setModalState] = useState({ type: null, sale: null });

  const loadData = useCallback(async () => {
    if (!user?.$id) return;

    setLoading(true);
    try {
      const [nextSales, nextCustomers, nextProducts] = await Promise.all([
        listSales(user.$id),
        listCustomers(user.$id),
        listProducts(user.$id),
      ]);

      setSales(nextSales);
      setCustomers(nextCustomers);
      setProducts(nextProducts);
    } catch (error) {
      setFeedback({
        message: error.message || 'Could not load sales.',
        tone: 'danger',
      });
    } finally {
      setLoading(false);
    }
  }, [user?.$id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const stats = useMemo(() => getSalesStats(sales), [sales]);
  const aiInsight = useMemo(() => getAiInsight(stats, products), [products, stats]);
  const hasActiveFilters = Boolean(
    filters.search ||
      filters.paymentStatus !== 'All Sales' ||
      filters.dateFilter !== 'All Time' ||
      filters.sortBy !== 'Latest',
  );

  const filteredSales = useMemo(() => {
    const searchTerm = filters.search.trim().toLowerCase();
    const nextSales = sales.filter((sale) => {
      const itemNames = sale.items.map((item) => item.productName).join(' ').toLowerCase();
      const matchesSearch =
        !searchTerm ||
        sale.invoiceNumber.toLowerCase().includes(searchTerm) ||
        sale.customerName.toLowerCase().includes(searchTerm) ||
        String(sale.customerPhone || '').toLowerCase().includes(searchTerm) ||
        itemNames.includes(searchTerm);
      const matchesPayment =
        filters.paymentStatus === 'All Sales' || sale.paymentStatus === filters.paymentStatus;
      const matchesDate = isWithinDateFilter(sale.saleDate, filters.dateFilter);

      return matchesSearch && matchesPayment && matchesDate;
    });

    return [...nextSales].sort((a, b) => {
      if (filters.sortBy === 'Highest Amount') return b.totalAmount - a.totalAmount;
      if (filters.sortBy === 'Highest Profit') return b.profit - a.profit;
      if (filters.sortBy === 'Customer Name') return a.customerName.localeCompare(b.customerName);
      return new Date(b.createdAt || b.saleDate) - new Date(a.createdAt || a.saleDate);
    });
  }, [filters, sales]);

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

  async function saveSale(saleData) {
    if (!user?.$id) return;

    const isEdit = modalState.type === 'edit';
    setActionLoading(isEdit ? 'edit' : 'add');
    try {
      if (isEdit) {
        await updateSale(user.$id, modalState.sale.id, saleData);
        setFeedback({ message: 'Sale updated successfully.', tone: 'success' });
      } else {
        await createSale(user.$id, saleData);
        setFeedback({
          message: 'Sale created and inventory updated successfully.',
          tone: 'success',
        });
      }

      setModalState({ type: null, sale: null });
      await loadData();
    } catch (error) {
      setFeedback({
        message: error.message || (isEdit ? 'Could not update sale.' : 'Could not create sale.'),
        tone: 'danger',
      });
    } finally {
      setActionLoading('');
    }
  }

  async function markSalePaid() {
    if (!user?.$id || !modalState.sale) return;

    setActionLoading('paid');
    try {
      await markSalePaidService(user.$id, modalState.sale.id);
      setFeedback({ message: 'Sale marked as paid.', tone: 'success' });
      setModalState({ type: null, sale: null });
      await loadData();
    } catch (error) {
      setFeedback({ message: error.message || 'Could not mark sale as paid.', tone: 'danger' });
    } finally {
      setActionLoading('');
    }
  }

  async function confirmDelete(options) {
    if (!user?.$id || !modalState.sale) return;

    setActionLoading('delete');
    try {
      await deleteSale(user.$id, modalState.sale.id, options);
      setFeedback({ message: 'Sale deleted successfully.', tone: 'success' });
      setModalState({ type: null, sale: null });
      await loadData();
    } catch (error) {
      setFeedback({ message: error.message || 'Could not delete sale.', tone: 'danger' });
    } finally {
      setActionLoading('');
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        action={
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={loadData} variant="secondary">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
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

      <FeedbackBanner
        message={feedback.message}
        onDismiss={() => setFeedback({ message: '', tone: 'info' })}
        tone={feedback.tone}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={TrendingUp}
          status="success"
          title="Today's Sales"
          trend="Real Appwrite sales"
          value={formatCurrency(stats.todaySales)}
        />
        <StatCard
          icon={LineChart}
          status="info"
          title="Monthly Revenue"
          trend="Excludes cancelled sales"
          value={formatCurrency(stats.monthlyRevenue)}
        />
        <StatCard
          icon={WalletCards}
          status="warning"
          title="Pending Sales"
          trend="Needs payment follow-up"
          value={formatCurrency(stats.pendingSales)}
        />
        <StatCard
          icon={IndianRupee}
          status="success"
          title="Profit This Month"
          trend="Calculated from line items"
          value={formatCurrency(stats.profitThisMonth)}
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
              {aiInsight}
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
              Showing {filteredSales.length} of {sales.length} Appwrite sales records.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
            <BarChart3 className="h-4 w-4 text-indigo-500" />
            Inventory and customer dues update on sale posting
          </div>
        </div>
      </Card>

      {loading ? (
        <LoadingState />
      ) : filteredSales.length ? (
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
                onDelete={(selectedSale) => setModalState({ type: 'delete', sale: selectedSale })}
                onEdit={(selectedSale) => setModalState({ type: 'edit', sale: selectedSale })}
                onMarkPaid={(selectedSale) => setModalState({ type: 'paid', sale: selectedSale })}
                onView={(selectedSale) => setModalState({ type: 'view', sale: selectedSale })}
                sale={sale}
              />
            ))}
          </div>
        </>
      ) : (
        <EmptyState
          isInitialEmpty={!sales.length && !hasActiveFilters}
          onClear={clearFilters}
          onCreate={() => setModalState({ type: 'add', sale: null })}
        />
      )}

      {modalState.type === 'add' || modalState.type === 'edit' ? (
        <SaleModal
          customers={customers}
          mode={modalState.type}
          onClose={() => setModalState({ type: null, sale: null })}
          onSave={saveSale}
          products={products}
          sale={modalState.sale}
          saving={actionLoading === 'add' || actionLoading === 'edit'}
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
          loading={actionLoading === 'paid'}
          onCancel={() => setModalState({ type: null, sale: null })}
          onConfirm={markSalePaid}
          sale={modalState.sale}
        />
      ) : null}

      {modalState.type === 'delete' && modalState.sale ? (
        <DeleteConfirmModal
          loading={actionLoading === 'delete'}
          onCancel={() => setModalState({ type: null, sale: null })}
          onConfirm={confirmDelete}
          sale={modalState.sale}
        />
      ) : null}
    </div>
  );
}
