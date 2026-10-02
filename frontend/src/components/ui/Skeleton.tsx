/** Bloque base de skeleton con animación shimmer. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

/** Skeleton de una tarjeta de estadística (KPI). */
export function SkeletonStat() {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-12 w-12 rounded-2xl" />
      </div>
      <Skeleton className="h-1.5 w-full mt-4" />
    </div>
  );
}

/** Skeleton de filas tipo lista/tabla. */
export function SkeletonList({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
          <Skeleton className="h-10 w-10 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-6 w-20 rounded-lg shrink-0" />
        </div>
      ))}
    </div>
  );
}

/** Pantalla de carga centrada (marca + esqueletos) mostrada al recargar. */
export function SkeletonPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-blue-50 to-cyan-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 relative overflow-hidden flex flex-col items-center justify-center p-6">
      {/* Blobs suaves de fondo */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-[-15%] left-[-8%] w-[55vw] h-[55vw] bg-sky-300/40 dark:bg-cyan-500/10 rounded-full blur-[140px] anim-blob" />
        <div className="absolute bottom-[-20%] right-[-5%] w-[45vw] h-[45vw] bg-cyan-200/50 dark:bg-sky-600/10 rounded-full blur-[140px] anim-blob" style={{ animationDelay: '-7s' }} />
        <div className="absolute top-[30%] left-[45%] w-[30vw] h-[30vw] bg-blue-200/50 dark:bg-blue-700/10 rounded-full blur-[120px] anim-blob" style={{ animationDelay: '-13s' }} />
      </div>

      {/* Marca con anillo giratorio */}
      <div className="relative mb-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-500 via-blue-500 to-cyan-500 p-[2px] shadow-xl shadow-sky-500/30">
          <div className="w-full h-full rounded-2xl bg-white dark:bg-slate-950 flex items-center justify-center">
            <span className="font-black text-2xl text-slate-900 dark:text-white">H</span>
          </div>
        </div>
        <span className="absolute -inset-2 rounded-[22px] border-2 border-sky-400/40 anim-spin-ring" />
      </div>

      <div className="relative w-full max-w-sm text-center">
        <Skeleton className="h-4 w-40 mx-auto mb-2" />
        <Skeleton className="h-3 w-56 mx-auto mb-8" />
      </div>

      <div className="relative w-full max-w-3xl grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>

      <div className="relative w-full max-w-3xl mt-5 space-y-2.5">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <Skeleton className="h-3 w-2/3" />
      </div>

      <p className="relative mt-8 text-xs font-semibold text-sky-600/70 dark:text-sky-400/60">Cargando HelpDesk PRO...</p>
    </div>
  );
}
