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

/** Pantalla de carga que imita el layout del panel (sidebar + header + contenido). */
export function SkeletonPage() {
  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-72 shrink-0 flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-4 gap-4">
        <div className="flex items-center gap-3 px-2 py-2">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-2.5 w-20" />
          </div>
        </div>
        <div className="space-y-1">
          <Skeleton className="h-3 w-16 mb-3" />
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-2 py-2">
              <Skeleton className="h-5 w-5 rounded-md shrink-0" />
              <Skeleton className="h-3.5 flex-1" />
            </div>
          ))}
        </div>
        <div className="mt-auto flex items-center gap-3 px-2 pt-4 border-t border-slate-200 dark:border-slate-800">
          <Skeleton className="h-10 w-10 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-3 w-36" />
          </div>
        </div>
      </aside>

      {/* Contenido */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 shrink-0 bg-white/80 dark:bg-slate-900/80 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-xl lg:hidden" />
            <Skeleton className="h-5 w-40 hidden sm:block" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-56 rounded-xl hidden md:block" />
            <Skeleton className="h-9 w-9 rounded-xl" />
            <Skeleton className="h-9 w-9 rounded-xl" />
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
        </header>

        {/* Body */}
        <main className="flex-1 p-4 sm:p-6 overflow-hidden">
          <div className="max-w-7xl mx-auto space-y-6">
            <Skeleton className="h-28 w-full rounded-3xl" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => <SkeletonStat key={i} />)}
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
              <Skeleton className="h-5 w-44 mb-5" />
              <SkeletonList rows={5} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
