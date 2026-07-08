import { motion } from 'framer-motion';
import {
  ArrowRight,
  BadgeCheck,
  Bot,
  ChevronRight,
  FileScan,
  Gauge,
  PackageSearch,
  ReceiptIndianRupee,
  WalletCards,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Badge from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import SectionHeader from '../../components/common/SectionHeader.jsx';
import {
  landingFeatures,
  landingTargetUsers,
  problemSolutionItems,
  workflowSteps,
} from '../../data/mockData.js';

const previewStats = [
  {
    label: "Today's Sales",
    value: 'Live after login',
    icon: ReceiptIndianRupee,
    tone: 'bg-emerald-50 text-emerald-600',
  },
  {
    label: 'Business Health',
    value: 'Calculated live',
    icon: Gauge,
    tone: 'bg-indigo-50 text-indigo-600',
  },
  {
    label: 'Inventory',
    value: 'Your products',
    icon: PackageSearch,
    tone: 'bg-cyan-50 text-cyan-600',
  },
  {
    label: 'Pending Dues',
    value: 'Tracked live',
    icon: WalletCards,
    tone: 'bg-rose-50 text-rose-600',
  },
];

const navLinks = [
  { label: 'Features', href: '#features' },
  { label: 'Workflow', href: '#workflow' },
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Login', href: '/login' },
];

function DashboardPreview() {
  return (
    <Card className="relative overflow-hidden" padding="lg" variant="glass">
      <div className="absolute -right-10 top-8 h-40 w-40 rounded-full bg-cyan-200/40 blur-3xl" />
      <div className="absolute -bottom-12 left-8 h-36 w-36 rounded-full bg-indigo-200/40 blur-3xl" />
      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-500">Dashboard preview</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
              Your Business Dashboard
            </h2>
          </div>
          <Badge variant="success">Strong</Badge>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          {previewStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div className="rounded-3xl bg-white/80 p-4 shadow-sm" key={stat.label}>
                <div className={`grid h-10 w-10 place-items-center rounded-2xl ${stat.tone}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <p className="mt-4 text-xs font-semibold text-slate-500">
                  {stat.label}
                </p>
                <p className="mt-1 text-lg font-black text-slate-950">{stat.value}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-5 rounded-3xl border border-indigo-100 bg-indigo-50/80 p-4">
          <div className="flex items-start gap-3">
            <Bot className="mt-0.5 h-5 w-5 text-indigo-600" />
            <div>
              <p className="text-sm font-bold text-slate-950">AI priority</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Live reorder, payment, and invoice priorities appear after setup.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(79,70,229,0.13),_transparent_34rem),radial-gradient(circle_at_top_right,_rgba(6,182,212,0.12),_transparent_30rem),linear-gradient(180deg,_#ffffff_0%,_#f8fafc_48%,_#eef6ff_100%)] px-4 py-5 text-slate-950 sm:px-6 lg:px-8">
      <nav className="sticky top-4 z-40 mx-auto flex max-w-7xl items-center justify-between rounded-full border border-white/70 bg-white/80 px-4 py-3 shadow-soft backdrop-blur-xl">
        <Link className="flex items-center gap-3" to="/">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-950 text-sm font-black text-white">
            MP
          </span>
          <span className="text-sm font-bold">MSME Pilot</span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map((item) =>
            item.href.startsWith('/') ? (
              <Link
                className="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
                key={item.label}
                to={item.href}
              >
                {item.label}
              </Link>
            ) : (
              <a
                className="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
                href={item.href}
                key={item.label}
              >
                {item.label}
              </a>
            ),
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button as={Link} className="md:hidden" size="sm" to="/login" variant="secondary">
            Login
          </Button>
          <Button as={Link} size="sm" to="/register">
            Start Free
          </Button>
        </div>
      </nav>

      <section className="mx-auto grid max-w-7xl items-center gap-9 py-14 lg:grid-cols-[1fr_0.9fr] lg:py-20">
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          initial={{ opacity: 0, y: 18 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
            <BadgeCheck className="h-3.5 w-3.5" />
            AI-powered business management for Indian MSMEs
          </div>
          <h1 className="mt-6 max-w-3xl text-4xl font-black tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
            Your AI Business Manager for Every MSME
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
            Manage inventory, invoices, customers, suppliers, sales, reports,
            payments, and business decisions from one beautiful AI-powered
            dashboard.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button as={Link} size="lg" to="/register">
              Create Your Account
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button as={Link} size="lg" to="/dashboard" variant="secondary">
              View Dashboard Demo
            </Button>
          </div>
        </motion.div>

        <motion.div
          animate={{ opacity: 1, scale: 1 }}
          initial={{ opacity: 0, scale: 0.96 }}
          transition={{ delay: 0.12, duration: 0.55, ease: 'easeOut' }}
        >
          <DashboardPreview />
        </motion.div>
      </section>

      <section className="mx-auto max-w-7xl pb-14">
        <div className="flex flex-wrap gap-3">
          {landingTargetUsers.map((userType) => (
            <span
              className="rounded-full border border-white/80 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm backdrop-blur"
              key={userType}
            >
              {userType}
            </span>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 py-10 lg:grid-cols-[0.85fr_1.15fr]">
        <div>
          <SectionHeader
            subtitle="MSME Pilot replaces scattered manual work with one calm operating system."
            title="From Daily Friction To Clear Decisions"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {problemSolutionItems.map((item) => (
            <Card hover key={item.problem}>
              <p className="text-sm font-bold text-rose-500">{item.problem}</p>
              <div className="mt-3 flex items-center gap-2 text-slate-300">
                <span className="h-px flex-1 bg-slate-200" />
                <ChevronRight className="h-4 w-4" />
                <span className="h-px flex-1 bg-slate-200" />
              </div>
              <h3 className="mt-3 text-lg font-black text-slate-950">
                {item.solution}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {item.description}
              </p>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl py-10" id="features">
        <SectionHeader
          subtitle="Every core module is designed for practical MSME operations."
          title="Everything Your Business Needs"
        />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {landingFeatures.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card hover key={feature.title}>
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-lg font-bold text-slate-950">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {feature.description}
                </p>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl py-10" id="workflow">
        <Card className="overflow-hidden" padding="lg" variant="glass">
          <SectionHeader
            subtitle="A practical automation path for invoices, stock, and decisions."
            title="Invoice To Insight Workflow"
          />
          <div className="mt-7 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            {workflowSteps.map((step, index) => (
              <div className="relative rounded-3xl bg-white/80 p-4 shadow-sm" key={step}>
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-950 text-sm font-black text-white">
                  {index + 1}
                </div>
                <p className="mt-4 text-sm font-bold leading-5 text-slate-950">{step}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="mx-auto max-w-7xl py-12">
        <Card
          className="overflow-hidden bg-gradient-to-br from-slate-950 to-indigo-950 text-white"
          padding="lg"
        >
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-cyan-200">
                <FileScan className="h-6 w-6" />
              </div>
              <h2 className="mt-6 max-w-3xl text-3xl font-black tracking-tight sm:text-4xl">
                Make your business smarter, faster, and digitally ready.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                Start with a polished dashboard today, then connect OCR, AI, and
                backend workflows when the product is ready.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Button as={Link} size="lg" to="/register">
                Create Your Account
              </Button>
              <Button as={Link} size="lg" to="/dashboard" variant="secondary">
                Explore Demo
              </Button>
            </div>
          </div>
        </Card>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-col gap-5 border-t border-slate-200/80 py-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-black text-slate-950">MSME Pilot</p>
          <p className="mt-1 text-sm text-slate-500">
            AI-powered business management for Indian MSMEs.
          </p>
        </div>
        <div className="flex flex-wrap gap-4 text-sm font-semibold text-slate-500">
          <a className="hover:text-slate-950" href="#features">
            Features
          </a>
          <a className="hover:text-slate-950" href="#workflow">
            Workflow
          </a>
          <Link className="hover:text-slate-950" to="/dashboard">
            Demo
          </Link>
          <Link className="hover:text-slate-950" to="/login">
            Login
          </Link>
        </div>
      </footer>
    </main>
  );
}
