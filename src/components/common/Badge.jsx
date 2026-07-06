import clsx from 'clsx';

const variants = {
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  warning: 'bg-amber-50 text-amber-700 ring-amber-200',
  danger: 'bg-rose-50 text-rose-700 ring-rose-200',
  info: 'bg-cyan-50 text-cyan-700 ring-cyan-200',
  neutral: 'bg-slate-100 text-slate-600 ring-slate-200',
};

export default function Badge({ children, className, variant = 'neutral' }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset',
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
