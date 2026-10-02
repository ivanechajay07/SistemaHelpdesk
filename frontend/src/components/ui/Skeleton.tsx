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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-100 dark:from-slate-950 dark:via-slate-950 dark:to-indigo-950 flex flex-col items-center justify-center p-6">
      {/* Marca con anillo giratorio */}
      <div className="relative mb-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-500 via-indigo-500 to-violet-600 p-[2px] shadow-xl shadow-blue-500/30">
          <div className="w-full h-full rounded-2xl bg-white dark:bg-slate-950 flex items-center justify-center">
            <span className="font-black text-2xl text-slate-900 dark:text-white">H</span>
          </div>
        </div>
        <span className="absolute -inset-2 rounded-[22px] border-2 border-blue-500/40 anim-spin-ring" />
      </div>

      <Skeleton className="h-4 w-40 mb-2" />
      <Skeleton className="h-3 w-56 mb-8" />

      <div className="w-full max-w-3xl grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>

      <div className="w-full max-w-3xl mt-5 space-y-2.5">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <Skeleton className="h-3 w-2/3" />
      </div>

      <p className="mt-8 text-xs font-semibold text-slate-400 dark:text-slate-500">Cargando HelpDesk PRO...</p>
    </div>
  );
}
