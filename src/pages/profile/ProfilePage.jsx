import { AnimatePresence, motion } from 'framer-motion';
import {
  BadgeCheck,
  Building2,
  CalendarDays,
  Camera,
  CheckCircle2,
  Circle,
  CircleGauge,
  CreditCard,
  Download,
  FileText,
  Image,
  KeyRound,
  Languages,
  LockKeyhole,
  Mail,
  MapPin,
  Monitor,
  Palette,
  Phone,
  ReceiptText,
  Save,
  ShieldCheck,
  Sparkles,
  Store,
  Upload,
  UserRound,
  WandSparkles,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import Badge from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import Input from '../../components/common/Input.jsx';
import SectionHeader from '../../components/common/SectionHeader.jsx';
import StatCard from '../../components/common/StatCard.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  accountPlan as mockAccountPlan,
  addressProfile,
  businessDetailsProfile,
  businessProfile,
  gstProfile,
  profileActivity,
  profileChecklist,
  userProfile,
} from '../../data/mockData.js';
import {
  formatDate,
  formatPhone,
  getAccountStatusBadge,
  getGstStatusBadge,
  getProfileCompletionStatus,
} from '../../utils/formatters.js';
import { isValidEmail, isValidIndianPhone } from '../../utils/validators.js';

const businessTypeOptions = [
  'Retail / Kirana',
  'Medical Store',
  'Hardware Store',
  'Clothing Shop',
  'Restaurant',
  'Wholesaler',
  'Manufacturer',
  'Service Business',
];

const languageOptions = ['English', 'Hindi', 'Telugu', 'Tamil', 'Kannada'];
const filingOptions = ['Monthly', 'Quarterly', 'Annual'];
const gstRegisteredOptions = ['Yes', 'No'];

