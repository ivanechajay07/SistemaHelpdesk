import React, { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Inbox } from 'lucide-react';
import { cn } from '../../lib/utils';
import EmptyState from './EmptyState';
import ErrorState from './ErrorState';
import { Skeleton, SkeletonList } from './Skeleton';

export type SortDirection = 'asc' | 'desc';

export interface DataTableColumn<T> {
  /** Identificador único de la columna. */
  key: string;
  header: React.ReactNode;
  render?: (row: T, index: number) => React.ReactNode;
  /** Valor usado para ordenar; habilita la columna como ordenable. */
  sortValue?: (row: T) => string | number;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  className?: string;
  headerClassName?: string;
  /** Oculta la columna por debajo del breakpoint indicado. */
  hideBelow?: 'md' | 'lg' | 'xl';
  /** Incluir en la tarjeta móvil automática (por defecto true). */
  mobile?: boolean;
  mobileLabel?: string;
  /** Columna principal de la tarjeta móvil automática. */
  mobilePrimary?: boolean;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  rowKey: (row: T) => React.Key;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  emptyIcon?: React.ElementType;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  onRowClick?: (row: T) => void;
  rowClassName?: (row: T) => string;
  /** Tarjeta personalizada para móvil. Si se omite se genera automáticamente. */
  renderMobileCard?: (row: T, index: number) => React.ReactNode;
  /** Contenido sobre la tabla (buscador, filtros, acciones). */
  toolbar?: React.ReactNode;
  /** Contenido bajo la tabla (paginación, totales). */
  footer?: React.ReactNode;
  caption?: string;
  className?: string;
  skeletonRows?: number;
  /** Ancho mínimo de la tabla de escritorio. */
  minWidth?: string;
  /** Mensaje accesible mientras se cargan datos. */
  loadingLabel?: string;
}

const HIDE_BELOW: Record<'md' | 'lg' | 'xl', string> = {
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
  xl: 'hidden xl:table-cell',
};

const ALIGN: Record<'left' | 'center' | 'right', string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

const SORT_ICON = {
  none: ArrowUpDown,
  asc: ArrowUp,
  desc: ArrowDown,
} as const;

/**
 * Tabla de datos común: ordenación accesible, estados de carga/vacío/error,
 * toolbar, footer y vista de tarjetas automática en móvil.
 */
