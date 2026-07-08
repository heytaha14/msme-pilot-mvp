import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  Archive,
  Bell,
  BellDot,
  BellOff,
  Boxes,
  Check,
  Clock,
  FileText,
  Loader2,
  PackageX,
  ReceiptText,
  RefreshCw,
  Search,
  SearchX,
  Settings,
  Sparkles,
  Trash2,
  TrendingUp,
  TriangleAlert,
  Truck,
  Users,
  WalletCards,
  WandSparkles,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import Badge from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import Input from '../../components/common/Input.jsx';
import SectionHeader from '../../components/common/SectionHeader.jsx';
import StatCard from '../../components/common/StatCard.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  archiveNotification as archiveNotificationService,
  archiveNotifications,
  deleteNotification as deleteNotificationService,
  deleteNotifications,
  generateBusinessNotifications,
  getNotificationStats,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  markNotificationUnread,
  searchNotifications,
  syncGeneratedNotifications,
} from '../../services/notificationService.js';
import {
  getNotificationPriorityBadge,
  getNotificationStatusBadge,
} from '../../utils/formatters.js';

const typeFilters = [
  'All Types',
  'Low Stock',
  'Payment Due',
  'Invoice',
  'Inventory',
  'Customer',
  'Supplier',
  'GST',
  'Business Health',
  'Sales',
  'Report',
];

const priorityFilters = ['All Priority', 'Critical', 'High', 'Medium', 'Low'];
const statusFilters = ['All', 'Unread', 'Read', 'Archived'];
const channels = ['In-app', 'Email', 'WhatsApp later'];
const notificationSettings = [
  'Low Stock Alerts',
  'Payment Reminders',
  'Invoice Updates',
  'GST Reminders',
  'Business Health Alerts',
  'Sales Alerts',
  'Report Alerts',
];

const typeIconMap = {
  'Low Stock': PackageX,
  'Payment Due': WalletCards,
  Invoice: ReceiptText,
  Inventory: Boxes,
  Customer: Users,
  Supplier: Truck,
  GST: FileText,
  'Business Health': Activity,
  Sales: TrendingUp,
  Report: FileText,
};

const typeToneMap = {
  'Low Stock': 'bg-amber-50 text-amber-600 ring-amber-100',
  'Payment Due': 'bg-rose-50 text-rose-600 ring-rose-100',
  Invoice: 'bg-cyan-50 text-cyan-600 ring-cyan-100',
  Inventory: 'bg-indigo-50 text-indigo-600 ring-indigo-100',
  Customer: 'bg-blue-50 text-blue-600 ring-blue-100',
  Supplier: 'bg-slate-100 text-slate-600 ring-slate-200',
  GST: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
  'Business Health': 'bg-indigo-50 text-indigo-600 ring-indigo-100',
  Sales: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
  Report: 'bg-cyan-50 text-cyan-600 ring-cyan-100',
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

function FeedbackBanner({ message, onDismiss, tone = 'success' }) {
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
      <button className="font-black" onClick={onDismiss} type="button">
        Dismiss
      </button>
    </div>
  );
}

function ActionButton({ disabled, icon: Icon, label, loading, onClick, tone = 'slate' }) {
  return (
    <button
      aria-label={label}
      className={clsx(
        'grid h-9 w-9 place-items-center rounded-full border bg-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60',
        tone === 'danger'
          ? 'border-rose-100 text-rose-500 hover:bg-rose-50'
          : tone === 'accent'
            ? 'border-indigo-100 text-indigo-600 hover:bg-indigo-50'
            : 'border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-950',
      )}
      disabled={disabled || loading}
      onClick={onClick}
      type="button"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
    </button>
  );
}

function NotificationIcon({ type }) {
  const Icon = typeIconMap[type] || Bell;
  return (
    <div className={clsx('grid h-11 w-11 shrink-0 place-items-center rounded-2xl ring-1 ring-inset', typeToneMap[type] || 'bg-slate-100 text-slate-600 ring-slate-200')}>
      <Icon className="h-5 w-5" />
    </div>
  );
}

