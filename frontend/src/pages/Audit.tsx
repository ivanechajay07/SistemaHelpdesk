import { useEffect, useState } from 'react';
import { ShieldCheck, Search, Loader2, LogIn, UserPlus, Ticket, Settings2, KeyRound, Trash2, Star } from 'lucide-react';
import api from '../lib/axios';
import Pagination from '../components/ui/Pagination';

interface AuditLog {
  id: number;
  usuario: string;
  accion: string;
  entidad: string;
  entidadId: number | null;
  detalle: string | null;
  fecha: string;
}

const ACCION_CONFIG: Record<string, { icon: React.ElementType; classes: string }> = {
  LOGIN: { icon: LogIn, classes: 'bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400' },
  CREAR_USUARIO: { icon: UserPlus, classes: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400' },
  ACTIVAR_USUARIO: { icon: UserPlus, classes: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400' },
  RECHAZAR_USUARIO: { icon: Trash2, classes: 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400' },
  ELIMINAR_USUARIO: { icon: Trash2, classes: 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400' },
  EDITAR_USUARIO: { icon: Settings2, classes: 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400' },
  CAMBIO_PASSWORD: { icon: KeyRound, classes: 'bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400' },
  CREAR_TICKET: { icon: Ticket, classes: 'bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400' },
  ASIGNAR_TICKET: { icon: Ticket, classes: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400' },
  RESOLVER_TICKET: { icon: Ticket, classes: 'bg-teal-100 text-teal-600 dark:bg-teal-500/15 dark:text-teal-400' },
  CERRAR_TICKET: { icon: Ticket, classes: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400' },
  CALIFICAR_TICKET: { icon: Star, classes: 'bg-fuchsia-100 text-fuchsia-600 dark:bg-fuchsia-500/15 dark:text-fuchsia-400' },
};

export default function Audit() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/audit', { params: { q: q || undefined, page, size } });
        setLogs(data.content || []);
        setTotalPages(data.totalPages || 0);
        setTotal(data.totalElements || 0);
      } catch {
        setLogs([]);
      } finally {
        setLoading(false);
      }
    }, q ? 350 : 0);
    return () => clearTimeout(t);
  }, [q, page, size]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center shadow-lg shadow-slate-900/25">
              <ShieldCheck className="w-5 h-5 text-white" />
            </span>
            Auditoría del Sistema
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
            Registro completo de acciones realizadas por los usuarios
          </p>
        </div>
        <div className="relative sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(0); }}
            placeholder="Buscar por usuario, acción o detalle..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500/30 transition-all"
          />
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
                <th className="px-5 py-3 font-black">Acción</th>
                <th className="px-5 py-3 font-black">Usuario</th>
                <th className="px-5 py-3 font-black hidden md:table-cell">Entidad</th>
                <th className="px-5 py-3 font-black">Detalle</th>
                <th className="px-5 py-3 font-black hidden lg:table-cell">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
              {loading ? (
                <tr><td colSpan={5} className="py-14 text-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400 mx-auto" /></td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={5} className="py-14 text-center text-sm font-semibold text-slate-400">Sin registros de auditoría</td></tr>
              ) : (
                logs.map((log) => {
                  const cfg = ACCION_CONFIG[log.accion] || { icon: ShieldCheck, classes: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' };
                  const Icon = cfg.icon;
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide ${cfg.classes}`}>
                          <Icon className="w-3 h-3" />
                          {log.accion.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs font-bold text-slate-700 dark:text-slate-200">{log.usuario}</td>
                      <td className="px-5 py-3 hidden md:table-cell">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                          {log.entidad}{log.entidadId ? ` #${log.entidadId}` : ''}
                        </span>
                      </td>
                      <td className="px-5 py-3 max-w-[320px]">
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate" title={log.detalle || ''}>{log.detalle || '—'}</p>
                      </td>
                      <td className="px-5 py-3 hidden lg:table-cell">
                        <span className="text-[11px] font-medium text-slate-400 tabular-nums">
                          {new Date(log.fecha).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination
        page={page + 1}
        pageSize={size}
        total={total}
        totalPages={totalPages}
        onPageChange={(p) => setPage(p - 1)}
        onPageSizeChange={(s) => { setSize(s); setPage(0); }}
        label="registros"
      />
    </div>
  );
}
