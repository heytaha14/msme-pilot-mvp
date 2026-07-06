import clsx from 'clsx';

const variants = {
  normal: 'border border-slate-200/80 bg-white shadow-soft',
  glass: 'glass-surface',
  dark: 'border border-slate-800 bg-slate-950 text-white shadow-soft',
};

const paddings = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
};

export default function Card({
  children,
  className,
  variant = 'normal',
  padding = 'md',
  hover = false,
  as: Component = 'div',
}) {
  return (
    <Component
      className={clsx(
        'rounded-3xl',
        variants[variant],
        paddings[padding],
        hover && 'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-glass',
        className,
      )}
    >
      {children}
    </Component>
  );
}