function NotificationFilters({ filters, onChange, onClear }) {
  return (
    <Card>
      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.75fr_0.75fr_0.65fr_auto] xl:items-end">
        <Input
          icon={Search}
          label="Search"
          name="search"
          onChange={onChange}
          placeholder="Search notifications, customers, suppliers..."
          value={filters.search}
        />
        <SelectControl label="Type" name="type" onChange={onChange} value={filters.type}>
          {typeFilters.map((type) => <option key={type}>{type}</option>)}
        </SelectControl>
        <SelectControl label="Priority" name="priority" onChange={onChange} value={filters.priority}>
          {priorityFilters.map((priority) => <option key={priority}>{priority}</option>)}
        </SelectControl>
        <SelectControl label="Status" name="status" onChange={onChange} value={filters.status}>
          {statusFilters.map((status) => <option key={status}>{status}</option>)}
        </SelectControl>
        <Button className="w-full xl:w-auto" onClick={onClear} variant="secondary">
          Clear
        </Button>
      </div>
    </Card>
  );
}

function BulkActionBar({ count, loading, onArchive, onDelete, onMarkRead }) {
  if (!count) return null;

  return (
    <Card className="border-indigo-100 bg-indigo-50/80" padding="sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-bold text-indigo-700">
          {count} notification{count > 1 ? 's' : ''} selected
        </p>
        <div className="flex flex-wrap gap-2">
          <Button loading={loading === 'bulk-read'} onClick={onMarkRead} size="sm" variant="secondary">
            <Check className="h-4 w-4" />
            Mark Read
          </Button>
          <Button loading={loading === 'bulk-archive'} onClick={onArchive} size="sm" variant="secondary">
            <Archive className="h-4 w-4" />
            Archive
          </Button>
          <Button loading={loading === 'bulk-delete'} onClick={onDelete} size="sm" variant="danger">
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>
    </Card>
  );
}

function NotificationRow({
  actionLoading,
  isSelected,
  notification,
  onArchive,
  onDelete,
  onTakeAction,
  onToggleRead,
  onToggleSelect,
}) {
  const isUnread = notification.status === 'Unread';
  const isBusy = actionLoading === notification.id;

  return (
    <div
      className={clsx(
        'grid gap-4 border-b border-slate-100 px-5 py-4 transition last:border-b-0 lg:grid-cols-[auto_1fr_auto] lg:items-center',
        isUnread ? 'bg-indigo-50/40' : 'bg-white',
        isSelected && 'bg-cyan-50/60',
      )}
    >
      <div className="flex min-w-0 items-start gap-4">
        <input
          aria-label={`Select ${notification.title}`}
          checked={isSelected}
          className="mt-3 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          onChange={() => onToggleSelect(notification.id)}
          type="checkbox"
        />
        <NotificationIcon type={notification.type} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-black text-slate-950">{notification.title}</h3>
            {isUnread ? <span className="h-2 w-2 rounded-full bg-indigo-500" /> : null}
          </div>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">{notification.message}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge variant="neutral">{notification.type}</Badge>
            <Badge variant={getNotificationPriorityBadge(notification.priority)}>{notification.priority}</Badge>
            <Badge variant={getNotificationStatusBadge(notification.status)}>{notification.status}</Badge>
            <span className="text-xs font-semibold text-slate-400">{notification.timeLabel}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
        <Button disabled={isBusy} onClick={() => onTakeAction(notification)} size="sm" variant="secondary">
          {notification.actionLabel}
        </Button>
        <ActionButton
          icon={isUnread ? Check : BellDot}
          label={isUnread ? 'Mark as read' : 'Mark as unread'}
          loading={isBusy}
          onClick={() => onToggleRead(notification)}
          tone="accent"
        />
        <ActionButton icon={Archive} label="Archive" loading={isBusy} onClick={() => onArchive(notification.id)} />
        <ActionButton icon={Trash2} label="Delete" loading={isBusy} onClick={() => onDelete(notification.id)} tone="danger" />
      </div>
    </div>
  );
}

