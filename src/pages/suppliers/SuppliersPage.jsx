import { AnimatePresence, motion } from 'framer-motion';
import {
  BadgeCheck,
  Building2,
  CreditCard,
  Eye,
  FileText,
  Handshake,
  IndianRupee,
  Pencil,
  Search,
  SearchX,
  Send,
  Sparkles,
  Trash2,
  Truck,
  UserPlus,
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
import {
  businessProfile,
  supplierCategories,
  suppliers as mockSuppliers,
} from '../../data/mockData.js';
import {
  formatCurrency,
  formatDate,
  getPaymentStatusBadge,
  getSupplierPaymentStatus,
} from '../../utils/formatters.js';
import { isValidIndianPhone } from '../../utils/validators.js';

const paymentFilters = ['All Suppliers', 'Paid', 'Due', 'Overdue'];
const sortOptions = ['Latest', 'Highest Purchase', 'Highest Due', 'Name A-Z'];
const paymentMethods = ['UPI', 'Bank Transfer', 'Cash'];

const emptySupplierForm = {
  name: '',
  phone: '',
  address: '',
  productsSupplied: '',
  category: '',
  paymentDue: '0',
  notes: '',
};

function supplierInitials(name) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

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

function SupplierFilters({ filters, onChange, onClear }) {
  return (
    <Card>
      <div className="grid gap-4 lg:grid-cols-[1.35fr_0.75fr_0.75fr_0.75fr_auto] lg:items-end">
        <Input
          icon={Search}
          label="Search"
          name="search"
          onChange={onChange}
          placeholder="Search suppliers, phone, products..."
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
          label="Category"
          name="category"
          onChange={onChange}
          value={filters.category}
        >
          <option>All Categories</option>
          {supplierCategories.map((category) => (
            <option key={category}>{category}</option>
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

function SupplierAvatar({ supplier }) {
  return (
    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-indigo-50 text-sm font-black text-indigo-600 ring-1 ring-indigo-100">
      {supplierInitials(supplier.name)}
    </div>
  );
}

function ActionButton({ icon: Icon, label, onClick, tone = 'slate' }) {
  return (
    <button
      aria-label={label}
      className={clsx(
        'grid h-9 w-9 place-items-center rounded-full border bg-white shadow-sm transition',
        tone === 'danger'
          ? 'border-rose-100 text-rose-500 hover:bg-rose-50'
          : tone === 'accent'
            ? 'border-indigo-100 text-indigo-600 hover:bg-indigo-50'
            : 'border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-950',
      )}
      onClick={onClick}
      type="button"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function ProductPills({ products }) {
  const visibleProducts = products.slice(0, 3);
  const hiddenCount = Math.max(0, products.length - visibleProducts.length);

  return (
    <div className="flex flex-wrap gap-2">
      {visibleProducts.map((product) => (
        <span
          className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600"
          key={product}
        >
          {product}
        </span>
      ))}
      {hiddenCount > 0 ? <Badge>+{hiddenCount} more</Badge> : null}
    </div>
  );
}

function SupplierInsights({ suppliers }) {
  if (!suppliers.length) {
    return (
      <Card>
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <Truck className="h-5 w-5 text-indigo-500" />
          Add suppliers to see vendor insights here.
        </div>
      </Card>
    );
  }

  const highestDue = [...suppliers].sort((a, b) => b.paymentDue - a.paymentDue)[0];
  const topSupplier = [...suppliers].sort(
    (a, b) => b.totalPurchase - a.totalPurchase,
  )[0];
  const overdueSupplier = suppliers.find(
    (supplier) => getSupplierPaymentStatus(supplier) === 'Overdue',
  );

  const insights = [
    {
      label: 'Highest Due',
      value: `${highestDue.name} — ${formatCurrency(highestDue.paymentDue)}`,
      icon: WalletCards,
      tone: 'text-rose-600 bg-rose-50',
    },
    {
      label: 'Top Supplier',
      value: `${topSupplier.name} — ${formatCurrency(topSupplier.totalPurchase)} purchase volume`,
      icon: IndianRupee,
      tone: 'text-indigo-600 bg-indigo-50',
    },
    {
      label: 'Overdue Supplier',
      value: overdueSupplier
        ? `${overdueSupplier.name} — ${formatCurrency(overdueSupplier.paymentDue)} overdue`
        : 'No overdue suppliers',
      icon: CreditCard,
      tone: 'text-amber-600 bg-amber-50',
    },
    {
      label: 'Invoices This Month',
      value: '42',
      icon: FileText,
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

function SupplierTable({ onDelete, onEdit, onPay, onView, suppliers }) {
  return (
    <Card className="hidden overflow-hidden xl:block" padding="none">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1120px] border-separate border-spacing-0">
          <thead>
            <tr className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-400">
              <th className="px-5 py-4">Supplier</th>
              <th className="px-5 py-4">Products Supplied</th>
              <th className="px-5 py-4">Category</th>
              <th className="px-5 py-4">Total Purchase</th>
              <th className="px-5 py-4">Payment Due</th>
              <th className="px-5 py-4">Last Invoice</th>
              <th className="px-5 py-4">Payment Status</th>
              <th className="px-5 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((supplier) => {
              const status = getSupplierPaymentStatus(supplier);
              return (
                <tr key={supplier.id}>
                  <td className="border-t border-slate-100 px-5 py-4">
                    <div className="flex items-center gap-3">
                      <SupplierAvatar supplier={supplier} />
                      <div>
                        <p className="font-black text-slate-950">{supplier.name}</p>
                        <p className="text-sm text-slate-500">
                          {supplier.phone} · {supplier.address}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="border-t border-slate-100 px-5 py-4">
                    <ProductPills products={supplier.productsSupplied} />
                  </td>
                  <td className="border-t border-slate-100 px-5 py-4 text-sm font-semibold text-slate-600">
                    {supplier.category}
                  </td>
                  <td className="border-t border-slate-100 px-5 py-4 text-sm font-black text-slate-950">
                    {formatCurrency(supplier.totalPurchase)}
                  </td>
                  <td
                    className={`border-t border-slate-100 px-5 py-4 text-sm font-black ${
                      supplier.paymentDue > 0 ? 'text-rose-600' : 'text-emerald-600'
                    }`}
                  >
                    {formatCurrency(supplier.paymentDue)}
                  </td>
                  <td className="border-t border-slate-100 px-5 py-4 text-sm text-slate-500">
                    {formatDate(supplier.lastInvoiceDate)}
                  </td>
                  <td className="border-t border-slate-100 px-5 py-4">
                    <Badge variant={getPaymentStatusBadge(status)}>{status}</Badge>
                  </td>
                  <td className="border-t border-slate-100 px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <ActionButton icon={Eye} label="View supplier" onClick={() => onView(supplier)} />
                      <ActionButton icon={Pencil} label="Edit supplier" onClick={() => onEdit(supplier)} />
                      <ActionButton
                        icon={CreditCard}
                        label="Pay supplier"
                        onClick={() => onPay(supplier)}
                        tone="accent"
                      />
                      <ActionButton
                        icon={Trash2}
                        label="Delete supplier"
                        onClick={() => onDelete(supplier)}
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

function SupplierCard({ onDelete, onEdit, onPay, onView, supplier }) {
  const status = getSupplierPaymentStatus(supplier);

  return (
    <Card className="xl:hidden" hover>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <SupplierAvatar supplier={supplier} />
          <div className="min-w-0">
            <p className="truncate font-black text-slate-950">{supplier.name}</p>
            <p className="text-sm font-semibold text-slate-500">{supplier.phone}</p>
          </div>
        </div>
        <Badge variant={getPaymentStatusBadge(status)}>{status}</Badge>
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-500">{supplier.address}</p>
      <div className="mt-4">
        <ProductPills products={supplier.productsSupplied} />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 rounded-3xl bg-slate-50 p-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Category
          </p>
          <p className="mt-1 text-sm font-black text-slate-950">{supplier.category}</p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Payment Due
          </p>
          <p
            className={`mt-1 text-sm font-black ${
              supplier.paymentDue > 0 ? 'text-rose-600' : 'text-emerald-600'
            }`}
          >
            {formatCurrency(supplier.paymentDue)}
          </p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Total Purchase
          </p>
          <p className="mt-1 text-sm font-black text-slate-950">
            {formatCurrency(supplier.totalPurchase)}
          </p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Last Invoice
          </p>
          <p className="mt-1 text-sm font-black text-slate-950">
            {formatDate(supplier.lastInvoiceDate)}
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        <Button onClick={() => onView(supplier)} size="sm" variant="secondary">
          <Eye className="h-4 w-4" />
          View
        </Button>
        <Button onClick={() => onEdit(supplier)} size="sm" variant="secondary">
          <Pencil className="h-4 w-4" />
          Edit
        </Button>
        <Button onClick={() => onPay(supplier)} size="sm">
          <CreditCard className="h-4 w-4" />
          Pay
        </Button>
      </div>
      <Button className="mt-2 w-full" onClick={() => onDelete(supplier)} size="sm" variant="danger">
        <Trash2 className="h-4 w-4" />
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

function SupplierModal({ mode, onClose, onSave, supplier }) {
  const [values, setValues] = useState(() => {
    if (!supplier) {
      return emptySupplierForm;
    }

    return {
      name: supplier.name,
      phone: supplier.phone,
      address: supplier.address,
      productsSupplied: supplier.productsSupplied.join(', '),
      category: supplier.category,
      paymentDue: String(supplier.paymentDue),
      notes: supplier.notes,
    };
  });
  const [errors, setErrors] = useState({});

  function updateField(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  }

  function validate() {
    const nextErrors = {};

    if (!values.name.trim()) {
      nextErrors.name = 'Supplier name is required.';
    }

    if (!values.phone.trim()) {
      nextErrors.phone = 'Phone number is required.';
    } else if (!isValidIndianPhone(values.phone)) {
      nextErrors.phone = 'Enter a valid 10-digit Indian mobile number.';
    }

    if (!values.address.trim()) {
      nextErrors.address = 'Address is required.';
    }

    if (!values.category) {
      nextErrors.category = 'Category is required.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    const now = new Date().toISOString();
    const paymentDue = Number(values.paymentDue || 0);
    const productsSupplied = values.productsSupplied
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    onSave({
      id: supplier?.id ?? Date.now(),
      name: values.name.trim(),
      phone: values.phone.trim(),
      address: values.address.trim(),
      productsSupplied,
      category: values.category,
      totalPurchase: supplier?.totalPurchase ?? 0,
      paymentDue,
      lastInvoiceDate: supplier?.lastInvoiceDate ?? now.slice(0, 10),
      lastPaymentDate: supplier?.lastPaymentDate ?? now.slice(0, 10),
      paymentStatus: paymentDue > 0 ? 'Due' : 'Paid',
      notes: values.notes.trim(),
      createdAt: supplier?.createdAt ?? now,
      updatedAt: now,
    });
  }

  return (
    <ModalShell onClose={onClose}>
      <form className="p-5 sm:p-6" noValidate onSubmit={handleSubmit}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-indigo-600">
              {mode === 'edit' ? 'Update supplier record' : 'New supplier record'}
            </p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
              {mode === 'edit' ? 'Edit Supplier' : 'Add Supplier'}
            </h2>
          </div>
          <button
            aria-label="Close supplier form"
            className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-950"
            onClick={onClose}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Input
            error={errors.name}
            label="Supplier name"
            name="name"
            onChange={updateField}
            placeholder="ABC Traders"
            value={values.name}
          />
          <Input
            error={errors.phone}
            label="Phone number"
            name="phone"
            onChange={updateField}
            placeholder="+91 98765 11111"
            type="tel"
            value={values.phone}
          />
          <div className="sm:col-span-2">
            <Input
              error={errors.address}
              label="Address"
              name="address"
              onChange={updateField}
              placeholder="Begum Bazaar, Hyderabad"
              value={values.address}
            />
          </div>
          <div className="sm:col-span-2">
            <Input
              label="Products supplied"
              name="productsSupplied"
              onChange={updateField}
              placeholder="Rice, Wheat, Pulses"
              value={values.productsSupplied}
            />
          </div>
          <div>
            <SelectControl
              label="Category"
              name="category"
              onChange={updateField}
              value={values.category}
            >
              <option value="">Select category</option>
              {supplierCategories.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </SelectControl>
            {errors.category ? (
              <p className="mt-2 text-sm text-rose-600">{errors.category}</p>
            ) : null}
          </div>
          <Input
            label="Opening payment due"
            name="paymentDue"
            onChange={updateField}
            placeholder="0"
            type="number"
            value={values.paymentDue}
          />
          <div className="sm:col-span-2">
            <Input
              label="Notes"
              name="notes"
              onChange={updateField}
              placeholder="Key grocery supplier"
              value={values.notes}
            />
          </div>
        </div>

        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button onClick={onClose} rounded="2xl" type="button" variant="secondary">
            Cancel
          </Button>
          <Button rounded="2xl" type="submit">
            {mode === 'edit' ? 'Save Changes' : 'Save Supplier'}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}

function SupplierDetailsModal({ onClose, supplier }) {
  const status = getSupplierPaymentStatus(supplier);
  const details = [
    ['Phone', supplier.phone],
    ['Address', supplier.address],
    ['Products supplied', supplier.productsSupplied.join(', ')],
    ['Category', supplier.category],
    ['Total purchase', formatCurrency(supplier.totalPurchase)],
    ['Payment due', formatCurrency(supplier.paymentDue)],
    ['Last invoice date', formatDate(supplier.lastInvoiceDate)],
    ['Last payment date', formatDate(supplier.lastPaymentDate)],
    ['Payment status', status],
    ['Notes', supplier.notes],
  ];

  return (
    <ModalShell onClose={onClose} size="max-w-xl">
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <SupplierAvatar supplier={supplier} />
            <div>
              <h2 className="text-2xl font-black tracking-tight text-slate-950">
                {supplier.name}
              </h2>
              <Badge className="mt-2" variant={getPaymentStatusBadge(status)}>
                {status}
              </Badge>
            </div>
          </div>
          <button
            aria-label="Close supplier details"
            className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-950"
            onClick={onClose}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {details.map(([label, value]) => (
            <div
              className={clsx(
                'rounded-2xl bg-slate-50 p-4',
                ['Address', 'Products supplied', 'Notes'].includes(label)
                  ? 'sm:col-span-2'
                  : '',
              )}
              key={label}
            >
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
              {supplier.name} supplies fast-moving {supplier.category.toLowerCase()}{' '}
              items. Clear {formatCurrency(supplier.paymentDue)} due this week to
              avoid restock delays.
            </p>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

function PaymentModal({ onClose, onPaid, supplier }) {
  const [method, setMethod] = useState('UPI');

  return (
    <ModalShell onClose={onClose} size="max-w-lg">
      <div className="p-5 sm:p-6">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
          <CreditCard className="h-6 w-6" />
        </div>
        <h2 className="mt-5 text-2xl font-black tracking-tight text-slate-950">
          Payment preview
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          No real payment is made. This only updates local supplier state.
        </p>

        <div className="mt-5 rounded-3xl bg-slate-50 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-slate-500">Supplier</p>
              <p className="mt-1 text-xl font-black text-slate-950">
                {supplier.name}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-slate-500">Payment due</p>
              <p className="mt-1 text-xl font-black text-rose-600">
                {formatCurrency(supplier.paymentDue)}
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            Payment against recent supply invoices for {businessProfile.businessName}.
          </p>
        </div>

        <div className="mt-5">
          <p className="mb-2 text-sm font-semibold text-slate-700">
            Payment method
          </p>
          <div className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-100 p-1">
            {paymentMethods.map((item) => (
              <button
                className={clsx(
                  'rounded-2xl px-3 py-2 text-sm font-bold transition',
                  method === item
                    ? 'bg-white text-slate-950 shadow-sm'
                    : 'text-slate-500 hover:text-slate-950',
                )}
                key={item}
                onClick={() => setMethod(item)}
                type="button"
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button onClick={onClose} rounded="2xl" variant="secondary">
            Cancel
          </Button>
          <Button onClick={onPaid} rounded="2xl">
            Mark as Paid
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}

function DeleteConfirmModal({ onCancel, onConfirm, supplier }) {
  return (
    <ModalShell onClose={onCancel} size="max-w-md">
      <div className="p-5 sm:p-6">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-rose-50 text-rose-600">
          <Trash2 className="h-6 w-6" />
        </div>
        <h2 className="mt-5 text-2xl font-black tracking-tight text-slate-950">
          Delete this supplier record?
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          {supplier.name} will be removed from this local supplier list. No
          backend data is touched.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button onClick={onCancel} rounded="2xl" variant="secondary">
            Cancel
          </Button>
          <Button onClick={onConfirm} rounded="2xl" variant="danger">
            Delete Supplier
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
        No suppliers found
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

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState(mockSuppliers);
  const [filters, setFilters] = useState({
    search: '',
    paymentStatus: 'All Suppliers',
    category: 'All Categories',
    sortBy: 'Latest',
  });
  const [modalState, setModalState] = useState({ type: null, supplier: null });

  const filteredSuppliers = useMemo(() => {
    const searchTerm = filters.search.trim().toLowerCase();
    const nextSuppliers = suppliers.filter((supplier) => {
      const status = getSupplierPaymentStatus(supplier);
      const matchesSearch =
        !searchTerm ||
        supplier.name.toLowerCase().includes(searchTerm) ||
        supplier.phone.toLowerCase().includes(searchTerm) ||
        supplier.productsSupplied.join(' ').toLowerCase().includes(searchTerm);
      const matchesStatus =
        filters.paymentStatus === 'All Suppliers' ||
        status === filters.paymentStatus;
      const matchesCategory =
        filters.category === 'All Categories' || supplier.category === filters.category;

      return matchesSearch && matchesStatus && matchesCategory;
    });

    return [...nextSuppliers].sort((a, b) => {
      if (filters.sortBy === 'Highest Purchase') {
        return b.totalPurchase - a.totalPurchase;
      }

      if (filters.sortBy === 'Highest Due') {
        return b.paymentDue - a.paymentDue;
      }

      if (filters.sortBy === 'Name A-Z') {
        return a.name.localeCompare(b.name);
      }

      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }, [filters, suppliers]);

  function updateFilter(event) {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  }

  function clearFilters() {
    setFilters({
      search: '',
      paymentStatus: 'All Suppliers',
      category: 'All Categories',
      sortBy: 'Latest',
    });
  }

  function saveSupplier(supplier) {
    setSuppliers((current) => {
      const exists = current.some((item) => item.id === supplier.id);

      if (exists) {
        return current.map((item) => (item.id === supplier.id ? supplier : item));
      }

      return [supplier, ...current];
    });
    setModalState({ type: null, supplier: null });
  }

  function markSupplierPaid() {
    const now = new Date().toISOString();
    setSuppliers((current) =>
      current.map((supplier) =>
        supplier.id === modalState.supplier.id
          ? {
              ...supplier,
              paymentDue: 0,
              paymentStatus: 'Paid',
              lastPaymentDate: now.slice(0, 10),
              updatedAt: now,
            }
          : supplier,
      ),
    );
    setModalState({ type: null, supplier: null });
  }

  function confirmDelete() {
    setSuppliers((current) =>
      current.filter((supplier) => supplier.id !== modalState.supplier.id),
    );
    setModalState({ type: null, supplier: null });
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
            <Button onClick={() => setModalState({ type: 'add', supplier: null })}>
              <UserPlus className="h-4 w-4" />
              Add Supplier
            </Button>
          </div>
        }
        subtitle="Manage vendors, invoice history, products supplied, and payment dues."
        title="Suppliers"
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Building2}
          status="info"
          title="Total Suppliers"
          trend="Across vendor network"
          value="38"
        />
        <StatCard
          icon={WalletCards}
          status="warning"
          title="Payment Due"
          trend="Due this week"
          value="₹31,000"
        />
        <StatCard
          icon={Handshake}
          status="success"
          title="Active Suppliers"
          trend="Recent invoice activity"
          value="26"
        />
        <StatCard
          icon={FileText}
          status="neutral"
          title="Invoices This Month"
          trend="Supplier invoices"
          value="42"
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
              ABC Traders supplies your fast-moving grocery items. Clear ₹18,000
              due this week to maintain smooth restocking.
            </p>
          </div>
          <Button variant="secondary">
            <Sparkles className="h-4 w-4" />
            View payment plan
          </Button>
        </div>
      </Card>

      <SupplierInsights suppliers={suppliers} />

      <SupplierFilters
        filters={filters}
        onChange={updateFilter}
        onClear={clearFilters}
      />

      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-950">Supplier Ledger</h2>
            <p className="mt-1 text-sm text-slate-500">
              Showing {filteredSuppliers.length} of {suppliers.length} local demo suppliers.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
            <BadgeCheck className="h-4 w-4 text-indigo-500" />
            Local vendor data only
          </div>
        </div>
      </Card>

      {filteredSuppliers.length ? (
        <>
          <SupplierTable
            onDelete={(supplier) => setModalState({ type: 'delete', supplier })}
            onEdit={(supplier) => setModalState({ type: 'edit', supplier })}
            onPay={(supplier) => setModalState({ type: 'pay', supplier })}
            onView={(supplier) => setModalState({ type: 'view', supplier })}
            suppliers={filteredSuppliers}
          />
          <div className="grid gap-4 xl:hidden">
            {filteredSuppliers.map((supplier) => (
              <SupplierCard
                key={supplier.id}
                onDelete={(selectedSupplier) =>
                  setModalState({ type: 'delete', supplier: selectedSupplier })
                }
                onEdit={(selectedSupplier) =>
                  setModalState({ type: 'edit', supplier: selectedSupplier })
                }
                onPay={(selectedSupplier) =>
                  setModalState({ type: 'pay', supplier: selectedSupplier })
                }
                onView={(selectedSupplier) =>
                  setModalState({ type: 'view', supplier: selectedSupplier })
                }
                supplier={supplier}
              />
            ))}
          </div>
        </>
      ) : (
        <EmptyState onClear={clearFilters} />
      )}

      {modalState.type === 'add' || modalState.type === 'edit' ? (
        <SupplierModal
          mode={modalState.type}
          onClose={() => setModalState({ type: null, supplier: null })}
          onSave={saveSupplier}
          supplier={modalState.supplier}
        />
      ) : null}

      {modalState.type === 'view' && modalState.supplier ? (
        <SupplierDetailsModal
          onClose={() => setModalState({ type: null, supplier: null })}
          supplier={modalState.supplier}
        />
      ) : null}

      {modalState.type === 'pay' && modalState.supplier ? (
        <PaymentModal
          onClose={() => setModalState({ type: null, supplier: null })}
          onPaid={markSupplierPaid}
          supplier={modalState.supplier}
        />
      ) : null}

      {modalState.type === 'delete' && modalState.supplier ? (
        <DeleteConfirmModal
          onCancel={() => setModalState({ type: null, supplier: null })}
          onConfirm={confirmDelete}
          supplier={modalState.supplier}
        />
      ) : null}
    </div>
  );
}
