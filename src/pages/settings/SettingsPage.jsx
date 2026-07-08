import { AnimatePresence, motion } from 'framer-motion';
import {
  ArchiveRestore,
  Bell,
  Bot,
  CheckCircle2,
  Circle,
  Cloud,
  Database,
  Download,
  FileText,
  KeyRound,
  Link as LinkIcon,
  LockKeyhole,
  ReceiptText,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
  Store,
  Trash2,
  UserCog,
  WandSparkles,
  X,
} from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';
import Badge from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import Input from '../../components/common/Input.jsx';
import SectionHeader from '../../components/common/SectionHeader.jsx';
import StatCard from '../../components/common/StatCard.jsx';
import {
  aiPreferences as defaultAiPreferences,
  appSettings as defaultAppSettings,
  integrationSettings,
  notificationPreferences as defaultNotificationPreferences,
  productionChecklist,
  settingsCategories,
} from '../../data/mockData.js';
import {
  getIntegrationStatusBadge,
  getSettingsStatusBadge,
} from '../../utils/formatters.js';
import { getAiParseFunctionId } from '../../services/aiInvoiceService.js';
import { getAiAssistantFunctionId } from '../../services/aiAssistantService.js';

const categoryIcons = {
  Account: UserCog,
  Business: Store,
  Invoice: FileText,
  GST: ReceiptText,
  Notifications: Bell,
  'AI Assistant': Bot,
  Security: ShieldCheck,
  'Data & Backup': Database,
  Integrations: LinkIcon,
  'Danger Zone': Trash2,
};

const selectOptions = {
  language: ['English', 'Hindi', 'Telugu', 'Tamil', 'Kannada'],
  timezone: ['Asia/Kolkata', 'Asia/Dubai', 'UTC'],
  dateFormat: ['DD MMM YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'],
  businessType: ['Retail / Kirana', 'Medical Store', 'Hardware Store', 'Restaurant', 'Wholesaler'],
  currency: ['INR'],
  financialYearStart: ['April', 'January', 'July'],
  defaultTaxMode: ['GST', 'Non-GST'],
  lowStockThresholdMode: ['Product minimum stock', 'Global threshold'],
  defaultPaymentTerms: ['7 days', '15 days', '30 days', 'Due on receipt'],
  gstRegistered: ['Yes', 'No'],
  defaultGstRate: ['0%', '5%', '12%', '18%', '28%'],
  filingFrequency: ['Monthly', 'Quarterly', 'Annual'],
  reportMode: ['Sales + Purchase', 'Sales only', 'Purchase only'],
  aiMode: ['Demo Mode'],
  responseStyle: ['Simple business language', 'Detailed analysis', 'Short action summary'],
  autoLogout: ['15 minutes', '30 minutes', '1 hour'],
  backupFrequency: ['Daily', 'Weekly', 'Monthly'],
};

function cloneDefaults() {
  return {
    settings: structuredClone(defaultAppSettings),
    notifications: structuredClone(defaultNotificationPreferences),
    ai: structuredClone(defaultAiPreferences),
    checklist: structuredClone(productionChecklist),
  };
}