export default function DataTable<T>({
  columns,
  data,
  rowKey,
  loading = false,
  error,
  onRetry,
  emptyIcon: EmptyIcon = Inbox,
  emptyTitle = 'Sin resultados',
  emptyDescription,
  emptyAction,
  onRowClick,
  rowClassName,
  renderMobileCard,
  toolbar,
  footer,
  caption,
  className,
  skeletonRows = 6,
  minWidth = '720px',
  loadingLabel = 'Cargando datos',
}: DataTableProps<T>) {
  const [sort, setSort] = useState<{ key: string; direction: SortDirection } | null>(null);

  const sortableColumns = useMemo(
    () => new Map(columns.filter((column) => column.sortValue).map((column) => [column.key, column])),
    [columns],
  );

  const sortedData = useMemo(() => {
    if (!sort) return data;
    const column = sortableColumns.get(sort.key);
    if (!column?.sortValue) return data;
    const factor = sort.direction === 'asc' ? 1 : -1;
    return [...data].sort((a, b) => {
      const va = column.sortValue!(a);
      const vb = column.sortValue!(b);
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * factor;
      return String(va).localeCompare(String(vb), 'es', { numeric: true, sensitivity: 'base' }) * factor;
    });
  }, [data, sort, sortableColumns]);

  const toggleSort = (key: string) => {
    setSort((current) => {
      if (!current || current.key !== key) return { key, direction: 'asc' };
      if (current.direction === 'asc') return { key, direction: 'desc' };
      return null;
    });
  };

  const primaryColumn =
    columns.find((column) => column.mobilePrimary) ??
    columns.find((column) => column.mobile !== false) ??
    columns[0];

  const mobileColumns = columns.filter(
    (column) => column !== primaryColumn && column.mobile !== false,
  );

  const hasRows = sortedData.length > 0;

  return (
    <div
      className={cn(
        'overflow-hidden rounded-card border border-slate-200/80 bg-white/90 shadow-card ring-1 ring-slate-900/5 dark:border-slate-800 dark:bg-slate-900/80',
        className,
      )}
    >
      {toolbar && (
        <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800/70 sm:px-5">
          {toolbar}
        </div>
      )}

      {error ? (
        <ErrorState description={error} onRetry={onRetry} />
      ) : loading && !hasRows ? (
        <div aria-busy="true" aria-label={loadingLabel}>
          {/* Escritorio */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left" style={{ minWidth }}>
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-500">
                  {columns.map((column) => (
                    <th key={column.key} scope="col" className={cn('px-5 py-3 font-black', ALIGN[column.align ?? 'left'], column.hideBelow && HIDE_BELOW[column.hideBelow], column.headerClassName)}>
                      {column.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                {Array.from({ length: skeletonRows }).map((_, rowIndex) => (
                  <tr key={rowIndex}>
                    {columns.map((column) => (
                      <td key={column.key} className={cn('px-5 py-3.5', column.hideBelow && HIDE_BELOW[column.hideBelow])}>
                        <Skeleton className="h-3.5 w-full max-w-[160px]" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Móvil */}
          <div className="p-4 md:hidden">
            <SkeletonList rows={Math.min(skeletonRows, 5)} />
          </div>
        </div>
      ) : !hasRows ? (
        <EmptyState
          icon={EmptyIcon}
          title={emptyTitle}
          description={emptyDescription}
          action={emptyAction}
        />
      ) : (
        <>
          {/* Escritorio */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm" style={{ minWidth }}>
              {caption && <caption className="sr-only">{caption}</caption>}
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-500">
                  {columns.map((column) => {
                    const isSorted = sort?.key === column.key;
                    const Icon = SORT_ICON[isSorted ? sort!.direction : 'none'];
                    const sortable = Boolean(column.sortValue);
                    return (
                      <th
                        key={column.key}
                        scope="col"
                        aria-sort={
                          isSorted ? (sort!.direction === 'asc' ? 'ascending' : 'descending') : undefined
                        }
                        className={cn('px-5 py-3 font-black', ALIGN[column.align ?? 'left'], column.hideBelow && HIDE_BELOW[column.hideBelow], column.headerClassName)}
                      >
                        {sortable ? (
                          <button
                            type="button"
                            onClick={() => toggleSort(column.key)}
                            className={cn(
                              'inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 font-black uppercase tracking-wider transition-colors hover:text-blue-600 dark:hover:text-blue-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40',
                              isSorted && 'text-blue-600 dark:text-blue-400',
                            )}
                          >
                            {column.header}
                            <Icon className="h-3 w-3 shrink-0" />
                          </button>
                        ) : (
                          column.header
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                {sortedData.map((row, index) => (
                  <tr
                    key={rowKey(row)}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={cn(
                      'transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40',
                      onRowClick && 'cursor-pointer',
                      rowClassName?.(row),
                    )}
                  >
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={cn('px-5 py-3.5 align-middle', ALIGN[column.align ?? 'left'], column.hideBelow && HIDE_BELOW[column.hideBelow], column.className)}
                      >
                        {column.render ? column.render(row, index) : String((row as Record<string, unknown>)[column.key] ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Móvil */}
          <div className="divide-y divide-slate-100 dark:divide-slate-800/60 md:hidden">
            {sortedData.map((row, index) =>
              renderMobileCard ? (
                <div key={rowKey(row)}>{renderMobileCard(row, index)}</div>
              ) : (
                <div key={rowKey(row)} className={cn('space-y-2.5 p-4', onRowClick && 'cursor-pointer', rowClassName?.(row))} onClick={onRowClick ? () => onRowClick(row) : undefined}>
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    {primaryColumn?.render ? primaryColumn.render(row, index) : String((row as Record<string, unknown>)[primaryColumn?.key ?? ''] ?? '—')}
                  </div>
                  {mobileColumns.length > 0 && (
                    <dl className="grid grid-cols-1 gap-1.5">
                      {mobileColumns.map((column) => (
                        <div key={column.key} className="flex items-start justify-between gap-3 text-xs">
                          <dt className="shrink-0 font-semibold text-slate-400 dark:text-slate-500">
                            {column.mobileLabel ?? column.header}
                          </dt>
                          <dd className="min-w-0 text-right font-semibold text-slate-600 dark:text-slate-300">
                            {column.render ? column.render(row, index) : String((row as Record<string, unknown>)[column.key] ?? '—')}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>
              ),
            )}
          </div>
        </>
      )}

      {footer && (
        <div className="border-t border-slate-100 px-3 py-2 dark:border-slate-800/70">
          {footer}
        </div>
      )}
    </div>
  );
}
