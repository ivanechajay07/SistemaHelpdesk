import { useEffect, useState } from 'react';
import { useInventarioStore, MOVIMIENTO_LABELS } from '../../store/inventoryStore';
import { useToast } from '../../components/ui/Toast';
import FormModal, { SectionTitle } from '../../components/ui/FormModal';
import InventoryPageHeader from './InventoryPageHeader';
import {
  ArrowLeftRight, Plus, Loader2, ArrowDownLeft, ArrowUpRight,
  Repeat, MapPin, User as UserIcon, Building2, History,
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

export default function Movimientos() {
  const toast = useToast();
  const { movimientos, movimientosLoading, fetchMovimientos, registrarMovimiento, activos, fetchActivos } = useInventarioStore();
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroActivo, setFiltroActivo] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<{ activoId?: number; tipo: string; ubicacionDestino?: string; motivo?: string; observaciones?: string }>({ tipo: 'CAMBIO_UBICACION' });

  useEffect(() => {
    fetchMovimientos();
    fetchActivos({ page: 0, size: 100 });
  }, [fetchMovimientos, fetchActivos]);

  const filtered = movimientos.filter((m) =>
    (filtroTipo ? m.tipo === filtroTipo : true) &&
    (filtroActivo ? String(m.activoId) === filtroActivo : true)
  );

  const submit = async () => {
    if (!form.activoId || !form.tipo) { toast({ variant: 'error', title: 'Campos requeridos', message: 'Selecciona activo y tipo de movimiento' }); return; }
    setSaving(true);
    try {
      await registrarMovimiento({ ...form, aplicar: true, ubicacionDestino: form.ubicacionDestino || undefined, motivo: form.motivo || undefined, observaciones: form.observaciones || undefined });
      toast({ variant: 'success', title: 'Movimiento registrado' });
      setShowModal(false); setForm({ tipo: 'CAMBIO_UBICACION' });
      fetchMovimientos();
    } catch (e: any) { toast({ variant: 'error', title: 'Error', message: e.message }); }
    setSaving(false);
  };

  const inputCls = 'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-shadow';

  return (
    <div className="space-y-6">
      <InventoryPageHeader icon={ArrowLeftRight} eyebrow="Inventario" title="Movimientos" subtitle="Trazabilidad de todos los movimientos de los activos: ingresos, salidas, traslados, cambios de responsable y más." gradient="from-cyan-600 via-teal-600 to-emerald-700" />

      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="flex flex-wrap gap-2.5">
          <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} className="h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/60 cursor-pointer">
            <option value="">Todos los tipos</option>
            {Object.entries(MOVIMIENTO_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select value={filtroActivo} onChange={(e) => setFiltroActivo(e.target.value)} className="h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/60 cursor-pointer">
            <option value="">Todos los activos</option>
            {activos.map((a) => <option key={a.id} value={a.id}>{a.codigo} — {a.nombre}</option>)}
          </select>
        </div>
        <div className="lg:ml-auto">
          <button onClick={() => setShowModal(true)} className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 text-white text-sm font-bold shadow-lg shadow-teal-500/25 hover:shadow-xl hover:-translate-y-0.5 transition-all active:scale-95"><Plus className="w-4 h-4" /> Registrar Movimiento</button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 text-left text-[11px] uppercase tracking-wider font-black text-slate-500 dark:text-slate-400">
                <th className="px-4 py-3.5">Tipo</th>
                <th className="px-4 py-3.5">Activo</th>
                <th className="px-4 py-3.5 hidden lg:table-cell">Origen</th>
                <th className="px-4 py-3.5 hidden lg:table-cell">Destino</th>
                <th className="px-4 py-3.5">Fecha</th>
                <th className="px-4 py-3.5 hidden md:table-cell">Usuario</th>
              </tr>
            </thead>
            <tbody>
              {movimientosLoading && movimientos.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-16"><div className="flex items-center justify-center gap-3 text-slate-400"><Loader2 className="w-5 h-5 animate-spin" /> Cargando...</div></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-16"><div className="flex flex-col items-center gap-2 text-slate-300 dark:text-slate-600"><History className="w-10 h-10" /><p className="text-sm font-medium text-slate-400">Sin movimientos registrados</p></div></td></tr>
              ) : filtered.map((m) => {
                const conf = TIPO_ICONS[m.tipo] || TIPO_ICONS.TRASLADO;
                const Icon = conf.icon;
                return (
                  <tr key={m.id} className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide ring-1 ring-inset ${conf.cls.replace('text-', 'text-')}`}>
                        <Icon className="w-3.5 h-3.5" /> {MOVIMIENTO_LABELS[m.tipo] || m.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-slate-800 dark:text-slate-100">{m.activoNombre}</p>
                      <p className="font-mono text-xs text-slate-400">{m.activoCodigo}</p>
                    </td>
                    <td className="px-4 py-3.5 hidden lg:table-cell">
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-snug">
                        {m.entidadOrigenNombre || m.sedeOrigenNombre ? `${m.sedeOrigenNombre || ''}${m.sedeOrigenNombre && m.entidadOrigenNombre ? ' · ' : ''}${m.entidadOrigenNombre || ''}` : '—'}
                        {m.responsableAnteriorNombre ? <span className="block text-slate-400">Resp: {m.responsableAnteriorNombre}</span> : null}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 hidden lg:table-cell">
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-snug">
                        {m.entidadDestinoNombre || m.sedeDestinoNombre ? `${m.sedeDestinoNombre || ''}${m.sedeDestinoNombre && m.entidadDestinoNombre ? ' · ' : ''}${m.entidadDestinoNombre || ''}` : '—'}
                        {m.responsableNuevoNombre ? <span className="block text-slate-400">Resp: {m.responsableNuevoNombre}</span> : null}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-xs font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {m.fecha ? new Date(m.fecha).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td className="px-4 py-3.5 hidden md:table-cell text-xs font-semibold text-slate-500">{m.usuarioOperacion || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <FormModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Registrar Movimiento"
        subtitle="Registra el movimiento de un activo"
        icon={<ArrowLeftRight className="w-5 h-5" />}
        theme="inventory"
        onSubmit={(e) => { e.preventDefault(); submit(); }}
        submitLabel="Registrar"
        loading={saving}
        maxWidth="max-w-lg"
      >
        <SectionTitle>Datos del movimiento</SectionTitle>
              <label className="block"><span className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Activo *</span>
                <select value={form.activoId ?? ''} onChange={(e) => setForm({ ...form, activoId: Number(e.target.value) || undefined })} className={inputCls}>
                  <option value="">Seleccionar activo</option>
                  {activos.filter((a) => a.estado !== 'DADO_DE_BAJA').map((a) => <option key={a.id} value={a.id}>{a.codigo} — {a.nombre}</option>)}
                </select>
              </label>
              <label className="block"><span className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Tipo de movimiento *</span>
                <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} className={inputCls}>
                  {Object.entries(MOVIMIENTO_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </label>
              <label className="block"><span className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Destino / nueva ubicación</span>
                <input value={form.ubicacionDestino || ''} onChange={(e) => setForm({ ...form, ubicacionDestino: e.target.value })} className={inputCls} placeholder="Ej. Sede Norte - Oficina 302" />
              </label>
              <label className="block"><span className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Motivo</span>
                <input value={form.motivo || ''} onChange={(e) => setForm({ ...form, motivo: e.target.value })} className={inputCls} placeholder="Motivo del movimiento" />
              </label>
              <label className="block"><span className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Observaciones</span>
                <textarea value={form.observaciones || ''} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} rows={3} className={inputCls} placeholder="Detalles adicionales" />
              </label>
      </FormModal>
    </div>
  );
}