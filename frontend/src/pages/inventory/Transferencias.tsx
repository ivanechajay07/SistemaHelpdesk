import { useEffect, useState } from 'react';
import {
  useInventarioStore, TRANSFERENCIA_LABELS, TRANSFERENCIA_BADGE,
} from '../../store/inventoryStore';
import { useCatalogStore } from '../../store/catalogStore';
import { useToast } from '../../components/ui/Toast';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import FormModal, { SectionTitle } from '../../components/ui/FormModal';
import Pagination from '../../components/ui/Pagination';
import InventoryPageHeader from './InventoryPageHeader';
import {
  ArrowLeftRight, Plus, Loader2, ArrowRight, CheckCircle2, Ban, PackageCheck,
} from 'lucide-react';

export default function Transferencias() {
  const toast = useToast();
  const { transferencias, transferenciasLoading, fetchTransferencias, crearTransferencia, confirmarRecepcion, anularTransferencia, activos, fetchActivos } = useInventarioStore();
  const { sedes, fetchSedes } = useCatalogStore();
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [recibirId, setRecibirId] = useState<number | null>(null);
  const [anularId, setAnularId] = useState<number | null>(null);
  const [form, setForm] = useState<{ sedeOrigenId?: number; sedeDestinoId?: number; motivo?: string; observaciones?: string; activoIds: number[] }>({ activoIds: [] });
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);

  useEffect(() => { fetchTransferencias(); fetchSedes(); fetchActivos({ page: 0, size: 100 }); }, [fetchTransferencias, fetchSedes, fetchActivos]);

  const paged = transferencias.slice((page - 1) * size, page * size);

  const toggleActivo = (id: number) => {
    setForm((f) => ({ ...f, activoIds: f.activoIds.includes(id) ? f.activoIds.filter((x) => x !== id) : [...f.activoIds, id] }));
  };

  const submit = async () => {
    if (!form.sedeOrigenId || !form.sedeDestinoId || form.activoIds.length === 0) {
      toast({ variant: 'error', title: 'Campos requeridos', message: 'Selecciona origen, destino y al menos un activo' });
      return;
    }
    setSaving(true);
    try {
      await crearTransferencia({ ...form, motivo: form.motivo || undefined, observaciones: form.observaciones || undefined });
      toast({ variant: 'success', title: 'Transferencia creada' });
      setShowModal(false); setForm({ activoIds: [] });
      fetchTransferencias();
    } catch (e: any) { toast({ variant: 'error', title: 'Error', message: e.message }); }
    setSaving(false);
  };

  const doRecibir = async () => {
    if (!recibirId) return;
    setSaving(true);
    try { await confirmarRecepcion(recibirId); toast({ variant: 'success', title: 'Recepción confirmada' }); setRecibirId(null); fetchTransferencias(); } catch (e: any) { toast({ variant: 'error', title: 'Error', message: e.message }); }
    setSaving(false);
  };

  const doAnular = async () => {
    if (!anularId) return;
    setSaving(true);
    try { await anularTransferencia(anularId); toast({ variant: 'success', title: 'Transferencia anulada' }); setAnularId(null); fetchTransferencias(); } catch (e: any) { toast({ variant: 'error', title: 'Error', message: e.message }); }
    setSaving(false);
  };

  const inputCls = 'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-shadow';

  return (
    <div className="space-y-6">
      <InventoryPageHeader icon={ArrowLeftRight} eyebrow="Inventario" title="Transferencias" subtitle="Traslado de activos entre sedes con control de estados, recepción y aprobación." gradient="from-cyan-600 via-teal-600 to-emerald-700" />

      <div className="flex justify-end">
        <button onClick={() => setShowModal(true)} className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 text-white text-sm font-bold shadow-lg shadow-teal-500/25 hover:shadow-xl hover:-translate-y-0.5 transition-all active:scale-95"><Plus className="w-4 h-4" /> Nueva Transferencia</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {transferenciasLoading && transferencias.length === 0 ? (
          <div className="col-span-full flex items-center justify-center gap-3 text-slate-400 py-16"><Loader2 className="w-5 h-5 animate-spin" /> Cargando...</div>
        ) : transferencias.length === 0 ? (
          <div className="col-span-full flex flex-col items-center gap-2 text-slate-300 dark:text-slate-600 py-16"><PackageCheck className="w-10 h-10" /><p className="text-sm font-medium text-slate-400">Sin transferencias registradas</p></div>
        ) : paged.map((t) => (
          <div key={t.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-lg transition-all anim-fade-in-up">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-mono text-sm font-black text-teal-600 dark:text-teal-400">{t.numeroDocumento}</p>
                <p className="text-xs text-slate-400 font-medium mt-0.5">{t.fecha ? new Date(t.fecha).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</p>
              </div>
              <span className={`inline-flex px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide ring-1 ring-inset ${TRANSFERENCIA_BADGE[t.estado] || ''}`}>{TRANSFERENCIA_LABELS[t.estado] || t.estado}</span>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <div className="flex-1 min-w-0">
                <p className="truncate">{t.sedeOrigenNombre || '—'}</p>
                <p className="text-[10px] text-slate-400 truncate">{t.entidadOrigenNombre}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-teal-500 shrink-0" />
              <div className="flex-1 min-w-0 text-right">
                <p className="truncate">{t.sedeDestinoNombre || '—'}</p>
                <p className="text-[10px] text-slate-400 truncate">{t.entidadDestinoNombre}</p>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wide text-slate-400">Activos:</span>
              {(t.activos || []).slice(0, 3).map((a) => (
                <span key={a.id} className="inline-flex px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300">{a.codigo}</span>
              ))}
              {(t.activos || []).length > 3 && <span className="text-[10px] font-bold text-slate-400">+{(t.activos || []).length - 3}</span>}
            </div>

            <div className="mt-4 flex gap-2">
              {t.estado === 'PENDIENTE_APROBACION' && (
                <button onClick={() => setRecibirId(t.id)} className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20 rounded-xl transition-colors"><CheckCircle2 className="w-4 h-4" /> Confirmar recepción</button>
              )}
              {(t.estado === 'PENDIENTE_APROBACION' || t.estado === 'EN_TRANSITO') && (
                <button onClick={() => setAnularId(t.id)} className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors"><Ban className="w-4 h-4" /> Anular</button>
              )}
            </div>
          </div>
        ))}
      </div>

      <Pagination
        page={page}
        pageSize={size}
        total={transferencias.length}
        onPageChange={setPage}
        onPageSizeChange={(s) => { setSize(s); setPage(1); }}
        label="transferencias"
      />

      <FormModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Nueva Transferencia"
        subtitle="Traslado de activos entre sedes"
        icon={<ArrowLeftRight className="w-5 h-5" />}
        theme="inventory"
        onSubmit={(e) => { e.preventDefault(); submit(); }}
        submitLabel="Crear transferencia"
        loading={saving}
        maxWidth="max-w-lg"
      >
        <SectionTitle>Origen y destino</SectionTitle>
              <div className="grid grid-cols-2 gap-3">
                <label className="block"><span className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Sede origen *</span>
                  <select value={form.sedeOrigenId ?? ''} onChange={(e) => setForm({ ...form, sedeOrigenId: Number(e.target.value) || undefined })} className={inputCls}>
                    <option value="">Seleccionar</option>
                    {sedes.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                  </select>
                </label>
                <label className="block"><span className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Sede destino *</span>
                  <select value={form.sedeDestinoId ?? ''} onChange={(e) => setForm({ ...form, sedeDestinoId: Number(e.target.value) || undefined })} className={inputCls}>
                    <option value="">Seleccionar</option>
                    {sedes.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                  </select>
                </label>
              </div>
              <label className="block"><span className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Motivo</span>
                <input value={form.motivo || ''} onChange={(e) => setForm({ ...form, motivo: e.target.value })} className={inputCls} placeholder="Motivo de la transferencia" />
              </label>
              <label className="block"><span className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Observaciones</span>
                <textarea value={form.observaciones || ''} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} rows={2} className={inputCls} placeholder="Detalles adicionales" />
              </label>
              <div>
                <span className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Activos a transferir * ({form.activoIds.length})</span>
                <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800">
                  {activos.filter((a: any) => a.estado !== 'DADO_DE_BAJA' && a.estado !== 'EN_TRANSITO').map((a) => (
                    <label key={a.id} className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <input type="checkbox" checked={form.activoIds.includes(a.id)} onChange={() => toggleActivo(a.id)} className="w-4 h-4 rounded accent-teal-600" />
                      <span className="font-mono text-xs font-bold text-teal-600 dark:text-teal-400">{a.codigo}</span>
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 truncate">{a.nombre}</span>
                    </label>
                  ))}
                </div>
              </div>
      </FormModal>

      <ConfirmDialog isOpen={!!recibirId} variant="success" title="¿Confirmar recepción?" message="Los activos serán asignados a la sede de destino y su estado cambiará a En Tránsito / Recibido." confirmText="Sí, confirmar" onConfirm={doRecibir} onClose={() => setRecibirId(null)} />
      <ConfirmDialog isOpen={!!anularId} variant="warning" title="¿Anular transferencia?" message="La transferencia quedará cancelada y los activos permanecerán en su sede de origen." confirmText="Sí, anular" onConfirm={doAnular} onClose={() => setAnularId(null)} />
    </div>
  );
}