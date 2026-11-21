import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Compass, LayoutDashboard, LifeBuoy } from 'lucide-react';
import Button from '../components/ui/Button';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-3xl items-center justify-center">
      <div className="relative w-full overflow-hidden rounded-hero border border-slate-200/80 bg-white/85 p-8 text-center shadow-xl shadow-slate-950/5 ring-1 ring-slate-900/5 backdrop-blur-xl anim-fade-in-up sm:p-12 dark:border-slate-800 dark:bg-slate-900/75">
        <div className="pointer-events-none absolute -left-20 -top-24 h-56 w-56 rounded-full bg-blue-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-16 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="relative">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-400 shadow-lg shadow-blue-500/25 ring-1 ring-white/20">
            <Compass className="h-8 w-8 text-white" />
          </div>

          <p className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-6xl font-black tracking-tighter text-transparent sm:text-7xl">
            404
          </p>
          <h1 className="mt-2 text-xl font-black tracking-tight text-slate-900 sm:text-2xl dark:text-white">
            Esta página no existe
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm font-medium text-slate-500 dark:text-slate-400">
            El enlace puede haber cambiado o el módulo ya no está disponible. Vuelve al panel o abre un ticket de soporte.
          </p>

          <div className="mt-7 flex flex-col justify-center gap-2.5 sm:flex-row">
            <Button onClick={() => navigate('/dashboard')} leftIcon={<LayoutDashboard className="h-4 w-4" />}>
              Ir al dashboard
            </Button>
            <Button
              variant="secondary"
              onClick={() => navigate(-1)}
              leftIcon={<ArrowLeft className="h-4 w-4" />}
            >
              Volver atrás
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate('/tickets')}
              leftIcon={<LifeBuoy className="h-4 w-4" />}
            >
              Ir a tickets
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

