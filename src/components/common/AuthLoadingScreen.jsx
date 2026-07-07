import { Loader2, Sparkles } from 'lucide-react';
import Card from './Card.jsx';

export default function AuthLoadingScreen() {
  return (
    <div className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top_left,_rgba(79,70,229,0.12),_transparent_32rem),linear-gradient(180deg,_#f8fafc_0%,_#eef6ff_100%)] px-4 text-slate-950">
      <Card className="w-full max-w-md text-center" padding="lg" variant="glass">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-3xl bg-gradient-to-br from-indigo-600 to-cyan-500 text-white shadow-soft">
          <Sparkles className="h-7 w-7" />
        </div>
        <h1 className="mt-5 text-2xl font-black tracking-tight text-slate-950">
          MSME Pilot
        </h1>
        <p className="mt-2 text-sm font-semibold text-slate-500">
          Preparing your business workspace...
        </p>
        <div className="mt-6 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
        </div>
      </Card>
    </div>
  );
}
