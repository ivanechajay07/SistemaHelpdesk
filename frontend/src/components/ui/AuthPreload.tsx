/**
 * Pantalla de carga previa al login: se muestra mientras se recupera la
 * sesión desde la cookie HttpOnly. Diseño glass con anillo animado.
 */
export default function AuthPreload() {
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center overflow-hidden bg-gradient-to-br from-white via-slate-50 to-cyan-50 dark:from-slate-950 dark:via-slate-950 dark:to-blue-950/70">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-[-10%] h-[45vw] w-[45vw] rounded-full bg-blue-200/60 blur-[120px] anim-blob dark:bg-blue-500/10" />
        <div className="absolute bottom-[-20%] right-[-10%] h-[40vw] w-[40vw] rounded-full bg-cyan-100/70 blur-[120px] anim-blob dark:bg-cyan-500/10" style={{ animationDelay: '-7s' }} />
        <div
          className="absolute inset-0 opacity-[0.30] dark:opacity-[0.15]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(79,70,229,.10) 1px, transparent 1px), linear-gradient(90deg, rgba(79,70,229,.10) 1px, transparent 1px)',
            backgroundSize: '52px 52px',
            maskImage: 'radial-gradient(ellipse at center, black, transparent 75%)',
          }}
        />
      </div>

      <div className="relative flex flex-col items-center px-6 text-center">
        <div className="relative flex h-24 w-24 items-center justify-center">
          <span className="absolute inset-0 rounded-[32px] bg-gradient-to-br from-blue-500/25 to-cyan-400/25 blur-xl" />
          <span className="absolute -inset-3 rounded-[36px] border border-blue-400/30 anim-ring-pulse dark:border-cyan-400/20" />
          <span className="absolute inset-0 animate-spin rounded-[30px] border-2 border-transparent border-r-cyan-400 border-t-blue-600" style={{ animationDuration: '2.2s' }} />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-[26px] bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-400 shadow-2xl shadow-blue-500/30 ring-1 ring-white/30">
            <span className="text-xl font-black tracking-tight text-white">HD</span>
          </div>
        </div>

        <p className="mt-7 text-lg font-black tracking-tight text-slate-900 dark:text-white">
          HelpDesk <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">PRO</span>
        </p>
        <p className="mt-1.5 text-sm font-medium text-slate-500 dark:text-slate-400">
          Preparando tu sesión segura...
        </p>

        <div className="mt-5 h-1.5 w-52 overflow-hidden rounded-full bg-slate-200/80 dark:bg-white/10">
          <div className="anim-loading-slide h-full w-1/2 rounded-full bg-gradient-to-r from-blue-600 via-cyan-400 to-blue-600" />
        </div>

        <div className="mt-4 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Conexión protegida
        </div>
      </div>
    </div>
  );
}
