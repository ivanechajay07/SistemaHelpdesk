import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';

const PAGE_SIZES = [10, 25, 50];

export interface PaginationProps {
  /** Página actual (1-based) */
  page: number;
  /** Filas por página */
  pageSize: number;
  /** Total de items (modo client-side) */
  total?: number;
  /** Total de páginas (modo server-side; tiene prioridad sobre total) */
  totalPages?: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  label?: string;
}

/** Construye la lista de botones numéricos con elipsis: 1 … 4 5 6 … 20 */
function getPageList(current: number, totalPages: number): (number | '…')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const pages = new Set<number>([1, totalPages, current]);
  if (current - 1 >= 2) pages.add(current - 1);
  if (current + 1 <= totalPages - 1) pages.add(current + 1);
  // Garantizar al menos 3 visibles en los extremos
  if (current === 1) { pages.add(2); pages.add(3); }
  if (current === totalPages) { pages.add(totalPages - 1); pages.add(totalPages - 2); }
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const out: (number | '…')[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (p - prev > 1) out.push('…');
    out.push(p);
    prev = p;
  }
  return out;
}

/**
 * Barra de paginación numérica reutilizable:
 * selector de filas por página (10/25/50), botones numerados compactos
 * con elipsis y navegación primera/anterior/siguiente/última. Responsive.
 */
export default function Pagination({
  page,
  pageSize,
  total,
  totalPages: totalPagesProp,
  onPageChange,
  onPageSizeChange,
  label = 'registros',
}: PaginationProps) {
  const totalPages = totalPagesProp ?? Math.max(1, Math.ceil((total ?? 0) / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const count = total ?? 0;
  const start = count === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(safePage * pageSize, count);

  const btnBase =
    'inline-flex h-8 min-w-[32px] px-1.5 items-center justify-center rounded-lg text-xs font-bold transition-all duration-200 active:scale-90 disabled:opacity-35 disabled:pointer-events-none';
  const btnIdle =
    'text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 shadow-sm';

  const changePage = (p: number) => {
    if (p < 1 || p > totalPages || p === safePage) return;
    onPageChange(p);
  };

  return (
    <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-3.5 py-3 shadow-sm">
      {/* Selector de filas por página + contador */}
      <div className="flex items-center justify-between sm:justify-start gap-3 flex-wrap">
        {onPageSizeChange && (
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span className="hidden md:inline">Filas por página</span>
            <span className="md:hidden">Filas</span>
            <select
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
                onPageChange(1);
              }}
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-black text-slate-700 dark:text-slate-200 py-1.5 pl-2 pr-6 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/60 transition-shadow"
            >
              {PAGE_SIZES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
        )}
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          <span className="hidden sm:inline">Mostrando </span>
          <span className="font-black text-slate-700 dark:text-slate-200">{start}–{end}</span>
          <span className="hidden sm:inline"> de </span>
          <span className="sm:hidden"> / </span>
          <span className="font-black text-slate-700 dark:text-slate-200">{count}</span>
          <span className="hidden sm:inline"> {label}</span>
        </p>
      </div>

      {/* Botonera numérica */}
      {totalPages > 1 && (
        <nav className="flex items-center gap-1 overflow-x-auto py-0.5 -mx-0.5 px-0.5" aria-label="Paginación">
          <button
            onClick={() => changePage(1)}
            disabled={safePage === 1}
            title="Primera página"
            className={`${btnBase} ${btnIdle} hidden lg:inline-flex`}
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => changePage(safePage - 1)}
            disabled={safePage === 1}
            title="Anterior"
            className={`${btnBase} ${btnIdle}`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {getPageList(safePage, totalPages).map((p, i) =>
            p === '…' ? (
              <span key={`e-${i}`} className="px-1 text-slate-400 dark:text-slate-500 text-xs font-black select-none">
                …
              </span>
            ) : (
              <button
                key={p}
                onClick={() => changePage(p)}
                aria-current={p === safePage ? 'page' : undefined}
                className={`${btnBase} ${
                  p === safePage
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/30 scale-[1.05]'
                    : btnIdle
                }`}
              >
                {p}
              </button>
            )
          )}

          <button
            onClick={() => changePage(safePage + 1)}
            disabled={safePage === totalPages}
            title="Siguiente"
            className={`${btnBase} ${btnIdle}`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => changePage(totalPages)}
            disabled={safePage === totalPages}
            title="Última página"
            className={`${btnBase} ${btnIdle} hidden lg:inline-flex`}
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </nav>
      )}
    </div>
  );
}
