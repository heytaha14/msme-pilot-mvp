import { useState } from 'react';
import {
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Badge from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import Input from '../../components/common/Input.jsx';
import AuthLayout from '../../components/layout/AuthLayout.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { authPreviewMetrics } from '../../data/mockData.js';
import { isValidEmail } from '../../utils/validators.js';

const initialValues = {
  email: '',
  password: '',
};

function LoginBrandPanel() {
  return (
    <Card
      className="relative overflow-hidden bg-gradient-to-br from-slate-950 to-indigo-950 text-white"
      padding="lg"
    >
      <div className="absolute right-8 top-8 h-36 w-36 rounded-full bg-cyan-400/20 blur-3xl" />
      <div className="absolute bottom-8 left-10 h-40 w-40 rounded-full bg-indigo-400/20 blur-3xl" />

      <div className="relative">
        <Link className="hidden items-center gap-3 lg:flex" to="/">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-sm font-black text-slate-950">
            MP
          </span>
          <span className="font-bold">MSME Pilot</span>
        </Link>

        <div className="mt-0 lg:mt-16">
          <Badge className="bg-white/10 text-cyan-100 ring-white/15" variant="neutral">
            AI business cockpit
          </Badge>
          <h1 className="mt-6 max-w-xl text-3xl font-black tracking-tight sm:text-4xl">
            Your AI Business Manager for Every MSME
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300">
            Track sales, inventory, invoices, customers, suppliers, and AI
            recommendations from one simple dashboard.
          </p>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {authPreviewMetrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <div className="rounded-3xl border border-white/10 bg-white/10 p-4" key={metric.label}>
                <Icon className="h-5 w-5 text-cyan-200" />
                <p className="mt-4 text-xs font-semibold text-slate-300">
                  {metric.label}
                </p>
                <p className="mt-1 text-xl font-black text-white">{metric.value}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-6 rounded-3xl border border-white/10 bg-white/10 p-5">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-cyan-200" />
            <div>
              <p className="text-sm font-black text-white">AI insight</p>
              <p className="mt-1 text-sm leading-6 text-slate-300">
                Rice stock is below minimum. Reorder before Friday.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { clearError, login } = useAuth();
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const redirectTo = location.state?.from?.pathname || '/dashboard';

  function updateField(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
    clearError();
  }

  function validate() {
    const nextErrors = {};

    if (!values.email.trim()) {
      nextErrors.email = 'Email is required.';
    } else if (!isValidEmail(values.email)) {
      nextErrors.email = 'Enter a valid email address.';
    }

    if (!values.password) {
      nextErrors.password = 'Password is required.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      await login(values.email, values.password);
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setErrors({ form: error.message });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthLayout aside={<LoginBrandPanel />}>
      <Card className="w-full" padding="lg" variant="glass">
        <div className="flex items-start justify-between gap-5">
          <div>
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h1 className="mt-6 text-3xl font-black tracking-tight text-slate-950">
              Welcome back
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Login to manage your business cockpit.
            </p>
          </div>
          <TrendingUp className="hidden h-6 w-6 text-cyan-500 sm:block" />
        </div>

        <form className="mt-8 space-y-4" noValidate onSubmit={handleSubmit}>
          {errors.form ? (
            <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
              {errors.form}
            </div>
          ) : null}

          <Input
            autoComplete="email"
            error={errors.email}
            icon={Mail}
            label="Email"
            name="email"
            onChange={updateField}
            placeholder="taha@ahmedkirana.in"
            type="email"
            value={values.email}
          />
          <Input
            autoComplete="current-password"
            error={errors.password}
            icon={LockKeyhole}
            label="Password"
            name="password"
            onChange={updateField}
            placeholder="Enter password"
            rightElement={
              <button
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="grid h-8 w-8 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                onClick={() => setShowPassword((current) => !current)}
                type="button"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            }
            type={showPassword ? 'text' : 'password'}
            value={values.password}
          />

          <div className="flex justify-end">
            <Link
              className="text-sm font-bold text-indigo-600 transition hover:text-indigo-700"
              onClick={(event) => {
                event.preventDefault();
                setErrors({
                  form: 'Password recovery will be enabled after recovery email templates are configured.',
                });
              }}
              to="/login"
            >
              Forgot password?
            </Link>
          </div>

          <Button
            className="w-full"
            loading={isLoading}
            rounded="2xl"
            size="lg"
            type="submit"
          >
            Login
          </Button>

          <Button className="w-full" rounded="2xl" size="lg" type="button" variant="secondary">
            <ShieldCheck className="h-4 w-4" />
            Continue with Google
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Don&apos;t have an account?{' '}
          <Link className="font-bold text-indigo-600 hover:text-indigo-700" to="/register">
            Create account
          </Link>
        </p>
      </Card>
    </AuthLayout>
  );
}
