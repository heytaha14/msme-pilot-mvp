import clsx from 'clsx';
import { Link } from 'react-router-dom';

export default function AuthLayout({
  aside,
  children,
  formFirst = false,
  formWide = false,
}) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(79,70,229,0.13),_transparent_34rem),radial-gradient(circle_at_top_right,_rgba(6,182,212,0.12),_transparent_30rem),linear-gradient(180deg,_#ffffff_0%,_#f8fafc_48%,_#eef6ff_100%)] px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-7xl items-center gap-6 lg:grid-cols-2">
        <section
          className={clsx(
            'order-2',
            formFirst ? 'lg:order-2' : 'lg:order-1',
          )}
        >
          {aside}
        </section>

        <section
          className={clsx(
            'order-1 mx-auto w-full',
            formWide ? 'max-w-2xl' : 'max-w-md',
            formFirst ? 'lg:order-1' : 'lg:order-2',
          )}
        >
          <Link className="mb-6 flex items-center gap-3 lg:hidden" to="/">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-950 text-sm font-black text-white">
              MP
            </span>
            <span className="font-bold text-slate-950">MSME Pilot</span>
          </Link>
          {children}
        </section>
      </div>
    </main>
  );
}