const editFields = {
  owner: {
    title: 'Edit Owner Details',
    required: ['ownerName', 'phone', 'languagePreference'],
    fields: [
      { name: 'ownerName', label: 'Owner name' },
      { name: 'phone', label: 'Phone' },
      {
        name: 'languagePreference',
        label: 'Language preference',
        type: 'select',
        options: languageOptions,
      },
    ],
  },
  business: {
    title: 'Edit Business Details',
    required: [
      'businessName',
      'businessType',
      'industry',
      'businessSize',
      'employees',
      'establishedYear',
    ],
    fields: [
      { name: 'businessName', label: 'Business name' },
      {
        name: 'businessType',
        label: 'Business type',
        type: 'select',
        options: businessTypeOptions,
      },
      { name: 'industry', label: 'Industry' },
      { name: 'businessSize', label: 'Business size' },
      { name: 'employees', label: 'Employees', type: 'number' },
      { name: 'establishedYear', label: 'Established year', type: 'number' },
    ],
  },
  address: {
    title: 'Edit Address',
    required: ['address', 'city', 'state', 'pinCode', 'businessPhone', 'supportEmail'],
    fields: [
      { name: 'address', label: 'Address' },
      { name: 'city', label: 'City' },
      { name: 'state', label: 'State' },
      { name: 'pinCode', label: 'PIN code' },
      { name: 'businessPhone', label: 'Business phone' },
      { name: 'supportEmail', label: 'Support email', type: 'email' },
    ],
  },
  gst: {
    title: 'Edit GST Details',
    required: ['gstRegistered', 'gstin', 'pan', 'filingFrequency'],
    fields: [
      {
        name: 'gstRegistered',
        label: 'GST registered',
        type: 'select',
        options: gstRegisteredOptions,
      },
      { name: 'gstin', label: 'GSTIN' },
      { name: 'pan', label: 'PAN' },
      {
        name: 'filingFrequency',
        label: 'Filing frequency',
        type: 'select',
        options: filingOptions,
      },
    ],
  },
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

function ProgressBar({ tone = 'indigo', value }) {
  const toneClasses = {
    indigo: 'from-indigo-600 to-cyan-400',
    emerald: 'from-emerald-500 to-cyan-400',
    amber: 'from-amber-500 to-orange-400',
  };

  return (
    <div className="h-2 rounded-full bg-slate-100">
      <div
        className={clsx('h-2 rounded-full bg-gradient-to-r', toneClasses[tone])}
        style={{ width: `${Math.min(100, Number(value))}%` }}
      />
    </div>
  );
}

function DetailItem({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
        {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
        {label}
      </div>
      <div className="mt-2 text-sm font-bold leading-6 text-slate-800">
        {value}
      </div>
    </div>
  );
}

function DetailCard({ actionLabel = 'Edit', children, icon: Icon, onEdit, title }) {
  return (
    <Card hover>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
            <Icon className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-black text-slate-950">{title}</h2>
        </div>
        {onEdit ? (
          <Button onClick={onEdit} size="sm" variant="secondary">
            {actionLabel}
          </Button>
        ) : null}
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">{children}</div>
    </Card>
  );
}

function LogoMark({ logoPreview, size = 'lg' }) {
  const sizeClass = size === 'lg' ? 'h-24 w-24 text-3xl' : 'h-16 w-16 text-xl';

  return (
    <div
      className={clsx(
        'grid shrink-0 place-items-center overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 to-cyan-400 font-black text-white shadow-soft',
        sizeClass,
      )}
    >
      {logoPreview ? (
        <img alt="Business logo preview" className="h-full w-full object-cover" src={logoPreview} />
      ) : (
        'AK'
      )}
    </div>
  );
}

function ProfileHero({ logoPreview, onLogoChange, profile }) {
  return (
    <Card className="overflow-hidden" padding="lg" variant="glass">
      <div className="grid gap-6 xl:grid-cols-[auto_1fr_auto] xl:items-center">
        <div className="flex justify-center">
          <div className="relative">
            <LogoMark logoPreview={logoPreview} />
            <label
              className="absolute -bottom-2 -right-2 grid h-10 w-10 cursor-pointer place-items-center rounded-full bg-white text-indigo-600 shadow-soft ring-1 ring-slate-200 transition hover:bg-indigo-50"
              htmlFor="profile-logo-upload"
            >
              <Camera className="h-4 w-4" />
              <input
                accept="image/*"
                className="sr-only"
                id="profile-logo-upload"
                onChange={onLogoChange}
                type="file"
              />
            </label>
          </div>
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="success">
              <BadgeCheck className="mr-1 h-3.5 w-3.5" />
              Verified
            </Badge>
            <Badge variant={getAccountStatusBadge(profile.accountStatus)}>
              {profile.accountStatus}
            </Badge>
          </div>
          <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            {profile.businessName}
          </h2>
          <div className="mt-4 grid gap-3 text-sm font-semibold text-slate-600 sm:grid-cols-3">
            <span className="inline-flex items-center gap-2">
              <UserRound className="h-4 w-4 text-indigo-500" />
              {profile.ownerName}
            </span>
            <span className="inline-flex items-center gap-2">
              <Store className="h-4 w-4 text-indigo-500" />
              {profile.businessType}
            </span>
            <span className="inline-flex items-center gap-2">
              <MapPin className="h-4 w-4 text-indigo-500" />
              {profile.location}
            </span>
          </div>
        </div>
        <div className="rounded-3xl bg-white/80 p-5 ring-1 ring-slate-200/80">
          <div className="flex items-center justify-between gap-5">
            <div>
              <p className="text-sm font-semibold text-slate-500">
                Profile completion
              </p>
              <p className="mt-1 text-3xl font-black text-slate-950">
                {profile.profileCompletion}%
              </p>
            </div>
            <CircleGauge className="h-10 w-10 text-indigo-500" />
          </div>
          <div className="mt-4">
            <ProgressBar value={profile.profileCompletion} />
          </div>
          <p className="mt-3 text-xs font-semibold text-slate-400">
            Upload logo and bank details later to reach 100%.
          </p>
        </div>
      </div>
    </Card>
  );
}

function AiInsightCard({ onImprove }) {
  return (
    <Card
      className="relative overflow-hidden border-0 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white"
      padding="lg"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.24),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(99,102,241,0.28),transparent_32%)]" />
      <div className="relative grid gap-5 lg:grid-cols-[auto_1fr_auto] lg:items-center">
        <div className="grid h-14 w-14 place-items-center rounded-3xl bg-white/10 text-cyan-200 ring-1 ring-white/15">
          <WandSparkles className="h-7 w-7" />
        </div>
        <div>
          <Badge className="bg-white/10 text-cyan-100 ring-white/20">
            AI Profile Insight
          </Badge>
          <p className="mt-3 max-w-3xl text-lg font-bold leading-7 text-white">
            Your profile is 82% complete. Add business logo and bank details later
            to improve trust and enable invoice branding.
          </p>
        </div>
        <Button onClick={onImprove} variant="secondary">
          <Sparkles className="h-4 w-4" />
          Improve profile
        </Button>
      </div>
    </Card>
  );
}

