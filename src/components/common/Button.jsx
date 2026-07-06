import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

const variants = {
  primary:
    'bg-indigo-600 text-white shadow-soft shadow-indigo-200 hover:bg-indigo-700 focus-visible:ring-indigo-500',
  secondary:
    'border border-slate-200 bg-white text-slate-900 shadow-sm hover:border-indigo-200 hover:bg-indigo-50/70 focus-visible:ring-indigo-400',
  ghost:
    'text-slate-600 hover:bg-slate-100 hover:text-slate-950 focus-visible:ring-slate-300',
  danger:
    'bg-rose-600 text-white shadow-soft shadow-rose-200 hover:bg-rose-700 focus-visible:ring-rose-500',
  success:
    'bg-emerald-600 text-white shadow-soft shadow-emerald-200 hover:bg-emerald-700 focus-visible:ring-emerald-500',
};

const sizes = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-5 text-sm',
  lg: 'h-12 px-6 text-base',
};

export default function Button({
  as: Component = 'button',
  children,
  className,
  variant = 'primary',
  size = 'md',
  loading = false,
  rounded = 'full',
  disabled,
  type = 'button',
  ...props
}) {
  const isNativeButton = Component === 'button';

  return (
    <Component
      className={clsx(
        'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
        variants[variant],
        sizes[size],
        rounded === 'full' ? 'rounded-full' : 'rounded-2xl',
        className,
      )}
      {...(isNativeButton ? { disabled: disabled || loading, type } : {})}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {children}
    </Component>
  );
}
