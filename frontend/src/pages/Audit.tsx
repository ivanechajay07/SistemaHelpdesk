import { useEffect, useState } from 'react';
import { ShieldCheck, Search, Loader2, LogIn, UserPlus, Ticket, Settings2, KeyRound, Trash2, Star, Smartphone, Tablet, Monitor } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
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
  dispositivoTipo?: string | null;
  dispositivoModelo?: string | null;
  navegador?: string | null;
  ip?: string | null;
}

const deviceIcon = (tipo?: string | null) => {
  switch ((tipo || '').toUpperCase()) {
    case 'MOVIL': return Smartphone;
    case 'TABLET': return Tablet;
    default: return Monitor;
  }
};

const ACCION_CONFIG: Record<string, { icon: React.ElementType; classes: string }> = {
  LOGIN: { icon: LogIn, classes: 'bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400' },
  CREAR_USUARIO: { icon: UserPlus, classes: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400' },
  ACTIVAR_USUARIO: { icon: UserPlus, classes: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400' },
  RECHAZAR_USUARIO: { icon: Trash2, classes: 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400' },
  ELIMINAR_USUARIO: { icon: Trash2, classes: 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400' },
  EDITAR_USUARIO: { icon: Settings2, classes: 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400' },
  CAMBIO_PASSWORD: { icon: KeyRound, classes: 'bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400' },
  CREAR_TICKET: { icon: Ticket, classes: 'bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400' },
  ASIGNAR_TICKET: { icon: Ticket, classes: 'bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400' },
  RESOLVER_TICKET: { icon: Ticket, classes: 'bg-teal-100 text-teal-600 dark:bg-teal-500/15 dark:text-teal-400' },
  CERRAR_TICKET: { icon: Ticket, classes: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400' },
  CALIFICAR_TICKET: { icon: Star, classes: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-400' },
};

const actionConfig = (accion: string) =>
  ACCION_CONFIG[accion] || { icon: ShieldCheck, classes: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' };

const formatFecha = (fecha: string) =>
  new Date(fecha).toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

function ActionBadge({ accion }: { accion: string }) {
  const cfg = actionConfig(accion);
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide ${cfg.classes}`}>
      <Icon className="w-3 h-3 shrink-0" />
      {accion.replace(/_/g, ' ')}
    </span>
  );
}

function DeviceBlock({ log, compact = false }: { log: AuditLog; compact?: boolean }) {
  const DeviceIcon = deviceIcon(log.dispositivoTipo);
  const detalle = [log.ip || '—', log.navegador].filter(Boolean).join(' · ');
  return (
    <div className="flex items-center gap-2 min-w-0">
      <DeviceIcon className={`${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-sky-500 dark:text-sky-400 shrink-0`} />
      <div className="min-w-0">
        <p className={`${compact ? 'text-[11px]' : 'text-xs'} font-semibold text-slate-700 dark:text-slate-200 truncate`} title={log.dispositivoModelo || ''}>
          {log.dispositivoModelo || '—'}
        </p>
        <p className="text-[10px] text-slate-400 tabular-nums truncate" title={detalle}>{detalle}</p>
      </div>
    </div>
  );
}

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
      <PageHeader
        icon={ShieldCheck}
        eyebrow="Administración"
        title="Auditoría del Sistema"
        subtitle="Registro completo de acciones realizadas por los usuarios."
        gradient="from-slate-700 via-slate-800 to-slate-900"
      >
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(0); }}
            placeholder="Buscar por usuario, acción, dispositivo o IP..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/90 border border-white/30 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all"
          />
        </div>
      </PageHeader>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        {/* ===== Escritorio: tabla ===== */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
                <th className="px-5 py-3 font-black">Acción</th>
                <th className="px-5 py-3 font-black">Usuario</th>
                <th className="px-5 py-3 font-black hidden lg:table-cell">Entidad</th>
                <th className="px-5 py-3 font-black">Dispositivo / IP</th>
                <th className="px-5 py-3 font-black hidden xl:table-cell">Detalle</th>
                <th className="px-5 py-3 font-black hidden lg:table-cell">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
              {loading ? (
                <tr><td colSpan={6} className="py-14 text-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400 mx-auto" /></td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={6} className="py-14 text-center text-sm font-semibold text-slate-400">Sin registros de auditoría</td></tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3"><ActionBadge accion={log.accion} /></td>
                    <td className="px-5 py-3 text-xs font-bold text-slate-700 dark:text-slate-200">{log.usuario}</td>
                    <td className="px-5 py-3 hidden lg:table-cell">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {log.entidad}{log.entidadId ? ` #${log.entidadId}` : ''}
                      </span>
                    </td>
                    <td className="px-5 py-3 max-w-[220px]"><DeviceBlock log={log} /></td>
                    <td className="px-5 py-3 max-w-[320px] hidden xl:table-cell">
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate" title={log.detalle || ''}>{log.detalle || '—'}</p>
                    </td>
                    <td className="px-5 py-3 hidden lg:table-cell">
                      <span className="text-[11px] font-medium text-slate-400 tabular-nums">{formatFecha(log.fecha)}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ===== Móvil / tablet pequeña: tarjetas ===== */}
        <div className="md:hidden">
          {loading ? (
            <div className="py-14 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
          ) : logs.length === 0 ? (
            <p className="py-14 text-center text-sm font-semibold text-slate-400">Sin registros de auditoría</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {logs.map((log) => (
                <div key={log.id} className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <ActionBadge accion={log.accion} />
                    <span className="text-[10px] font-medium text-slate-400 tabular-nums text-right shrink-0">
                      {formatFecha(log.fecha)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{log.usuario}</span>
                    <span className="text-[10px] font-semibold text-slate-400">
                      {log.entidad}{log.entidadId ? ` #${log.entidadId}` : ''}
                    </span>
                  </div>

                  <div className="rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 p-2.5">
                    <DeviceBlock log={log} compact />
                  </div>

                  {log.detalle && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{log.detalle}</p>
                  )}
                </div>
              ))}
            </div>
          )}
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