function NotificationCard(props) {
  const { actionLoading, isSelected, notification, onArchive, onDelete, onTakeAction, onToggleRead, onToggleSelect } = props;
  const isUnread = notification.status === 'Unread';
  const isBusy = actionLoading === notification.id;

  return (
    <Card className={clsx(isUnread && 'border-indigo-100 bg-indigo-50/40')} hover>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <input
            aria-label={`Select ${notification.title}`}
            checked={isSelected}
            className="mt-3 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            onChange={() => onToggleSelect(notification.id)}
            type="checkbox"
          />
          <NotificationIcon type={notification.type} />
          <div className="min-w-0">
            <h3 className="font-black leading-5 text-slate-950">{notification.title}</h3>
            <p className="mt-1 text-sm leading-6 text-slate-500">{notification.message}</p>
          </div>
        </div>
        {isUnread ? <span className="mt-2 h-2.5 w-2.5 rounded-full bg-indigo-500" /> : null}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Badge variant={getNotificationPriorityBadge(notification.priority)}>{notification.priority}</Badge>
        <Badge variant={getNotificationStatusBadge(notification.status)}>{notification.status}</Badge>
        <span className="text-xs font-semibold text-slate-400">{notification.timeLabel}</span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2">
        <Button className="col-span-2" disabled={isBusy} onClick={() => onTakeAction(notification)} size="sm" variant="secondary">
          {notification.actionLabel}
        </Button>
        <Button loading={isBusy} onClick={() => onToggleRead(notification)} size="sm" variant="ghost">
          {isUnread ? 'Mark read' : 'Mark unread'}
        </Button>
        <Button loading={isBusy} onClick={() => onArchive(notification.id)} size="sm" variant="ghost">
          Archive
        </Button>
        <Button className="col-span-2" loading={isBusy} onClick={() => onDelete(notification.id)} size="sm" variant="danger">
          Delete
        </Button>
      </div>
    </Card>
  );
}

function NotificationList({ actionLoading, notifications, onArchive, onClearFilters, onDelete, onRefreshAlerts, onTakeAction, onToggleRead, onToggleSelect, selectedIds }) {
  if (!notifications.length) {
    return (
      <Card className="py-14 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-3xl bg-slate-100 text-slate-500">
          <SearchX className="h-7 w-7" />
        </div>
        <h3 className="mt-5 text-lg font-black text-slate-950">No notifications found</h3>
        <p className="mt-2 text-sm text-slate-500">Try changing your search or refresh alerts from business data.</p>
        <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
          <Button onClick={onRefreshAlerts}>
            <RefreshCw className="h-4 w-4" />
            Refresh Alerts
          </Button>
          <Button onClick={onClearFilters} variant="secondary">Clear filters</Button>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="hidden overflow-hidden lg:block" padding="none">
        {notifications.map((notification) => (
          <NotificationRow
            actionLoading={actionLoading}
            isSelected={selectedIds.includes(notification.id)}
            key={notification.id}
            notification={notification}
            onArchive={onArchive}
            onDelete={onDelete}
            onTakeAction={onTakeAction}
            onToggleRead={onToggleRead}
            onToggleSelect={onToggleSelect}
          />
        ))}
      </Card>
      <div className="grid gap-4 lg:hidden">
        {notifications.map((notification) => (
          <NotificationCard
            actionLoading={actionLoading}
            isSelected={selectedIds.includes(notification.id)}
            key={notification.id}
            notification={notification}
            onArchive={onArchive}
            onDelete={onDelete}
            onTakeAction={onTakeAction}
            onToggleRead={onToggleRead}
            onToggleSelect={onToggleSelect}
          />
        ))}
      </div>
    </>
  );
}

function NotificationInsights({ insights }) {
  const icons = [TriangleAlert, WalletCards, BellDot, ReceiptText];
  const tones = [
    'bg-rose-50 text-rose-600',
    'bg-amber-50 text-amber-600',
    'bg-indigo-50 text-indigo-600',
    'bg-cyan-50 text-cyan-600',
  ];

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {insights.map((insight, index) => {
        const Icon = icons[index] || Bell;
        return (
          <Card hover key={insight.label}>
            <div className="flex items-start gap-3">
              <div className={clsx('grid h-11 w-11 place-items-center rounded-2xl', tones[index])}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-500">{insight.label}</p>
                <p className="mt-1 text-sm font-black leading-5 text-slate-950">{insight.value}</p>
              </div>
            </div>
          </Card>
        );
      })}
    </section>
  );
}

