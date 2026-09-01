import React, { useEffect, useState } from 'react';
import { useInventarioStore, MOVIMIENTO_LABELS } from '../../store/inventoryStore';
import InventoryPageHeader from './InventoryPageHeader';
import {
  History, Loader2, ArrowDownLeft, ArrowUpRight, MapPin, Building2, User as UserIcon,
  Repeat, Clock, Search,
} from 'lucide-react';

const TIPO_ICONS: Record<string, { icon: React.ElementType; cls: string }> = {
  INGRESO: { icon: ArrowDownLeft, cls: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400' },
  SALIDA: { icon: ArrowUpRight, cls: 'bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400' },
  CAMBIO_SEDE: { icon: MapPin, cls: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-400' },
  CAMBIO_ENTIDAD: { icon: Building2, cls: 'bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400' },
  CAMBIO_RESPONSABLE: { icon: UserIcon, cls: 'bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400' },
  CAMBIO_UBICACION: { icon: MapPin, cls: 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400' },
  TRASLADO: { icon: Repeat, cls: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400' },
  DEVOLUCION: { icon: ArrowDownLeft, cls: 'bg-teal-100 text-teal-600 dark:bg-teal-500/15 dark:text-teal-400' },
  REEMPLAZO: { icon: Repeat, cls: 'bg-fuchsia-100 text-fuchsia-600 dark:bg-fuchsia-500/15 dark:text-fuchsia-400' },
};

export default function Historial() {
  const { movimientos, movimientosLoading, fetchMovimientos } = useInventarioStore();
  const [q, setQ] = useState('');

  useEffect(() => { fetchMovimientos(undefined, 0, 100); }, [fetchMovimientos]);

  const filtered = movimientos
    .filter((m) => !q || `${m.activoNombre} ${m.activoCodigo}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => new Date(b.fecha || 0).getTime() - new Date(a.fecha || 0).getTime());

  return (
    <div className="space-y-6">
      <InventoryPageHeader icon={History} eyebrow="Inventario" title="Historial de Activos" subtitle="Línea de tiempo de todos los movimientos registrados sobre los activos del sistema." gradient="from-cyan-600 via-teal-600 to-emerald-700" />

      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtrar por activo o código..." className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/60 transition-shadow" />
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm">
        {movimientosLoading && movimientos.length === 0 ? (
          <div className="flex items-center justify-center gap-3 text-slate-400 py-16"><Loader2 className="w-5 h-5 animate-spin" /> Cargando historial...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 text-slate-300 dark:text-slate-600 py-16"><History className="w-10 h-10" /><p className="text-sm font-medium text-slate-400">Sin movimientos en el historial</p></div>
        ) : (
          <ol className="relative border-l-2 border-slate-100 dark:border-slate-800 ml-3 space-y-8">
            {filtered.map((m) => {
              const conf = TIPO_ICONS[m.tipo] || TIPO_ICONS.TRASLADO;
              const Icon = conf.icon;
              return (
                <li key={m.id} className="relative pl-8 anim-fade-in-up">
                  <span className={`absolute -left-[19px] top-0 w-9 h-9 rounded-xl flex items-center justify-center ring-4 ring-white dark:ring-slate-900 ${conf.cls}`}>
                    <Icon className="w-4 h-4" />
                  </span>
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-black text-teal-600 dark:text-teal-400">{m.activoCodigo}</span>
                        <span className="text-sm font-extrabold text-slate-800 dark:text-slate-100">{m.activoNombre}</span>
                        <span className="inline-flex px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">{MOVIMIENTO_LABELS[m.tipo] || m.tipo}</span>
                      </div>
                      <p className="text-xs text-slate-400 font-medium mt-1">
                        {m.entidadOrigenNombre || m.sedeOrigenNombre ? `De: ${m.sedeOrigenNombre || ''}${m.sedeOrigenNombre && m.entidadOrigenNombre ? ' · ' : ''}${m.entidadOrigenNombre || ''}` : 'Origen: —'}
                        {m.entidadDestinoNombre || m.sedeDestinoNombre ? ` → ${m.sedeDestinoNombre || ''}${m.sedeDestinoNombre && m.entidadDestinoNombre ? ' · ' : ''}${m.entidadDestinoNombre || ''}` : ''}
                      </p>
                      {(m.responsableAnteriorNombre || m.responsableNuevoNombre) && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {m.responsableAnteriorNombre && `Resp. anterior: ${m.responsableAnteriorNombre}`}
                          {m.responsableAnteriorNombre && m.responsableNuevoNombre && ' → '}
                          {m.responsableNuevoNombre && `Resp. nuevo: ${m.responsableNuevoNombre}`}
                        </p>
                      )}
                      {m.motivo && <p className="text-xs text-slate-500 dark:text-slate-400 italic mt-0.5">"{m.motivo}"</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        <Clock className="w-3.5 h-3.5" />
                        {m.fecha ? new Date(m.fecha).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </p>
                      {m.usuarioOperacion && <p className="text-[11px] text-slate-400 mt-0.5">por {m.usuarioOperacion}</p>}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}