function BrandingCard({ logoPreview, onLogoChange }) {
  return (
    <Card hover>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-cyan-50 text-cyan-600">
            <Image className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-950">Business Branding</h2>
            <p className="mt-1 text-sm text-slate-500">
              Preview how your brand appears on invoices.
            </p>
          </div>
        </div>
      </div>
      <div className="mt-6 grid gap-5 lg:grid-cols-[auto_1fr]">
        <div>
          <LogoMark logoPreview={logoPreview} size="sm" />
          <label
            className="mt-4 inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50"
            htmlFor="branding-logo-upload"
          >
            <Upload className="h-4 w-4" />
            Upload logo
            <input
              accept="image/*"
              className="sr-only"
              id="branding-logo-upload"
              onChange={onLogoChange}
              type="file"
            />
          </label>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
            <LogoMark logoPreview={logoPreview} size="sm" />
            <div>
              <p className="font-black text-slate-950">Ahmed Kirana Store</p>
              <p className="text-sm text-slate-500">Invoice header preview</p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <Palette className="h-5 w-5 text-indigo-500" />
            <div className="flex gap-2">
              <span className="h-6 w-6 rounded-full bg-indigo-600" />
              <span className="h-6 w-6 rounded-full bg-cyan-400" />
              <span className="h-6 w-6 rounded-full bg-emerald-400" />
            </div>
          </div>
          {!logoPreview ? (
            <div className="mt-5 rounded-2xl bg-white p-4">
              <p className="font-black text-slate-950">No logo uploaded yet</p>
              <p className="mt-1 text-sm text-slate-500">
                Upload a business logo to personalize invoices.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

function AccountPlanCard({ accountPlan, onAction }) {
  const storagePercent = (accountPlan.storageUsedMb / accountPlan.storageLimitMb) * 100;
  const aiPercent = (accountPlan.aiUsage / accountPlan.aiLimit) * 100;

  return (
    <Card hover>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
            <CreditCard className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-black text-slate-950">Account & Plan</h2>
        </div>
        <Badge variant="info">{accountPlan.plan}</Badge>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <DetailItem label="Billing" value={accountPlan.billing} />
        <DetailItem label="Account Type" value={accountPlan.accountType} />
        <DetailItem label="Workspace ID" value={accountPlan.workspaceId} />
        <DetailItem label="Plan" value={accountPlan.plan} />
      </div>
      <div className="mt-5 space-y-4">
        <div>
          <div className="flex justify-between text-sm font-bold text-slate-600">
            <span>Storage Used</span>
            <span>{accountPlan.storageUsedMb} MB / 1 GB</span>
          </div>
          <div className="mt-2">
            <ProgressBar tone="emerald" value={storagePercent} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-sm font-bold text-slate-600">
            <span>AI Usage</span>
            <span>{accountPlan.aiUsage} / {accountPlan.aiLimit} demo actions</span>
          </div>
          <div className="mt-2">
            <ProgressBar value={aiPercent} />
          </div>
        </div>
      </div>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button onClick={() => onAction('Manage Plan opened in demo mode.')} variant="secondary">
          Manage Plan
        </Button>
        <Button onClick={() => onAction('Usage details opened in demo mode.')} variant="ghost">
          View Usage
        </Button>
      </div>
    </Card>
  );
}

function SecuritySnapshotCard({ onAction }) {
  return (
    <Card hover>
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-600">
          <LockKeyhole className="h-5 w-5" />
        </div>
        <h2 className="text-lg font-black text-slate-950">Security Snapshot</h2>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <DetailItem icon={KeyRound} label="Password" value="Updated recently" />
        <DetailItem label="Two-factor authentication" value="Not enabled" />
        <DetailItem icon={Monitor} label="Active sessions" value="1 device" />
        <DetailItem icon={CalendarDays} label="Last login" value="Today" />
      </div>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button onClick={() => onAction('Change password opened in demo mode.')} variant="secondary">
          Change Password
        </Button>
        <Button onClick={() => onAction('2FA setup simulated locally.')} variant="ghost">
          Enable 2FA
        </Button>
      </div>
    </Card>
  );
}

function ProfileChecklist({ items, onToggle }) {
  const completedCount = items.filter((item) => item.completed).length;

  return (
    <Card hover>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-950">
            Profile Completion Checklist
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {completedCount} of {items.length} completed
          </p>
        </div>
        <Badge variant={completedCount === items.length ? 'success' : 'warning'}>
          {completedCount}/{items.length}
        </Badge>
      </div>
      <div className="mt-5 space-y-3">
        {items.map((item) => (
          <button
            className="flex w-full items-center gap-3 rounded-2xl bg-slate-50 p-3 text-left transition hover:bg-indigo-50"
            key={item.id}
            onClick={() => onToggle(item.id)}
            type="button"
          >
            {item.completed ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            ) : (
              <Circle className="h-5 w-5 text-slate-300" />
            )}
            <span
              className={clsx(
                'text-sm font-bold',
                item.completed ? 'text-slate-800' : 'text-slate-500',
              )}
            >
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </Card>
  );
}

function ProfileActivity() {
  return (
    <Card hover>
      <h2 className="text-lg font-black text-slate-950">Recent Profile Activity</h2>
      <div className="mt-5 space-y-4">
        {profileActivity.map((activity, index) => (
          <div className="flex gap-3" key={activity.id}>
            <div className="flex flex-col items-center">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-indigo-50 text-xs font-black text-indigo-600">
                {index + 1}
              </span>
              {index < profileActivity.length - 1 ? (
                <span className="mt-2 h-8 w-px bg-slate-200" />
              ) : null}
            </div>
            <div>
              <p className="text-sm font-black text-slate-950">{activity.title}</p>
              <p className="mt-1 text-xs font-semibold text-slate-400">
                {activity.date === 'Today' ? 'Today' : formatDate(activity.date)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ModalShell({ children, onClose }) {
  return (
    <AnimatePresence>
      <motion.div
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-3 backdrop-blur-sm sm:items-center"
        exit={{ opacity: 0 }}
        initial={{ opacity: 0 }}
      >
        <button
          aria-label="Close modal"
          className="absolute inset-0 h-full w-full"
          onClick={onClose}
          type="button"
        />
        <motion.div
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="relative z-10 w-full max-w-2xl"
          exit={{ opacity: 0, y: 18, scale: 0.98 }}
          initial={{ opacity: 0, y: 28, scale: 0.98 }}
          transition={{ duration: 0.2 }}
        >
          {children}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function ProfileEditModal({ data, onClose, onSave, section }) {
  const config = editFields[section];
  const [form, setForm] = useState(data);
  const [errors, setErrors] = useState({});

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: '' }));
  };

  const validate = () => {
    const nextErrors = {};

    config.required.forEach((field) => {
      if (!String(form[field] ?? '').trim()) {
        nextErrors[field] = 'This field is required.';
      }
    });

    if (form.phone && !isValidIndianPhone(form.phone)) {
      nextErrors.phone = 'Enter a valid Indian mobile number.';
    }

    if (form.businessPhone && !isValidIndianPhone(form.businessPhone)) {
      nextErrors.businessPhone = 'Enter a valid Indian mobile number.';
    }

    if (form.supportEmail && !isValidEmail(form.supportEmail)) {
      nextErrors.supportEmail = 'Enter a valid email address.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!validate()) return;
    onSave(form);
  };

  return (
    <ModalShell onClose={onClose}>
      <Card className="max-h-[92vh] overflow-y-auto" padding="lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Badge variant="info">Local edit</Badge>
            <h2 className="mt-3 text-2xl font-black text-slate-950">
              {config.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Changes are saved only in local UI for this demo.
            </p>
          </div>
          <button
            aria-label="Close edit modal"
            className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
            onClick={onClose}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form className="mt-6" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            {config.fields.map((field) =>
              field.type === 'select' ? (
                <SelectControl
                  key={field.name}
                  label={field.label}
                  name={field.name}
                  onChange={handleChange}
                  value={form[field.name] || ''}
                >
                  {field.options.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </SelectControl>
              ) : (
                <Input
                  error={errors[field.name]}
                  key={field.name}
                  label={field.label}
                  name={field.name}
                  onChange={handleChange}
                  type={field.type || 'text'}
                  value={form[field.name] || ''}
                />
              ),
            )}
          </div>
          <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button onClick={onClose} variant="secondary">
              Cancel
            </Button>
            <Button type="submit">
              <Save className="h-4 w-4" />
              Save Changes
            </Button>
          </div>
        </form>
      </Card>
    </ModalShell>
  );
}

export default function ProfilePage() {
  const { profile: authProfile, user } = useAuth();
  const [owner, setOwner] = useState(userProfile);
  const [business, setBusiness] = useState(businessDetailsProfile);
  const [address, setAddress] = useState(addressProfile);
  const [gst, setGst] = useState(gstProfile);
  const [checklist, setChecklist] = useState(profileChecklist);
  const [logoPreview, setLogoPreview] = useState('');
  const [editSection, setEditSection] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (!authProfile && !user) return;

    setOwner((current) => ({
      ...current,
      ownerName: authProfile?.ownerName || user?.name || current.ownerName,
      email: authProfile?.email || user?.email || current.email,
      phone: authProfile?.phone || current.phone,
      role: authProfile?.role || current.role,
      languagePreference: authProfile?.language || current.languagePreference,
      joinedAt: authProfile?.createdAt || user?.registration || current.joinedAt,
    }));

    if (authProfile) {
      setBusiness((current) => ({
        ...current,
        businessName: authProfile.businessName || current.businessName,
        businessType: authProfile.businessType || current.businessType,
        industry: authProfile.industry || current.industry,
        businessSize: authProfile.businessSize || current.businessSize,
        employees: String(authProfile.employees || current.employees),
        establishedYear: String(authProfile.establishedYear || current.establishedYear),
      }));

      setAddress((current) => ({
        ...current,
        address: authProfile.address || current.address,
        city: authProfile.city || current.city,
        state: authProfile.state || current.state,
        pinCode: authProfile.pinCode || current.pinCode,
        country: authProfile.country || current.country,
        businessPhone: authProfile.businessPhone || authProfile.phone || current.businessPhone,
        supportEmail: authProfile.supportEmail || authProfile.email || current.supportEmail,
      }));

      setGst((current) => ({
        ...current,
        gstRegistered: authProfile.gstRegistered ? 'Yes' : 'No',
        gstin: authProfile.gstin || current.gstin,
        pan: authProfile.pan || current.pan,
      }));
    }
  }, [authProfile, user]);

  const profile = useMemo(
    () => ({
      ...businessProfile,
      businessName: business.businessName,
      businessType: business.businessType,
      ownerName: owner.ownerName,
      location: `${address.city}, ${address.state}`,
    }),
    [address.city, address.state, business.businessName, business.businessType, owner.ownerName],
  );

  const activeEditData = {
    owner,
    business,
    address,
    gst,
  }[editSection];

  const showSuccess = (message) => {
    setSuccessMessage(message);
    window.setTimeout(() => setSuccessMessage(''), 2600);
  };

  const handleLogoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLogoPreview(URL.createObjectURL(file));
    setChecklist((current) =>
      current.map((item) =>
        item.id === 'logo' ? { ...item, completed: true, label: 'Business logo added' } : item,
      ),
    );
    showSuccess('Logo preview updated locally.');
  };

  const handleSaveSection = (updatedData) => {
    if (editSection === 'owner') setOwner(updatedData);
    if (editSection === 'business') setBusiness(updatedData);
    if (editSection === 'address') setAddress(updatedData);
    if (editSection === 'gst') setGst(updatedData);

    setEditSection(null);
    showSuccess('Profile updated locally.');
  };

  const completedChecklist = checklist.filter((item) => item.completed).length;

  const summaryCards = [
    {
      title: 'Account Status',
      value: profile.accountStatus,
      trend: 'Verified owner workspace',
      status: 'success',
      icon: ShieldCheck,
    },
    {
      title: 'Profile Completion',
      value: `${profile.profileCompletion}%`,
      trend: `${completedChecklist} of ${checklist.length} checklist items`,
      status: getProfileCompletionStatus(profile.profileCompletion),
      icon: CircleGauge,
    },
    {
      title: 'GST Status',
      value: gst.gstRegistered === 'Yes' ? 'Registered' : 'Not Registered',
      trend: `GSTIN ${gst.gstin}`,
      status: getGstStatusBadge(gst.gstRegistered),
      icon: ReceiptText,
    },
    {
      title: 'Current Plan',
      value: mockAccountPlan.plan,
      trend: mockAccountPlan.billing,
      status: 'info',
      icon: CreditCard,
    },
  ];

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-indigo-500">
            Account Identity
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
            Profile
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Manage owner details, business information, GST profile, and account
            identity.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button onClick={() => setEditSection('owner')}>
            <UserRound className="h-4 w-4" />
            Edit Profile
          </Button>
          <Button
            onClick={() => showSuccess('Business profile download simulated.')}
            variant="secondary"
          >
            <Download className="h-4 w-4" />
            Download Profile
          </Button>
        </div>
      </section>

      <AnimatePresence>
        {successMessage ? (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            initial={{ opacity: 0, y: -8 }}
          >
            <Card className="border-emerald-100 bg-emerald-50/90" padding="sm">
              <div className="flex items-center gap-3 text-sm font-bold text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                {successMessage}
              </div>
            </Card>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {user && !authProfile ? (
        <Card className="border-amber-100 bg-amber-50/90" padding="sm">
          <div className="flex items-start gap-3 text-sm font-semibold text-amber-800">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Business profile not found. Complete registration or run the
              Appwrite profile setup before using real profile data.
            </p>
          </div>
        </Card>
      ) : null}

      <ProfileHero
        logoPreview={logoPreview}
        onLogoChange={handleLogoChange}
        profile={profile}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <StatCard
            icon={card.icon}
            key={card.title}
            status={card.status}
            title={card.title}
            trend={card.trend}
            value={card.value}
          />
        ))}
      </section>

      <AiInsightCard onImprove={() => setEditSection('business')} />

      <section className="grid gap-6 xl:grid-cols-2">
        <DetailCard icon={UserRound} onEdit={() => setEditSection('owner')} title="Owner Details">
          <DetailItem icon={UserRound} label="Owner Name" value={owner.ownerName} />
          <DetailItem
            icon={Mail}
            label="Email"
            value={
              <a className="text-indigo-600 hover:text-indigo-700" href={`mailto:${owner.email}`}>
                {owner.email}
              </a>
            }
          />
          <DetailItem icon={Phone} label="Phone" value={formatPhone(owner.phone)} />
          <DetailItem label="Role" value={owner.role} />
          <DetailItem icon={Languages} label="Language Preference" value={owner.languagePreference} />
          <DetailItem icon={CalendarDays} label="Joined" value={formatDate(owner.joinedAt)} />
        </DetailCard>

        <DetailCard icon={Building2} onEdit={() => setEditSection('business')} title="Business Details">
          <DetailItem icon={Store} label="Business Name" value={business.businessName} />
          <DetailItem label="Business Type" value={business.businessType} />
          <DetailItem label="Industry" value={business.industry} />
          <DetailItem label="Business Size" value={business.businessSize} />
          <DetailItem label="Employees" value={business.employees} />
          <DetailItem label="Established Year" value={business.establishedYear} />
        </DetailCard>

        <DetailCard icon={MapPin} onEdit={() => setEditSection('address')} title="Address & Contact">
          <DetailItem label="Address" value={address.address} />
          <DetailItem label="City" value={address.city} />
          <DetailItem label="State" value={address.state} />
          <DetailItem label="PIN Code" value={address.pinCode} />
          <DetailItem label="Country" value={address.country} />
          <DetailItem icon={Phone} label="Business Phone" value={formatPhone(address.businessPhone)} />
          <DetailItem
            icon={Mail}
            label="Support Email"
            value={
              <a className="text-indigo-600 hover:text-indigo-700" href={`mailto:${address.supportEmail}`}>
                {address.supportEmail}
              </a>
            }
          />
        </DetailCard>

        <Card hover>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-950">
                  GST & Compliance
                </h2>
                <Badge className="mt-2" variant={getGstStatusBadge(gst.gstRegistered)}>
                  GST Registered
                </Badge>
              </div>
            </div>
            <Button onClick={() => setEditSection('gst')} size="sm" variant="secondary">
              Edit
            </Button>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <DetailItem label="GST Registered" value={gst.gstRegistered} />
            <DetailItem label="GSTIN" value={gst.gstin} />
            <DetailItem label="PAN" value={gst.pan} />
            <DetailItem label="Business Category" value={gst.businessCategory} />
            <DetailItem label="GST Filing Frequency" value={gst.filingFrequency} />
            <DetailItem label="Last GST Review" value={formatDate(gst.lastGstReview)} />
          </div>
          <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-800">
            GST reports are currently simulated and will be generated from real
            invoice/sales data later.
          </div>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_0.85fr]">
        <BrandingCard logoPreview={logoPreview} onLogoChange={handleLogoChange} />
        <AccountPlanCard
          accountPlan={mockAccountPlan}
          onAction={(message) => showSuccess(message)}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.85fr_1fr_0.85fr]">
        <SecuritySnapshotCard onAction={(message) => showSuccess(message)} />
        <ProfileChecklist
          items={checklist}
          onToggle={(id) =>
            setChecklist((current) =>
              current.map((item) =>
                item.id === id ? { ...item, completed: !item.completed } : item,
              ),
            )
          }
        />
        <ProfileActivity />
      </section>

      <SectionHeader
        subtitle="Profile data is mock-only for now. Appwrite auth, file storage, and billing integrations come later."
        title="Demo Mode"
      />
      <Card className="border-cyan-100 bg-cyan-50/80" padding="sm">
        <p className="text-sm font-semibold leading-6 text-cyan-800">
          Logo upload, profile download, plan management, and security actions are
          simulated locally in this MVP.
        </p>
      </Card>

      {editSection ? (
        <ProfileEditModal
          data={activeEditData}
          onClose={() => setEditSection(null)}
          onSave={handleSaveSection}
          section={editSection}
        />
      ) : null}
    </div>
  );
}