function ModalShell({ children, onClose }) {
  return (
    <AnimatePresence>
      <motion.div animate={{ opacity: 1 }} className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-3 backdrop-blur-sm sm:items-center" exit={{ opacity: 0 }} initial={{ opacity: 0 }}>
        <button aria-label="Close modal" className="absolute inset-0 h-full w-full" onClick={onClose} type="button" />
        <motion.div animate={{ opacity: 1, y: 0, scale: 1 }} className="relative z-10 w-full max-w-2xl" exit={{ opacity: 0, y: 18, scale: 0.98 }} initial={{ opacity: 0, y: 28, scale: 0.98 }} transition={{ duration: 0.2 }}>
          {children}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function ToggleRow({ checked, label, onToggle }) {
  return (
    <button className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-indigo-200 hover:bg-indigo-50/40" onClick={onToggle} type="button">
      <span className="text-sm font-bold text-slate-700">{label}</span>
      <span className={clsx('relative h-6 w-11 rounded-full transition', checked ? 'bg-indigo-600' : 'bg-slate-200')}>
        <span className={clsx('absolute top-1 h-4 w-4 rounded-full bg-white shadow transition', checked ? 'left-6' : 'left-1')} />
      </span>
    </button>
  );
}

function NotificationSettingsModal({ channelState, onClose, onSave, onToggleChannel, onTogglePreference, preferenceState }) {
  return (
    <ModalShell onClose={onClose}>
      <Card className="max-h-[92vh] overflow-y-auto" padding="lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Badge variant="info">Local preferences</Badge>
            <h2 className="mt-3 text-2xl font-black text-slate-950">Notification Settings</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Notification preferences are local until app_settings integration. Email and WhatsApp delivery come later.
            </p>
          </div>
          <button aria-label="Close settings" className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200" onClick={onClose} type="button">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {notificationSettings.map((setting) => (
            <ToggleRow checked={preferenceState[setting]} key={setting} label={setting} onToggle={() => onTogglePreference(setting)} />
          ))}
        </div>

        <div className="mt-6">
          <h3 className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">Delivery channels</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {channels.map((channel) => (
              <ToggleRow checked={channelState[channel]} key={channel} label={channel} onToggle={() => onToggleChannel(channel)} />
            ))}
          </div>
        </div>

        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button onClick={onClose} variant="secondary">Cancel</Button>
          <Button onClick={onSave}>Save Preferences</Button>
        </div>
      </Card>
    </ModalShell>
  );
}

function buildPriorityInsight(notifications) {
  const active = notifications.filter((notification) => notification.status !== 'Archived');
  const critical = active.filter((notification) => notification.priority === 'Critical');
  const lowStock = active.filter((notification) => notification.type === 'Low Stock');
  const payment = active.filter((notification) => ['Customer', 'Payment Due', 'Supplier'].includes(notification.type));

  if (critical.length) {
    return `You have ${critical.length} critical alert${critical.length === 1 ? '' : 's'}. Start with out-of-stock products and overdue payments.`;
  }

  if (lowStock.length) {
    return 'Restock low-stock items before weekend demand increases.';
  }

  if (payment.length) {
    return 'Recover pending payments and plan supplier dues to improve cash flow.';
  }

  return 'No urgent alerts. Your business operations look stable.';
}