function SelectControl({ label, name, onChange, options, value }) {
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
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function ToggleRow({ checked, description, label, onToggle }) {
  return (
    <button
      className="flex w-full items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-indigo-200 hover:bg-indigo-50/40"
      onClick={onToggle}
      type="button"
    >
      <span>
        <span className="block text-sm font-black text-slate-800">{label}</span>
        {description ? (
          <span className="mt-1 block text-xs font-semibold text-slate-400">
            {description}
          </span>
        ) : null}
      </span>
      <span
        className={clsx(
          'relative h-6 w-11 shrink-0 rounded-full transition',
          checked ? 'bg-indigo-600' : 'bg-slate-200',
        )}
      >
        <span
          className={clsx(
            'absolute top-1 h-4 w-4 rounded-full bg-white shadow transition',
            checked ? 'left-6' : 'left-1',
          )}
        />
      </span>
    </button>
  );
}

function SettingsCategoryNav({ activeCategory, onSelect }) {
  return (
    <Card className="min-w-0 lg:sticky lg:top-24" padding="sm">
      <div className="flex gap-2 overflow-x-auto pb-1 lg:block lg:space-y-2 lg:overflow-visible lg:pb-0">
        {settingsCategories.map((category) => {
          const Icon = categoryIcons[category] || UserCog;
          const isActive = activeCategory === category;

          return (
            <button
              className={clsx(
                'flex min-w-max items-center gap-3 rounded-2xl px-4 py-3 text-sm font-black transition lg:w-full',
                isActive
                  ? 'bg-indigo-600 text-white shadow-soft shadow-indigo-200'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
              )}
              key={category}
              onClick={() => onSelect(category)}
              type="button"
            >
              <Icon className="h-4 w-4" />
              {category}
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function PanelShell({ children, icon: Icon, subtitle, title }) {
  return (
    <Card padding="lg">
      <div className="mb-6 flex items-start gap-4">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-950">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-1 text-sm leading-6 text-slate-500">{subtitle}</p>
          ) : null}
        </div>
      </div>
      {children}
    </Card>
  );
}

function FieldGrid({ children }) {
  return <div className="grid gap-4 md:grid-cols-2">{children}</div>;
}

function SectionSave({ onSave }) {
  return (
    <div className="mt-6 flex justify-end">
      <Button onClick={onSave}>
        <Save className="h-4 w-4" />
        Save section
      </Button>
    </div>
  );
}

function SettingsInput({ label, name, onChange, section, settings, type = 'text' }) {
  return (
    <Input
      label={label}
      name={name}
      onChange={(event) => onChange(section, name, event.target.value)}
      type={type}
      value={settings[section][name]}
    />
  );
}

function SettingsSelect({ label, name, onChange, section, settings }) {
  return (
    <SelectControl
      label={label}
      name={name}
      onChange={(event) => onChange(section, name, event.target.value)}
      options={selectOptions[name]}
      value={settings[section][name]}
    />
  );
}

function AccountPanel({ onChange, onSave, settings }) {
  return (
    <PanelShell
      icon={UserCog}
      subtitle="Owner identity, access language, timezone, and display formats."
      title="Account Settings"
    >
      <FieldGrid>
        <SettingsInput label="Owner Name" name="ownerName" onChange={onChange} section="account" settings={settings} />
        <SettingsInput label="Email" name="email" onChange={onChange} section="account" settings={settings} type="email" />
        <SettingsInput label="Phone" name="phone" onChange={onChange} section="account" settings={settings} />
        <SettingsSelect label="Language" name="language" onChange={onChange} section="account" settings={settings} />
        <SettingsSelect label="Timezone" name="timezone" onChange={onChange} section="account" settings={settings} />
        <SettingsSelect label="Date Format" name="dateFormat" onChange={onChange} section="account" settings={settings} />
      </FieldGrid>
      <SectionSave onSave={onSave} />
    </PanelShell>
  );
}

function BusinessPanel({ onChange, onSave, onToggle, settings }) {
  return (
    <PanelShell
      icon={Store}
      subtitle="Business defaults that shape reports, dashboards, and stock warnings."
      title="Business Settings"
    >
      <FieldGrid>
        <SettingsInput label="Business Name" name="businessName" onChange={onChange} section="business" settings={settings} />
        <SettingsSelect label="Business Type" name="businessType" onChange={onChange} section="business" settings={settings} />
        <SettingsSelect label="Currency" name="currency" onChange={onChange} section="business" settings={settings} />
        <SettingsSelect label="Financial Year Start" name="financialYearStart" onChange={onChange} section="business" settings={settings} />
        <SettingsSelect label="Default Tax Mode" name="defaultTaxMode" onChange={onChange} section="business" settings={settings} />
        <SettingsSelect label="Low Stock Alert Threshold Mode" name="lowStockThresholdMode" onChange={onChange} section="business" settings={settings} />
      </FieldGrid>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <ToggleRow
          checked={settings.business.enableBusinessHealth}
          label="Enable business health scoring"
          onToggle={() => onToggle('business', 'enableBusinessHealth')}
        />
        <ToggleRow
          checked={settings.business.showProfitMetrics}
          label="Show profit metrics on dashboard"
          onToggle={() => onToggle('business', 'showProfitMetrics')}
        />
      </div>
      <SectionSave onSave={onSave} />
    </PanelShell>
  );
}

function InvoicePanel({ onChange, onSave, onToggle, settings }) {
  return (
    <PanelShell
      icon={FileText}
      subtitle="Configure invoice numbering, GST display, logo visibility, and footer text."
      title="Invoice Settings"
    >
      <FieldGrid>
        <SettingsInput label="Invoice Prefix" name="invoicePrefix" onChange={onChange} section="invoice" settings={settings} />
        <SettingsInput label="Purchase Invoice Prefix" name="purchaseInvoicePrefix" onChange={onChange} section="invoice" settings={settings} />
        <SettingsSelect label="Default Payment Terms" name="defaultPaymentTerms" onChange={onChange} section="invoice" settings={settings} />
        <SettingsInput label="Invoice Footer Text" name="footerText" onChange={onChange} section="invoice" settings={settings} />
      </FieldGrid>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <ToggleRow checked={settings.invoice.showGst} label="Show GST on invoices" onToggle={() => onToggle('invoice', 'showGst')} />
        <ToggleRow checked={settings.invoice.showBusinessLogo} label="Show business logo" onToggle={() => onToggle('invoice', 'showBusinessLogo')} />
      </div>
      <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-black text-slate-950">
              {settings.business.businessName || 'Your Business'}
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              {settings.invoice.invoicePrefix}-1001
            </p>
          </div>
          <Badge variant={settings.invoice.showGst ? 'success' : 'neutral'}>
            GST {settings.invoice.showGst ? 'enabled' : 'hidden'}
          </Badge>
        </div>
        <p className="mt-4 text-sm text-slate-500">
          Logo {settings.invoice.showBusinessLogo ? 'enabled' : 'hidden'} · Footer:
          {' '}{settings.invoice.footerText}
        </p>
      </div>
      <SectionSave onSave={onSave} />
    </PanelShell>
  );
}

function GstPanel({ onChange, onSave, onToggle, settings }) {
  return (
    <PanelShell
      icon={ReceiptText}
      subtitle="GST reporting defaults for sales, purchase invoices, and tax summaries."
      title="GST Settings"
    >
      <FieldGrid>
        <SettingsSelect label="GST Registered" name="gstRegistered" onChange={onChange} section="gst" settings={settings} />
        <SettingsInput label="GSTIN" name="gstin" onChange={onChange} section="gst" settings={settings} />
        <SettingsSelect label="Default GST Rate" name="defaultGstRate" onChange={onChange} section="gst" settings={settings} />
        <SettingsSelect label="GST Filing Frequency" name="filingFrequency" onChange={onChange} section="gst" settings={settings} />
        <SettingsSelect label="GST Report Mode" name="reportMode" onChange={onChange} section="gst" settings={settings} />
      </FieldGrid>
      <div className="mt-5">
        <ToggleRow
          checked={settings.gst.includeZeroGstItems}
          label="Include zero-GST items"
          onToggle={() => onToggle('gst', 'includeZeroGstItems')}
        />
      </div>
      <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-800">
        GST reports are currently simulated. Real GST summaries will be generated
        from sales and invoice data after backend integration.
      </div>
      <SectionSave onSave={onSave} />
    </PanelShell>
  );
}

function NotificationPanel({ onSave, onToggle, preferences }) {
  const labels = {
    lowStockAlerts: 'Low stock alerts',
    customerPaymentReminders: 'Customer payment reminders',
    supplierPaymentReminders: 'Supplier payment reminders',
    invoiceProcessingUpdates: 'Invoice processing updates',
    businessHealthWarnings: 'Business health warnings',
    gstReminders: 'GST reminders',
    salesDropAlerts: 'Sales drop alerts',
    aiRecommendationAlerts: 'AI recommendation alerts',
  };

  return (
    <PanelShell
      icon={Bell}
      subtitle="Choose which in-app alerts appear while real delivery channels are planned."
      title="Notification Settings"
    >
      <div className="grid gap-3 md:grid-cols-2">
        {Object.entries(labels).map(([key, label]) => (
          <ToggleRow
            checked={preferences[key]}
            key={key}
            label={label}
            onToggle={() => onToggle(key)}
          />
        ))}
      </div>
      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <ToggleRow checked={preferences.inApp} label="In-app enabled" onToggle={() => onToggle('inApp')} />
        <ToggleRow checked={preferences.emailLater} label="Email later" onToggle={() => onToggle('emailLater')} />
        <ToggleRow checked={preferences.whatsappLater} label="WhatsApp later" onToggle={() => onToggle('whatsappLater')} />
      </div>
      <SectionSave onSave={onSave} />
    </PanelShell>
  );
}

function AiPanel({ ai, onChange, onSave, onToggle }) {
  const labels = {
    businessContextAccess: 'Business Context Access',
    includeSalesData: 'Include sales data',
    includeInventoryData: 'Include inventory data',
    includeCustomerDues: 'Include customer dues',
    includeSupplierDues: 'Include supplier dues',
    includeGstSummaries: 'Include GST summaries',
    saveAiChatHistory: 'Save AI chat history',
  };

  return (
    <PanelShell
      icon={Bot}
      subtitle="Control assistant behavior and which business context it can use."
      title="AI Assistant Settings"
    >
      <FieldGrid>
        <SelectControl label="AI Mode" name="aiMode" onChange={(event) => onChange('aiMode', event.target.value)} options={selectOptions.aiMode} value={ai.aiMode} />
        <SelectControl label="Response Style" name="responseStyle" onChange={(event) => onChange('responseStyle', event.target.value)} options={selectOptions.responseStyle} value={ai.responseStyle} />
      </FieldGrid>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {Object.entries(labels).map(([key, label]) => (
          <ToggleRow checked={ai[key]} key={key} label={label} onToggle={() => onToggle(key)} />
        ))}
      </div>
      <div className="mt-5 rounded-2xl bg-cyan-50 p-4 text-sm leading-6 text-cyan-800">
        AI requests run through secure Appwrite Functions. Provider keys must
        never be exposed in the frontend.
      </div>
      <SectionSave onSave={onSave} />
    </PanelShell>
  );
}

function SecurityPanel({ onAction, onChange, onSave, settings }) {
  return (
    <PanelShell
      icon={ShieldCheck}
      subtitle="Review account security controls connected to your Appwrite session."
      title="Security Settings"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Card padding="sm"><p className="text-sm font-semibold text-slate-500">Password</p><p className="mt-1 font-black text-slate-950">{settings.security.password}</p></Card>
        <Card padding="sm"><p className="text-sm font-semibold text-slate-500">Two-factor authentication</p><p className="mt-1 font-black text-slate-950">{settings.security.twoFactor}</p></Card>
        <Card padding="sm"><p className="text-sm font-semibold text-slate-500">Active sessions</p><p className="mt-1 font-black text-slate-950">{settings.security.activeSessions}</p></Card>
        <Card padding="sm"><p className="text-sm font-semibold text-slate-500">Last login</p><p className="mt-1 font-black text-slate-950">{settings.security.lastLogin}</p></Card>
      </div>
      <div className="mt-5 max-w-sm">
        <SettingsSelect label="Auto logout" name="autoLogout" onChange={onChange} section="security" settings={settings} />
      </div>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button onClick={() => onAction('Change password opened in demo mode.')} variant="secondary"><KeyRound className="h-4 w-4" />Change Password</Button>
        <Button onClick={() => onAction('2FA setup simulated locally.')} variant="secondary"><LockKeyhole className="h-4 w-4" />Enable 2FA</Button>
        <Button onClick={() => onAction('Log out all devices simulated.')} variant="ghost">Log out all devices</Button>
      </div>
      <SectionSave onSave={onSave} />
    </PanelShell>
  );
}

function DataBackupPanel({ onAction, onChange, onSave, onToggle, settings }) {
  return (
    <PanelShell
      icon={Database}
      subtitle="Data export and backup controls are simulated until backend storage is added."
      title="Data & Backup"
    >
      <div className="grid gap-3 md:grid-cols-2">
        {['Export business data', 'Export inventory data', 'Export sales data', 'Export invoice data'].map((item) => (
          <Card key={item} padding="sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-black text-slate-800">{item}</p>
              <Download className="h-4 w-4 text-indigo-500" />
            </div>
          </Card>
        ))}
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <SettingsSelect label="Backup frequency" name="backupFrequency" onChange={onChange} section="dataBackup" settings={settings} />
        <ToggleRow checked={settings.dataBackup.autoBackup} label="Auto backup" description="Disabled until backend" onToggle={() => onToggle('dataBackup', 'autoBackup')} />
      </div>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button onClick={() => onAction('Data export simulated.')} variant="secondary"><Download className="h-4 w-4" />Export Data</Button>
        <Button onClick={() => onAction('Backup simulation completed.')} variant="secondary"><Cloud className="h-4 w-4" />Create Backup</Button>
        <Button onClick={() => onAction('Restore backup opened in demo mode.')} variant="ghost"><ArchiveRestore className="h-4 w-4" />Restore Backup</Button>
      </div>
      <SectionSave onSave={onSave} />
    </PanelShell>
  );
}

function IntegrationsPanel({ onAction }) {
  const invoiceAiFunctionConfigured = Boolean(getAiParseFunctionId());
  const assistantAiFunctionConfigured = Boolean(getAiAssistantFunctionId());
  const integrations = integrationSettings.map((integration) =>
    integration.name === 'GPT-5 Nano'
      ? {
          ...integration,
          status: assistantAiFunctionConfigured ? 'Configured' : invoiceAiFunctionConfigured ? 'Demo Mode' : 'Not Configured',
          description: assistantAiFunctionConfigured
            ? 'AI Assistant is routed through a secure Appwrite Function. OpenRouter keys stay server-side.'
            : invoiceAiFunctionConfigured
              ? 'Invoice AI parsing is configured. AI Assistant function is still pending.'
            : integration.description,
        }
      : integration,
  );

  return (
    <PanelShell
      icon={LinkIcon}
      subtitle="Future production services that will power auth, storage, OCR, AI, and messaging."
      title="Integrations"
    >
      <div className="grid gap-4 md:grid-cols-2">
        {integrations.map((integration) => (
          <Card hover key={integration.name}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-black text-slate-950">{integration.name}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">{integration.description}</p>
              </div>
              <Badge variant={getIntegrationStatusBadge(integration.status)}>
                {integration.status}
              </Badge>
            </div>
            <Button className="mt-5" onClick={() => onAction(`${integration.name} ${integration.action.toLowerCase()} opened in demo mode.`)} size="sm" variant="secondary">
              {integration.action}
            </Button>
          </Card>
        ))}
      </div>
    </PanelShell>
  );
}

function DangerZonePanel({ onDanger }) {
  return (
    <PanelShell
      icon={Trash2}
      subtitle="Destructive controls are confirmations only. No real data is changed."
      title="Danger Zone"
    >
      <Card className="border-rose-200 bg-rose-50/70">
        <div className="space-y-4">
          {[
            ['Reset demo data', 'Demo data reset simulated.'],
            ['Clear local chat history', 'AI chat history cleared locally.'],
            ['Delete workspace', 'Workspace deletion blocked in demo mode.'],
          ].map(([label, message]) => (
            <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 sm:flex-row sm:items-center sm:justify-between" key={label}>
              <div>
                <p className="font-black text-slate-950">{label}</p>
                <p className="mt-1 text-sm text-slate-500">Requires confirmation in this local demo.</p>
              </div>
              <Button onClick={() => onDanger(label, message)} variant="danger">
                {label}
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </PanelShell>
  );
}

function ProductionChecklist({ checklist, onToggle }) {
  const completed = checklist.filter((item) => item.completed).length;

  return (
    <Card id="production-checklist" padding="lg">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-950">Production Setup Checklist</h2>
          <p className="mt-1 text-sm text-slate-500">
            {completed} of {checklist.length} completed
          </p>
        </div>
        <Badge variant={completed ? 'info' : 'neutral'}>{completed}/{checklist.length}</Badge>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {checklist.map((item) => (
          <button
            className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 text-left transition hover:bg-indigo-50"
            key={item.id}
            onClick={() => onToggle(item.id)}
            type="button"
          >
            {item.completed ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            ) : (
              <Circle className="h-5 w-5 text-slate-300" />
            )}
            <span className="text-sm font-bold text-slate-700">{item.label}</span>
          </button>
        ))}
      </div>
    </Card>
  );
}

function ConfirmModal({ confirmLabel = 'Confirm', message, onClose, onConfirm, title, variant = 'danger' }) {
  return (
    <AnimatePresence>
      <motion.div
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-3 backdrop-blur-sm sm:items-center"
        exit={{ opacity: 0 }}
        initial={{ opacity: 0 }}
      >
        <button aria-label="Close modal" className="absolute inset-0" onClick={onClose} type="button" />
        <motion.div
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="relative z-10 w-full max-w-lg"
          exit={{ opacity: 0, y: 18, scale: 0.98 }}
          initial={{ opacity: 0, y: 28, scale: 0.98 }}
          transition={{ duration: 0.2 }}
        >
          <Card padding="lg">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Badge variant={variant === 'danger' ? 'danger' : 'warning'}>Confirmation</Badge>
                <h2 className="mt-3 text-2xl font-black text-slate-950">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">{message}</p>
              </div>
              <button className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-500" onClick={onClose} type="button">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button onClick={onClose} variant="secondary">Cancel</Button>
              <Button onClick={onConfirm} variant={variant}>{confirmLabel}</Button>
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function SettingsPage() {
  const defaults = cloneDefaults();
  const [activeCategory, setActiveCategory] = useState('Account');
  const [settings, setSettings] = useState(defaults.settings);
  const [notifications, setNotifications] = useState(defaults.notifications);
  const [ai, setAi] = useState(defaults.ai);
  const [checklist, setChecklist] = useState(defaults.checklist);
  const [successMessage, setSuccessMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState(null);

  const showSuccess = (message) => {
    setSuccessMessage(message);
    window.setTimeout(() => setSuccessMessage(''), 2600);
  };

  const saveSettings = () => showSuccess('Settings saved locally.');

  const updateSetting = (section, key, value) => {
    setSettings((current) => ({
      ...current,
      [section]: { ...current[section], [key]: value },
    }));
  };

  const toggleSetting = (section, key) => {
    setSettings((current) => ({
      ...current,
      [section]: { ...current[section], [key]: !current[section][key] },
    }));
  };

  const resetSettings = () => {
    const nextDefaults = cloneDefaults();
    setSettings(nextDefaults.settings);
    setNotifications(nextDefaults.notifications);
    setAi(nextDefaults.ai);
    setChecklist(nextDefaults.checklist);
    setConfirmAction(null);
    showSuccess('Demo settings restored.');
  };

  const renderPanel = () => {
    const shared = { onSave: saveSettings, settings };

    if (activeCategory === 'Account') return <AccountPanel onChange={updateSetting} {...shared} />;
    if (activeCategory === 'Business') return <BusinessPanel onChange={updateSetting} onToggle={toggleSetting} {...shared} />;
    if (activeCategory === 'Invoice') return <InvoicePanel onChange={updateSetting} onToggle={toggleSetting} {...shared} />;
    if (activeCategory === 'GST') return <GstPanel onChange={updateSetting} onToggle={toggleSetting} {...shared} />;
    if (activeCategory === 'Notifications') {
      return (
        <NotificationPanel
          onSave={saveSettings}
          onToggle={(key) => setNotifications((current) => ({ ...current, [key]: !current[key] }))}
          preferences={notifications}
        />
      );
    }
    if (activeCategory === 'AI Assistant') {
      return (
        <AiPanel
          ai={ai}
          onChange={(key, value) => setAi((current) => ({ ...current, [key]: value }))}
          onSave={saveSettings}
          onToggle={(key) => setAi((current) => ({ ...current, [key]: !current[key] }))}
        />
      );
    }
    if (activeCategory === 'Security') return <SecurityPanel onAction={showSuccess} onChange={updateSetting} {...shared} />;
    if (activeCategory === 'Data & Backup') return <DataBackupPanel onAction={showSuccess} onChange={updateSetting} onToggle={toggleSetting} {...shared} />;
    if (activeCategory === 'Integrations') return <IntegrationsPanel onAction={showSuccess} />;
    return (
      <DangerZonePanel
        onDanger={(label, message) =>
          setConfirmAction({
            title: label,
            message: label === 'Delete workspace'
              ? 'This is a strong warning only. No workspace will be deleted in demo mode.'
              : 'This action is simulated locally and will not affect backend data.',
            confirmLabel: label,
            onConfirm: () => {
              setConfirmAction(null);
              showSuccess(message);
            },
          })
        }
      />
    );
  };

  const overviewCards = [
    { title: 'Account', value: 'Active', trend: 'Owner profile ready', status: getSettingsStatusBadge('Active'), icon: UserCog },
    { title: 'Notifications', value: 'Enabled', trend: 'In-app alerts active', status: getSettingsStatusBadge('Enabled'), icon: Bell },
    { title: 'AI Assistant', value: getAiAssistantFunctionId() ? 'Configured' : 'Not Configured', trend: 'Secure function backend', status: getSettingsStatusBadge(getAiAssistantFunctionId() ? 'Enabled' : 'Warning'), icon: Bot },
    { title: 'Security', value: 'Standard', trend: '2FA pending later', status: getSettingsStatusBadge('Standard'), icon: ShieldCheck },
  ];

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-indigo-500">
            App Configuration
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
            Settings
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Configure your account, business preferences, invoices, notifications,
            AI assistant, and security.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button onClick={saveSettings}><Save className="h-4 w-4" />Save Changes</Button>
          <Button
            onClick={() =>
              setConfirmAction({
                title: 'Reset settings to demo defaults?',
                message: 'This will restore local demo settings only. No backend data will be changed.',
                confirmLabel: 'Reset Settings',
                onConfirm: resetSettings,
              })
            }
            variant="secondary"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
        </div>
      </section>

      <AnimatePresence>
        {successMessage ? (
          <motion.div animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} initial={{ opacity: 0, y: -8 }}>
            <Card className="border-emerald-100 bg-emerald-50/90" padding="sm">
              <div className="flex items-center gap-3 text-sm font-bold text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                {successMessage}
              </div>
            </Card>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {overviewCards.map((card) => (
          <StatCard icon={card.icon} key={card.title} status={card.status} title={card.title} trend={card.trend} value={card.value} />
        ))}
      </section>

      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white" padding="lg">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.24),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(99,102,241,0.28),transparent_32%)]" />
        <div className="relative grid gap-5 lg:grid-cols-[auto_1fr_auto] lg:items-center">
          <div className="grid h-14 w-14 place-items-center rounded-3xl bg-white/10 text-cyan-200 ring-1 ring-white/15">
            <WandSparkles className="h-7 w-7" />
          </div>
          <div>
            <Badge className="bg-white/10 text-cyan-100 ring-white/20">AI Setup Insight</Badge>
            <p className="mt-3 max-w-3xl text-lg font-bold leading-7 text-white">
              Appwrite auth and data modules are connected. External delivery,
              exports, payments, and destructive actions remain protected until production setup is complete.
            </p>
          </div>
          <Button
            onClick={() => {
              document.getElementById('production-checklist')?.scrollIntoView({ behavior: 'smooth' });
              showSuccess('Production setup checklist highlighted.');
            }}
            variant="secondary"
          >
            <Sparkles className="h-4 w-4" />
            View setup checklist
          </Button>
        </div>
      </Card>

      <section className="grid min-w-0 gap-6 lg:grid-cols-[18rem_1fr] lg:items-start">
        <SettingsCategoryNav activeCategory={activeCategory} onSelect={setActiveCategory} />
        <AnimatePresence mode="wait">
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="min-w-0"
            exit={{ opacity: 0, y: 8 }}
            initial={{ opacity: 0, y: 8 }}
            key={activeCategory}
            transition={{ duration: 0.18 }}
          >
            {renderPanel()}
          </motion.div>
        </AnimatePresence>
      </section>

      <ProductionChecklist
        checklist={checklist}
        onToggle={(id) =>
          setChecklist((current) =>
            current.map((item) =>
              item.id === id ? { ...item, completed: !item.completed } : item,
            ),
          )
        }
      />

      <SectionHeader
        subtitle="Backend modules are being connected in phases. High-risk actions stay disabled until production setup is complete."
        title="Production Safety"
      />
      <Card className="border-cyan-100 bg-cyan-50/80" padding="sm">
        <p className="text-sm font-semibold leading-6 text-cyan-800">
          Authentication and core Appwrite data are active. Notification delivery,
          exports, backups, payments, and destructive workspace actions are still guarded.
        </p>
      </Card>

      {confirmAction ? (
        <ConfirmModal
          confirmLabel={confirmAction.confirmLabel}
          message={confirmAction.message}
          onClose={() => setConfirmAction(null)}
          onConfirm={confirmAction.onConfirm}
          title={confirmAction.title}
        />
      ) : null}
    </div>
  );
}
