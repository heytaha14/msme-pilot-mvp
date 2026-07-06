import clsx from 'clsx';
import Card from './Card.jsx';

const statusStyles = {
  success: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
  warning: 'bg-amber-50 text-amber-600 ring-amber-100',
  danger: 'bg-rose-50 text-rose-600 ring-rose-100',
  info: 'bg-cyan-50 text-cyan-600 ring-cyan-100',
  neutral: 'bg-slate-100 text-slate-600 ring-slate-200',
};

export default function StatCard({
  icon: Icon,
  title,
  value,
  trend,
  status = 'neutral',
}) {
  return (
    <Card hover>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
            {value}
          </p>
        </div>
        {Icon ? (
          <div
            className={clsx(
              'grid h-11 w-11 place-items-center rounded-2xl ring-1 ring-inset',
              statusStyles[status],
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        ) : null}
      </div>
      {trend ? <p className="mt-4 text-sm text-slate-500">{trend}</p> : null}
    </Card>
  );
}
