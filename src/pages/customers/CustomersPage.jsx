import { AnimatePresence, motion } from 'framer-motion';
import {
  BellRing,
  Eye,
  IndianRupee,
  Pencil,
  Search,
  SearchX,
  Send,
  Sparkles,
  Trash2,
  UserCheck,
  UserPlus,
  UserRoundX,
  Users,
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
import { businessProfile, customers as mockCustomers } from '../../data/mockData.js';
import {
  formatCurrency,
  formatDate,
  getCustomerPaymentStatus,
  getPaymentStatusBadge,
} from '../../utils/formatters.js';
import { isValidIndianPhone } from '../../utils/validators.js';

const paymentFilters = ['All Customers', 'Paid', 'Pending', 'Overdue'];
const sortOptions = ['Latest', 'Highest Purchase', 'Highest Pending', 'Name A-Z'];

const emptyCustomerForm = {
  name: '',
  phone: '',
  address: '',
  pendingAmount: '0',
  notes: '',
};

function customerInitials(name) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function SelectControl({ label, name, value, onChange, children }) {
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

function CustomerFilters({ filters, onChange, onClear }) {
  return (
    <Card>
      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr_0.8fr_auto] lg:items-end">
        <Input
          icon={Search}
          label="Search"
          name="search"
          onChange={onChange}
          placeholder="Search customers, phone, address..."
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
          label="Sort by"
          name="sortBy"
          onChange={onChange}
          value={filters.sortBy}
        >
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

function CustomerAvatar({ customer }) {
  return (
    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-indigo-50 text-sm font-black text-indigo-600 ring-1 ring-indigo-100">
      {customerInitials(customer.name)}
    </div>
  );
}

function ActionButton({ label, icon: Icon, onClick, tone = 'slate' }) {
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

function CustomerInsights({ customers }) {
  if (!customers.length) {
    return (
      <Card>
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <Users className="h-5 w-5 text-indigo-500" />
          Add customers to see CRM insights here.
        </div>
      </Card>
    );
  }

  const highestPending = [...customers].sort(
    (a, b) => b.pendingAmount - a.pendingAmount,
  )[0];
  const bestCustomer = [...customers].sort(
    (a, b) => b.totalPurchases - a.totalPurchases,
  )[0];
  const fastPayer = customers.find((customer) => customer.name === 'Priya Mart');

  const insights = [
    {
      label: 'Highest Pending',
      value: `${highestPending.name} — ${formatCurrency(highestPending.pendingAmount)}`,
      icon: WalletCards,
      tone: 'text-rose-600 bg-rose-50',
    },
    {
      label: 'Best Customer',
      value: `${bestCustomer.name} — ${formatCurrency(bestCustomer.totalPurchases)} purchases`,
      icon: IndianRupee,
      tone: 'text-indigo-600 bg-indigo-50',
    },
    {
      label: 'Fast Payer',
      value: fastPayer?.name || 'Priya Mart',
      icon: UserCheck,
      tone: 'text-emerald-600 bg-emerald-50',
    },
    {
      label: 'New Customers This Month',
      value: '16',
      icon: UserPlus,
      tone: 'text-cyan-600 bg-cyan-50',
    },
  ];

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {insights.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.label} hover>
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

function CustomerTable({ customers, onDelete, onEdit, onRemind, onView }) {
  return (
    <Card className="hidden overflow-hidden xl:block" padding="none">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] border-separate border-spacing-0">
          <thead>
            <tr className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-400">
              <th className="px-5 py-4">Customer</th>
              <th className="px-5 py-4">Phone</th>
              <th className="px-5 py-4">Total Purchases</th>
              <th className="px-5 py-4">Pending Amount</th>
              <th className="px-5 py-4">Last Purchase</th>
              <th className="px-5 py-4">Payment Status</th>
              <th className="px-5 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => {
              const status = getCustomerPaymentStatus(customer);
              return (
                <tr key={customer.id}>
                  <td className="border-t border-slate-100 px-5 py-4">
                    <div className="flex items-center gap-3">
                      <CustomerAvatar customer={customer} />
                      <div>
                        <p className="font-black text-slate-950">{customer.name}</p>
                        <p className="text-sm text-slate-500">{customer.address}</p>
                      </div>
                    </div>
                  </td>
                  <td className="border-t border-slate-100 px-5 py-4 text-sm font-semibold text-slate-600">
                    {customer.phone}
                  </td>
                  <td className="border-t border-slate-100 px-5 py-4 text-sm font-black text-slate-950">
                    {formatCurrency(customer.totalPurchases)}
                  </td>
                  <td
                    className={`border-t border-slate-100 px-5 py-4 text-sm font-black ${
                      customer.pendingAmount > 0 ? 'text-rose-600' : 'text-emerald-600'
                    }`}
                  >
                    {formatCurrency(customer.pendingAmount)}
                  </td>
                  <td className="border-t border-slate-100 px-5 py-4 text-sm text-slate-500">
                    {formatDate(customer.lastPurchaseDate)}
                  </td>
                  <td className="border-t border-slate-100 px-5 py-4">
                    <Badge variant={getPaymentStatusBadge(status)}>{status}</Badge>
                  </td>
                  <td className="border-t border-slate-100 px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <ActionButton icon={Eye} label="View customer" onClick={() => onView(customer)} />
                      <ActionButton icon={Pencil} label="Edit customer" onClick={() => onEdit(customer)} />
                      <ActionButton
                        icon={BellRing}
                        label="Send reminder"
                        onClick={() => onRemind(customer)}
                        tone="accent"
                      />
                      <ActionButton
                        icon={Trash2}
                        label="Delete customer"
                        onClick={() => onDelete(customer)}
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

function CustomerCard({ customer, onDelete, onEdit, onRemind, onView }) {
  const status = getCustomerPaymentStatus(customer);

  return (
    <Card className="xl:hidden" hover>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <CustomerAvatar customer={customer} />
          <div className="min-w-0">
            <p className="truncate font-black text-slate-950">{customer.name}</p>
            <p className="text-sm font-semibold text-slate-500">{customer.phone}</p>
          </div>
        </div>
        <Badge variant={getPaymentStatusBadge(status)}>{status}</Badge>
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-500">{customer.address}</p>

      <div className="mt-5 grid grid-cols-2 gap-3 rounded-3xl bg-slate-50 p-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Purchases
          </p>
          <p className="mt-1 text-sm font-black text-slate-950">
            {formatCurrency(customer.totalPurchases)}
          </p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Pending
          </p>
          <p
            className={`mt-1 text-sm font-black ${
              customer.pendingAmount > 0 ? 'text-rose-600' : 'text-emerald-600'
            }`}
          >
            {formatCurrency(customer.pendingAmount)}
          </p>
        </div>
        <div className="col-span-2">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Last purchase
          </p>
          <p className="mt-1 text-sm font-black text-slate-950">
            {formatDate(customer.lastPurchaseDate)}
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        <Button onClick={() => onView(customer)} size="sm" variant="secondary">
          <Eye className="h-4 w-4" />
          View
        </Button>
        <Button onClick={() => onEdit(customer)} size="sm" variant="secondary">
          <Pencil className="h-4 w-4" />
          Edit
        </Button>
        <Button onClick={() => onRemind(customer)} size="sm">
          <Send className="h-4 w-4" />
          Remind
        </Button>
      </div>
      <Button className="mt-2 w-full" onClick={() => onDelete(customer)} size="sm" variant="danger">
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

function CustomerModal({ customer, mode, onClose, onSave }) {
  const [values, setValues] = useState(() => {
    if (!customer) {
      return emptyCustomerForm;
    }

    return {
      name: customer.name,
      phone: customer.phone,
      address: customer.address,
      pendingAmount: String(customer.pendingAmount),
      notes: customer.notes,
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
      nextErrors.name = 'Customer name is required.';
    }

    if (!values.phone.trim()) {
      nextErrors.phone = 'Phone number is required.';
    } else if (!isValidIndianPhone(values.phone)) {
      nextErrors.phone = 'Enter a valid 10-digit Indian mobile number.';
    }

    if (!values.address.trim()) {
      nextErrors.address = 'Address is required.';
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
    const pendingAmount = Number(values.pendingAmount || 0);

    onSave({
      id: customer?.id ?? Date.now(),
      name: values.name.trim(),
      phone: values.phone.trim(),
      address: values.address.trim(),
      totalPurchases: customer?.totalPurchases ?? 0,
      pendingAmount,
      lastPurchaseDate: customer?.lastPurchaseDate ?? now.slice(0, 10),
      paymentStatus: pendingAmount > 0 ? 'Pending' : 'Paid',
      notes: values.notes.trim(),
      createdAt: customer?.createdAt ?? now,
      updatedAt: now,
    });
  }

  return (
    <ModalShell onClose={onClose}>
      <form className="p-5 sm:p-6" noValidate onSubmit={handleSubmit}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-indigo-600">
              {mode === 'edit' ? 'Update customer record' : 'New customer record'}
            </p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
              {mode === 'edit' ? 'Edit Customer' : 'Add Customer'}
            </h2>
          </div>
          <button
            aria-label="Close customer form"
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
            label="Customer name"
            name="name"
            onChange={updateField}
            placeholder="Ahmed Traders"
            value={values.name}
          />
          <Input
            error={errors.phone}
            label="Phone number"
            name="phone"
            onChange={updateField}
            placeholder="+91 98765 43210"
            type="tel"
            value={values.phone}
          />
          <div className="sm:col-span-2">
            <Input
              error={errors.address}
              label="Address"
              name="address"
              onChange={updateField}
              placeholder="Market Road, Hyderabad"
              value={values.address}
            />
          </div>
          <Input
            label="Opening pending amount"
            name="pendingAmount"
            onChange={updateField}
            placeholder="0"
            type="number"
            value={values.pendingAmount}
          />
          <Input
            label="Notes"
            name="notes"
            onChange={updateField}
            placeholder="Highest pending customer"
            value={values.notes}
          />
        </div>

        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button onClick={onClose} rounded="2xl" type="button" variant="secondary">
            Cancel
          </Button>
          <Button rounded="2xl" type="submit">
            {mode === 'edit' ? 'Save Changes' : 'Save Customer'}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}

function CustomerDetailsModal({ customer, onClose }) {
  const status = getCustomerPaymentStatus(customer);
  const details = [
    ['Phone', customer.phone],
    ['Address', customer.address],
    ['Total purchases', formatCurrency(customer.totalPurchases)],
    ['Pending amount', formatCurrency(customer.pendingAmount)],
    ['Last purchase date', formatDate(customer.lastPurchaseDate)],
    ['Payment status', status],
    ['Notes', customer.notes],
  ];

  return (
    <ModalShell onClose={onClose} size="max-w-xl">
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <CustomerAvatar customer={customer} />
            <div>
              <h2 className="text-2xl font-black tracking-tight text-slate-950">
                {customer.name}
              </h2>
              <Badge className="mt-2" variant={getPaymentStatusBadge(status)}>
                {status}
              </Badge>
            </div>
          </div>
          <button
            aria-label="Close customer details"
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
                label === 'Address' || label === 'Notes' ? 'sm:col-span-2' : '',
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
              If payment remains pending this week, send a reminder to recover{' '}
              {formatCurrency(customer.pendingAmount)}.
            </p>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

function ReminderModal({ customer, onClose }) {
  const [sent, setSent] = useState(false);
  const message = `Hi ${customer.name}, your pending payment of ${formatCurrency(
    customer.pendingAmount,
  )} is due. Please clear it at your convenience. Thank you — ${businessProfile.businessName}.`;

  return (
    <ModalShell onClose={onClose} size="max-w-lg">
      <div className="p-5 sm:p-6">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
          <BellRing className="h-6 w-6" />
        </div>
        <h2 className="mt-5 text-2xl font-black tracking-tight text-slate-950">
          Reminder preview
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          No SMS, WhatsApp, or email is sent. This is local UI only.
        </p>
        <div className="mt-5 rounded-3xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
          {message}
        </div>
        {sent ? (
          <Badge className="mt-4" variant="success">
            Reminder marked as sent
          </Badge>
        ) : null}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button onClick={onClose} rounded="2xl" variant="secondary">
            Cancel
          </Button>
          <Button
            onClick={() => {
              setSent(true);
              window.setTimeout(onClose, 650);
            }}
            rounded="2xl"
          >
            Mark Reminder Sent
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}

function DeleteConfirmModal({ customer, onCancel, onConfirm }) {
  return (
    <ModalShell onClose={onCancel} size="max-w-md">
      <div className="p-5 sm:p-6">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-rose-50 text-rose-600">
          <Trash2 className="h-6 w-6" />
        </div>
        <h2 className="mt-5 text-2xl font-black tracking-tight text-slate-950">
          Delete this customer record?
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          {customer.name} will be removed from this local customer list. No
          backend data is touched.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button onClick={onCancel} rounded="2xl" variant="secondary">
            Cancel
          </Button>
          <Button onClick={onConfirm} rounded="2xl" variant="danger">
            Delete Customer
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
        No customers found
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

export default function CustomersPage() {
  const [customers, setCustomers] = useState(mockCustomers);
  const [filters, setFilters] = useState({
    search: '',
    paymentStatus: 'All Customers',
    sortBy: 'Latest',
  });
  const [modalState, setModalState] = useState({ type: null, customer: null });

  const filteredCustomers = useMemo(() => {
    const searchTerm = filters.search.trim().toLowerCase();
    const nextCustomers = customers.filter((customer) => {
      const status = getCustomerPaymentStatus(customer);
      const matchesSearch =
        !searchTerm ||
        customer.name.toLowerCase().includes(searchTerm) ||
        customer.phone.toLowerCase().includes(searchTerm) ||
        customer.address.toLowerCase().includes(searchTerm);
      const matchesStatus =
        filters.paymentStatus === 'All Customers' ||
        status === filters.paymentStatus;

      return matchesSearch && matchesStatus;
    });

    return [...nextCustomers].sort((a, b) => {
      if (filters.sortBy === 'Highest Purchase') {
        return b.totalPurchases - a.totalPurchases;
      }

      if (filters.sortBy === 'Highest Pending') {
        return b.pendingAmount - a.pendingAmount;
      }

      if (filters.sortBy === 'Name A-Z') {
        return a.name.localeCompare(b.name);
      }

      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }, [customers, filters]);

  function updateFilter(event) {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  }

  function clearFilters() {
    setFilters({
      search: '',
      paymentStatus: 'All Customers',
      sortBy: 'Latest',
    });
  }

  function saveCustomer(customer) {
    setCustomers((current) => {
      const exists = current.some((item) => item.id === customer.id);

      if (exists) {
        return current.map((item) => (item.id === customer.id ? customer : item));
      }

      return [customer, ...current];
    });
    setModalState({ type: null, customer: null });
  }

  function confirmDelete() {
    setCustomers((current) =>
      current.filter((customer) => customer.id !== modalState.customer.id),
    );
    setModalState({ type: null, customer: null });
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
            <Button onClick={() => setModalState({ type: 'add', customer: null })}>
              <UserPlus className="h-4 w-4" />
              Add Customer
            </Button>
          </div>
        }
        subtitle="Track loyal customers, purchase history, and pending payments."
        title="Customers"
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Users}
          status="info"
          title="Total Customers"
          trend="Across your active ledger"
          value="124"
        />
        <StatCard
          icon={WalletCards}
          status="warning"
          title="Pending Amount"
          trend="Needs follow-up"
          value="₹42,500"
        />
        <StatCard
          icon={UserCheck}
          status="success"
          title="Active Customers"
          trend="Purchased recently"
          value="89"
        />
        <StatCard
          icon={UserPlus}
          status="neutral"
          title="New This Month"
          trend="Growing customer base"
          value="16"
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
              Ahmed Traders has the highest pending amount. Follow up this week
              to improve cash flow.
            </p>
          </div>
          <Button variant="secondary">
            <Sparkles className="h-4 w-4" />
            View follow-up plan
          </Button>
        </div>
      </Card>

      <CustomerInsights customers={customers} />

      <CustomerFilters
        filters={filters}
        onChange={updateFilter}
        onClear={clearFilters}
      />

      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-950">Customer Ledger</h2>
            <p className="mt-1 text-sm text-slate-500">
              Showing {filteredCustomers.length} of {customers.length} local demo customers.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
            <UserRoundX className="h-4 w-4 text-indigo-500" />
            Local CRM data only
          </div>
        </div>
      </Card>

      {filteredCustomers.length ? (
        <>
          <CustomerTable
            customers={filteredCustomers}
            onDelete={(customer) => setModalState({ type: 'delete', customer })}
            onEdit={(customer) => setModalState({ type: 'edit', customer })}
            onRemind={(customer) => setModalState({ type: 'remind', customer })}
            onView={(customer) => setModalState({ type: 'view', customer })}
          />
          <div className="grid gap-4 xl:hidden">
            {filteredCustomers.map((customer) => (
              <CustomerCard
                customer={customer}
                key={customer.id}
                onDelete={(selectedCustomer) =>
                  setModalState({ type: 'delete', customer: selectedCustomer })
                }
                onEdit={(selectedCustomer) =>
                  setModalState({ type: 'edit', customer: selectedCustomer })
                }
                onRemind={(selectedCustomer) =>
                  setModalState({ type: 'remind', customer: selectedCustomer })
                }
                onView={(selectedCustomer) =>
                  setModalState({ type: 'view', customer: selectedCustomer })
                }
              />
            ))}
          </div>
        </>
      ) : (
        <EmptyState onClear={clearFilters} />
      )}

      {modalState.type === 'add' || modalState.type === 'edit' ? (
        <CustomerModal
          customer={modalState.customer}
          mode={modalState.type}
          onClose={() => setModalState({ type: null, customer: null })}
          onSave={saveCustomer}
        />
      ) : null}

      {modalState.type === 'view' && modalState.customer ? (
        <CustomerDetailsModal
          customer={modalState.customer}
          onClose={() => setModalState({ type: null, customer: null })}
        />
      ) : null}

      {modalState.type === 'remind' && modalState.customer ? (
        <ReminderModal
          customer={modalState.customer}
          onClose={() => setModalState({ type: null, customer: null })}
        />
      ) : null}

      {modalState.type === 'delete' && modalState.customer ? (
        <DeleteConfirmModal
          customer={modalState.customer}
          onCancel={() => setModalState({ type: null, customer: null })}
          onConfirm={confirmDelete}
        />
      ) : null}
    </div>
  );
}
