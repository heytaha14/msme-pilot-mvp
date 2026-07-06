import clsx from 'clsx';

export default function Input({
  label,
  error,
  icon: Icon,
  rightElement,
  className,
  id,
  ...props
}) {
  const inputId = id || props.name;
  const errorId = error ? `${inputId}-error` : undefined;

  return (
    <label className="block" htmlFor={inputId}>
      {label ? (
        <span className="mb-2 block text-sm font-semibold text-slate-700">
          {label}
        </span>
      ) : null}
      <span className="relative block">
        {Icon ? (
          <Icon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        ) : null}
        <input
          className={clsx(
            'h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100',
            Icon && 'pl-11',
            rightElement && 'pr-12',
            error && 'border-rose-300 focus:border-rose-300 focus:ring-rose-100',
            className,
          )}
          aria-describedby={errorId}
          aria-invalid={error ? 'true' : undefined}
          id={inputId}
          {...props}
        />
        {rightElement ? (
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            {rightElement}
          </span>
        ) : null}
      </span>
      {error ? (
        <span className="mt-2 block text-sm text-rose-600" id={errorId}>
          {error}
        </span>
      ) : null}
    </label>
  );
}
