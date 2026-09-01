import { useEffect, useState } from 'react';
import {
  useInventarioStore, PRESTAMO_LABELS, PRESTAMO_BADGE,
} from '../../store/inventoryStore';
import { useUserStore } from '../../store/userStore';
import { useToast } from '../../components/ui/Toast';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import InventoryPageHeader from './InventoryPageHeader';
import {
  PackagePlus, Plus, X, Loader2, Undo2, AlertTriangle,
} from 'lucide-react';

export default function Prestamos() {
  const toast = useToast();
  const { prestamos, prestamosLoading, fetchPrestamos, crearPrestamo, devolverPrestamo, activos, fetchActivos } = useInventarioStore();
  const { users, fetchUsers } = useUserStore();
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [devolverId, setDevolverId] = useState<number | null>(null);
  const [form, setForm] = useState<{ activoId?: number; solicitanteId?: number; fechaEntrega: string; fechaDevolucionPrevista: string; motivo?: string; observaciones?: string }>({ fechaEntrega: '', fechaDevolucionPrevista: '' });

  useEffect(() => { fetchPrestamos(); fetchActivos({ page: 0, size: 100 }); fetchUsers(); }, [fetchPrestamos, fetchActivos, fetchUsers]);

  const submit = async () => {
    if (!form.activoId || !form.solicitanteId || !form.fechaEntrega || !form.fechaDevolucionPrevista) {
      toast({ variant: 'error', title: 'Campos requeridos', message: 'Completa activo, solicitante y fechas' });
      return;
    }
    setSaving(true);
    try {
      await crearPrestamo({ ...form, estado: 'SOLICITADO', fechaEntrega: form.fechaEntrega || undefined, fechaDevolucionPrevista: form.fechaDevolucionPrevista || undefined, motivo: form.motivo || undefined, observaciones: form.observaciones || undefined });
      toast({ variant: 'success', title: 'Préstamo registrado' });
      setShowModal(false); setForm({ fechaEntrega: '', fechaDevolucionPrevista: '' });
      fetchPrestamos();
    } catch (e: any) { toast({ variant: 'error', title: 'Error', message: e.message }); }
    setSaving(false);
  };

  const doDevolver = async () => {
    if (!devolverId) return;
    setSaving(true);
    try { await devolverPrestamo(devolverId); toast({ variant: 'success', title: 'Devolución registrada' }); setDevolverId(null); fetchPrestamos(); } catch (e: any) { toast({ variant: 'error', title: 'Error', message: e.message }); }
    setSaving(false);
  };

  const inputCls = 'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-shadow';

  const hoy = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <InventoryPageHeader icon={PackagePlus} eyebrow="Inventario" title="Préstamos" subtitle="Control de préstamos de activos a personal, con fechas de devolución y estados." gradient="from-cyan-600 via-teal-600 to-emerald-700" />

      <div className="flex justify-end">
        <button onClick={() => setShowModal(true)} className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 text-white text-sm font-bold shadow-lg shadow-teal-500/25 hover:shadow-xl hover:-translate-y-0.5 transition-all active:scale-95"><Plus className="w-4 h-4" /> Registrar Préstamo</button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 text-left text-[11px] uppercase tracking-wider font-black text-slate-500 dark:text-slate-400">
                <th className="px-4 py-3.5">Activo</th>
                <th className="px-4 py-3.5">Solicitante</th>
                <th className="px-4 py-3.5">Estado</th>
                <th className="px-4 py-3.5 hidden md:table-cell">Entrega</th>
                <th className="px-4 py-3.5 hidden lg:table-cell">Devolución prevista</th>
                <th className="px-4 py-3.5 hidden lg:table-cell">Devolución real</th>
                <th className="px-4 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {prestamosLoading && prestamos.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-16"><div className="flex items-center justify-center gap-3 text-slate-400"><Loader2 className="w-5 h-5 animate-spin" /> Cargando...</div></td></tr>
              ) : prestamos.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-16"><div className="flex flex-col items-center gap-2 text-slate-300 dark:text-slate-600"><PackagePlus className="w-10 h-10" /><p className="text-sm font-medium text-slate-400">Sin préstamos registrados</p></div></td></tr>
              ) : prestamos.map((p) => (
                <tr key={p.id} className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3.5">
                    <p className="font-bold text-slate-800 dark:text-slate-100">{p.activoNombre}</p>
                    <p className="font-mono text-xs text-slate-400">{p.activoCodigo}</p>
                  </td>
                  <td className="px-4 py-3.5 text-sm font-semibold text-slate-600 dark:text-slate-300">{p.solicitanteNombre || '—'}</td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide ring-1 ring-inset ${PRESTAMO_BADGE[p.estado] || ''}`}>
                      {p.devolucionVencida && p.estado !== 'DEVUELTO' && <AlertTriangle className="w-3 h-3 text-red-500" />}
                      {PRESTAMO_LABELS[p.estado] || p.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 hidden md:table-cell text-xs font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">{p.fechaEntrega ? new Date(p.fechaEntrega).toLocaleDateString('es-PE') : '—'}</td>
                  <td className="px-4 py-3.5 hidden lg:table-cell text-xs font-bold whitespace-nowrap">
                    <span className={`${p.devolucionVencida && p.estado !== 'DEVUELTO' ? 'text-red-600 dark:text-red-400' : 'text-slate-600 dark:text-slate-300'}`}>
                      {p.fechaDevolucionPrevista ? new Date(p.fechaDevolucionPrevista).toLocaleDateString('es-PE') : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 hidden lg:table-cell text-xs font-semibold text-slate-500 whitespace-nowrap">{p.fechaDevolucionReal ? new Date(p.fechaDevolucionReal).toLocaleDateString('es-PE') : '—'}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-end">
                      {(p.estado === 'APROBADO' || p.estado === 'ENTREGADO') && (
                        <button onClick={() => setDevolverId(p.id)} title="Registrar devolución" className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20 rounded-xl transition-colors"><Undo2 className="w-4 h-4" /> Devolver</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-3 anim-fade-in overflow-y-auto">
          <div className="my-auto relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden anim-scale-in">
            <div className="h-1.5 w-full bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500" />
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <div><h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Registrar Préstamo</h3><p className="text-xs text-slate-400 font-medium">Presta un activo a un colaborador</p></div>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <label className="block"><span className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Activo *</span>
                <select value={form.activoId ?? ''} onChange={(e) => setForm({ ...form, activoId: Number(e.target.value) || undefined })} className={inputCls}>
                  <option value="">Seleccionar activo</option>
                  {activos.filter((a: any) => a.estado === 'OPERATIVO' || a.estado === 'DISPONIBLE').map((a) => <option key={a.id} value={a.id}>{a.codigo} — {a.nombre}</option>)}
                </select>
              </label>
              <label className="block"><span className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Solicitante *</span>
                <select value={form.solicitanteId ?? ''} onChange={(e) => setForm({ ...form, solicitanteId: Number(e.target.value) || undefined })} className={inputCls}>
                  <option value="">Seleccionar usuario</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.nombre} {u.apellidos}</option>)}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block"><span className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Fecha de entrega *</span>
                  <input type="date" min={hoy} value={form.fechaEntrega} onChange={(e) => setForm({ ...form, fechaEntrega: e.target.value })} className={inputCls} />
                </label>
                <label className="block"><span className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Devolución prevista *</span>
                  <input type="date" min={form.fechaEntrega || hoy} value={form.fechaDevolucionPrevista} onChange={(e) => setForm({ ...form, fechaDevolucionPrevista: e.target.value })} className={inputCls} />
                </label>
              </div>
              <label className="block"><span className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Motivo</span>
                <input value={form.motivo || ''} onChange={(e) => setForm({ ...form, motivo: e.target.value })} className={inputCls} placeholder="Motivo del préstamo" />
              </label>
              <label className="block"><span className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Observaciones</span>
                <textarea value={form.observaciones || ''} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} rows={2} className={inputCls} placeholder="Detalles adicionales" />
              </label>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800">
              <button onClick={() => setShowModal(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors">Cancelar</button>
              <button onClick={submit} disabled={saving} className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-teal-600 to-emerald-600 shadow-lg shadow-teal-500/25 rounded-xl hover:shadow-xl disabled:opacity-60 transition-all hover:-translate-y-0.5 active:scale-95">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />} Registrar
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog isOpen={!!devolverId} variant="success" title="¿Registrar devolución?" message="El activo quedará devuelto y disponible nuevamente." confirmText="Sí, devolver" onConfirm={doDevolver} onClose={() => setDevolverId(null)} />
    </div>
  );
}