function buildInsights(notifications) {
  const active = notifications.filter((notification) => notification.status !== 'Archived');
  const sorted = [...active].sort((a, b) => {
    const rank = { Critical: 4, High: 3, Medium: 2, Low: 1 };
    return (rank[b.priority] || 0) - (rank[a.priority] || 0);
  });
  const typeCounts = active.reduce((acc, notification) => {
    acc[notification.type] = (acc[notification.type] || 0) + 1;
    return acc;
  }, {});
  const topType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];

  return [
    { label: 'Most urgent', value: sorted[0]?.title || 'No urgent alerts' },
    { label: 'Top category', value: topType ? `${topType[0]} (${topType[1]})` : 'No active category' },
    { label: 'Unread alerts', value: String(active.filter((item) => item.status === 'Unread').length) },
    { label: 'Pending reviews', value: `${active.filter((item) => item.type === 'Invoice').length} invoice alerts` },
  ];
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [filters, setFilters] = useState({
    search: '',
    type: 'All Types',
    priority: 'All Priority',
    status: 'All',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshingAlerts, setIsRefreshingAlerts] = useState(false);
  const [bulkLoading, setBulkLoading] = useState('');
  const [actionLoading, setActionLoading] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [feedback, setFeedback] = useState({ message: '', tone: 'success' });
  const [preferenceState, setPreferenceState] = useState(() => Object.fromEntries(notificationSettings.map((setting) => [setting, true])));
  const [channelState, setChannelState] = useState({ 'In-app': true, Email: false, 'WhatsApp later': false });

  const loadNotifications = useCallback(async () => {
    if (!user?.$id) return;

    setIsLoading(true);
    try {
      const loaded = await listNotifications(user.$id);
      if (!loaded.length) {
        const generated = await generateBusinessNotifications(user.$id);
        if (generated.notifications.length) {
          await syncGeneratedNotifications(user.$id, generated.notifications);
          setNotifications(await listNotifications(user.$id));
        } else {
          setNotifications([]);
        }
      } else {
        setNotifications(loaded);
      }
    } catch (error) {
      setFeedback({ message: error.message || 'Could not load notifications.', tone: 'danger' });
    } finally {
      setIsLoading(false);
    }
  }, [user?.$id]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const filteredNotifications = useMemo(
    () => searchNotifications(notifications, filters),
    [filters, notifications],
  );
  const stats = useMemo(() => getNotificationStats(notifications), [notifications]);
  const insights = useMemo(() => buildInsights(notifications), [notifications]);
  const selectedVisibleCount = selectedIds.filter((id) => filteredNotifications.some((notification) => notification.id === id)).length;

  function showFeedback(message, tone = 'success') {
    setFeedback({ message, tone });
  }

  function handleFilterChange(event) {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  }

  function clearFilters() {
    setFilters({ search: '', type: 'All Types', priority: 'All Priority', status: 'All' });
  }

  async function refreshAlerts() {
    if (!user?.$id) return;

    setIsRefreshingAlerts(true);
    try {
      const generated = await generateBusinessNotifications(user.$id);
      const result = await syncGeneratedNotifications(user.$id, generated.notifications);
      const loaded = await listNotifications(user.$id);
      setNotifications(loaded);
      setSelectedIds([]);
      showFeedback(
        generated.warnings?.length
          ? 'Business alerts refreshed. Some alert sources are unavailable.'
          : `Business alerts refreshed. ${result.created.length} new, ${result.updated.length} updated.`,
        generated.warnings?.length ? 'warning' : 'success',
      );
    } catch (error) {
      showFeedback(error.message || 'Could not refresh business alerts.', 'danger');
    } finally {
      setIsRefreshingAlerts(false);
    }
  }

  async function markAllRead() {
    if (!user?.$id) return;

    setBulkLoading('all-read');
    try {
      await markAllNotificationsRead(user.$id);
      setNotifications(await listNotifications(user.$id));
      setSelectedIds([]);
      showFeedback('All notifications marked as read.');
    } catch (error) {
      showFeedback(error.message || 'Could not update notifications.', 'danger');
    } finally {
      setBulkLoading('');
    }
  }

  async function toggleRead(notification) {
    if (!user?.$id) return;

    setActionLoading(notification.id);
    try {
      const updated = notification.status === 'Unread'
        ? await markNotificationRead(user.$id, notification.id)
        : await markNotificationUnread(user.$id, notification.id);
      setNotifications((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch (error) {
      showFeedback(error.message || 'Could not update notification.', 'danger');
    } finally {
      setActionLoading('');
    }
  }

  async function archiveOne(id) {
    if (!user?.$id) return;

    setActionLoading(id);
    try {
      const updated = await archiveNotificationService(user.$id, id);
      setNotifications((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setSelectedIds((current) => current.filter((selectedId) => selectedId !== id));
      showFeedback('Notification archived.');
    } catch (error) {
      showFeedback(error.message || 'Could not archive notification.', 'danger');
    } finally {
      setActionLoading('');
    }
  }

  async function deleteOne(id) {
    if (!user?.$id) return;

    setActionLoading(id);
    try {
      await deleteNotificationService(user.$id, id);
      setNotifications((current) => current.filter((notification) => notification.id !== id));
      setSelectedIds((current) => current.filter((selectedId) => selectedId !== id));
      showFeedback('Notification deleted.');
    } catch (error) {
      showFeedback(error.message || 'Could not delete notification.', 'danger');
    } finally {
      setActionLoading('');
    }
  }

  function toggleSelect(id) {
    setSelectedIds((current) => current.includes(id) ? current.filter((selectedId) => selectedId !== id) : [...current, id]);
  }

  async function bulkMarkRead() {
    if (!user?.$id) return;

    setBulkLoading('bulk-read');
    try {
      await Promise.all(selectedIds.map((id) => markNotificationRead(user.$id, id)));
      setNotifications(await listNotifications(user.$id));
      setSelectedIds([]);
      showFeedback('Selected notifications marked as read.');
    } catch (error) {
      showFeedback(error.message || 'Could not update selected notifications.', 'danger');
    } finally {
      setBulkLoading('');
    }
  }

  async function bulkArchive() {
    if (!user?.$id) return;

    setBulkLoading('bulk-archive');
    try {
      await archiveNotifications(user.$id, selectedIds);
      setNotifications(await listNotifications(user.$id));
      setSelectedIds([]);
      showFeedback('Selected notifications archived.');
    } catch (error) {
      showFeedback(error.message || 'Could not archive selected notifications.', 'danger');
    } finally {
      setBulkLoading('');
    }
  }

  async function bulkDelete() {
    if (!user?.$id) return;

    setBulkLoading('bulk-delete');
    try {
      await deleteNotifications(user.$id, selectedIds);
      setNotifications((current) => current.filter((notification) => !selectedIds.includes(notification.id)));
      setSelectedIds([]);
      showFeedback('Selected notifications deleted.');
    } catch (error) {
      showFeedback(error.message || 'Could not delete selected notifications.', 'danger');
    } finally {
      setBulkLoading('');
    }
  }

  function takeAction(notification) {
    if (notification.routeTarget) {
      navigate(notification.routeTarget);
      return;
    }
    showFeedback('Action opened in demo mode.', 'info');
  }

  function saveSettings() {
    setShowSettings(false);
    showFeedback('Notification preferences saved locally.');
  }

  const summaryCards = [
    {
      title: 'Total Alerts',
      value: String(stats.totalAlerts),
      trend: 'Active in-app alerts',
      icon: Bell,
      status: 'info',
    },
    {
      title: 'Unread',
      value: String(stats.unread),
      trend: stats.unread ? 'Needs owner attention' : 'All caught up',
      icon: BellDot,
      status: stats.unread ? 'warning' : 'success',
    },
    {
      title: 'Critical',
      value: String(stats.critical),
      trend: stats.critical ? 'Start here first' : 'No critical alerts',
      icon: TriangleAlert,
      status: stats.critical ? 'danger' : 'success',
    },
    {
      title: 'Due Today',
      value: String(stats.dueToday),
      trend: 'Created today',
      icon: Clock,
      status: 'neutral',
    },
  ];

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-indigo-500">Alerts Center</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Notifications</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Track stock alerts, payment reminders, invoice updates, and business warnings.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button loading={isRefreshingAlerts} onClick={refreshAlerts} variant="secondary">
            <RefreshCw className="h-4 w-4" />
            Refresh Alerts
          </Button>
          <Button loading={bulkLoading === 'all-read'} onClick={markAllRead}>
            <Check className="h-4 w-4" />
            Mark All Read
          </Button>
          <Button onClick={() => setShowSettings(true)} variant="secondary">
            <Settings className="h-4 w-4" />
            Notification Settings
          </Button>
        </div>
      </section>

      <FeedbackBanner
        message={feedback.message}
        onDismiss={() => setFeedback({ message: '', tone: 'success' })}
        tone={feedback.tone}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => <StatCard key={card.title} {...card} />)}
      </section>

      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white" padding="lg">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.24),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(99,102,241,0.28),transparent_32%)]" />
        <div className="relative grid gap-6 lg:grid-cols-[auto_1fr_auto] lg:items-center">
          <div className="grid h-14 w-14 place-items-center rounded-3xl bg-white/10 text-cyan-200 ring-1 ring-white/15">
            <WandSparkles className="h-7 w-7" />
          </div>
          <div>
            <Badge className="bg-white/10 text-cyan-100 ring-white/20">AI Priority</Badge>
            <h2 className="mt-3 text-2xl font-black tracking-tight">Real-time business priorities</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">{buildPriorityInsight(notifications)}</p>
          </div>
          <Button onClick={() => showFeedback(buildPriorityInsight(notifications), 'info')} variant="secondary">
            <Sparkles className="h-4 w-4" />
            View action plan
          </Button>
        </div>
      </Card>

      <NotificationFilters filters={filters} onChange={handleFilterChange} onClear={clearFilters} />

      <BulkActionBar count={selectedVisibleCount} loading={bulkLoading} onArchive={bulkArchive} onDelete={bulkDelete} onMarkRead={bulkMarkRead} />

      <SectionHeader
        subtitle={`${filteredNotifications.length} alerts shown. Manage read status, archive items, or open linked modules.`}
        title="Business Alerts"
      />

      {isLoading ? (
        <Card className="text-center" padding="lg">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-indigo-500" />
          <p className="mt-4 font-black text-slate-950">Loading notifications...</p>
          <p className="mt-2 text-sm text-slate-500">Reading in-app alerts from Appwrite.</p>
        </Card>
      ) : (
        <NotificationList
          actionLoading={actionLoading}
          notifications={filteredNotifications}
          onArchive={archiveOne}
          onClearFilters={clearFilters}
          onDelete={deleteOne}
          onRefreshAlerts={refreshAlerts}
          onTakeAction={takeAction}
          onToggleRead={toggleRead}
          onToggleSelect={toggleSelect}
          selectedIds={selectedIds}
        />
      )}

      <SectionHeader subtitle="A compact view of what needs attention across the business." title="Notification Insights" />
      <NotificationInsights insights={insights} />

      {!isLoading && !notifications.length ? (
        <Card className="py-12 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-3xl bg-slate-100 text-slate-500">
            <BellOff className="h-7 w-7" />
          </div>
          <h3 className="mt-5 text-lg font-black text-slate-950">No alerts yet</h3>
          <p className="mt-2 text-sm text-slate-500">Refresh alerts to generate in-app notifications from real business data.</p>
          <Button className="mt-5" loading={isRefreshingAlerts} onClick={refreshAlerts}>
            <RefreshCw className="h-4 w-4" />
            Refresh Alerts
          </Button>
        </Card>
      ) : null}

      {showSettings ? (
        <NotificationSettingsModal
          channelState={channelState}
          onClose={() => setShowSettings(false)}
          onSave={saveSettings}
          onToggleChannel={(channel) => setChannelState((current) => ({ ...current, [channel]: !current[channel] }))}
          onTogglePreference={(setting) => setPreferenceState((current) => ({ ...current, [setting]: !current[setting] }))}
          preferenceState={preferenceState}
        />
      ) : null}
    </div>
  );
}
