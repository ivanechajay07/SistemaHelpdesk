import { useEffect, useState } from 'react';
import {
  useInventarioStore, PRESTAMO_LABELS, PRESTAMO_BADGE,
} from '../../store/inventoryStore';
import { useUserStore } from '../../store/userStore';
import { useToast } from '../../components/ui/Toast';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import FormModal, { SectionTitle } from '../../components/ui/FormModal';
import Pagination from '../../components/ui/Pagination';
import DataTable from '../../components/ui/DataTable';
import Button from '../../components/ui/Button';
import InventoryPageHeader from './InventoryPageHeader';
import {
  PackagePlus, Plus, Undo2, AlertTriangle,
} from 'lucide-react';

export default function Prestamos() {
  const toast = useToast();
  const { prestamos, prestamosLoading, fetchPrestamos, crearPrestamo, devolverPrestamo, activos, fetchActivos } = useInventarioStore();
  const { users, fetchUsers } = useUserStore();
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [devolverId, setDevolverId] = useState<number | null>(null);
  const [form, setForm] = useState<{ activoId?: number; solicitanteId?: number; fechaEntrega: string; fechaDevolucionPrevista: string; motivo?: string; observaciones?: string }>({ fechaEntrega: '', fechaDevolucionPrevista: '' });
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);

  useEffect(() => { fetchPrestamos(); fetchActivos({ page: 0, size: 100 }); fetchUsers(); }, [fetchPrestamos, fetchActivos, fetchUsers]);

  const paged = prestamos.slice((page - 1) * size, page * size);

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
        <Button
          onClick={() => setShowModal(true)}
          leftIcon={<Plus className="w-4 h-4" />}
          className="bg-gradient-to-r from-teal-600 to-emerald-600 shadow-teal-500/25 hover:shadow-teal-500/40"
        >
          Registrar Préstamo
        </Button>
      </div>

      <DataTable
        columns={[
          {
            key: 'activo',
            header: 'Activo',
            mobilePrimary: true,
            sortValue: (p) => p.activoNombre || '',
            render: (p) => (
              <div>
                <p className="font-bold text-slate-800 dark:text-slate-100">{p.activoNombre}</p>
                <p className="font-mono text-xs text-slate-400">{p.activoCodigo}</p>
              </div>
            ),
          },
          {
            key: 'solicitante',
            header: 'Solicitante',
            sortValue: (p) => p.solicitanteNombre || '',
            render: (p) => <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">{p.solicitanteNombre || '—'}</span>,
          },
          {
            key: 'estado',
            header: 'Estado',
            sortValue: (p) => PRESTAMO_LABELS[p.estado] || p.estado,
            render: (p) => (
              <span className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ring-1 ring-inset ${PRESTAMO_BADGE[p.estado] || ''}`}>
                {p.devolucionVencida && p.estado !== 'DEVUELTO' && <AlertTriangle className="w-3 h-3 text-red-500" />}
                {PRESTAMO_LABELS[p.estado] || p.estado}
              </span>
            ),
          },
          {
            key: 'entrega',
            header: 'Entrega',
            hideBelow: 'md',
            className: 'whitespace-nowrap',
            sortValue: (p) => (p.fechaEntrega ? new Date(p.fechaEntrega).getTime() : 0),
            render: (p) => <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{p.fechaEntrega ? new Date(p.fechaEntrega).toLocaleDateString('es-PE') : '—'}</span>,
          },
          {
            key: 'prevista',
            header: 'Devolución prevista',
            hideBelow: 'lg',
            className: 'whitespace-nowrap',
            sortValue: (p) => (p.fechaDevolucionPrevista ? new Date(p.fechaDevolucionPrevista).getTime() : 0),
            render: (p) => (
              <span className={`text-xs font-bold ${p.devolucionVencida && p.estado !== 'DEVUELTO' ? 'text-red-600 dark:text-red-400' : 'text-slate-600 dark:text-slate-300'}`}>
                {p.fechaDevolucionPrevista ? new Date(p.fechaDevolucionPrevista).toLocaleDateString('es-PE') : '—'}
              </span>
            ),
          },
          {
            key: 'real',
            header: 'Devolución real',
            hideBelow: 'lg',
            className: 'whitespace-nowrap',
            sortValue: (p) => (p.fechaDevolucionReal ? new Date(p.fechaDevolucionReal).getTime() : 0),
            render: (p) => <span className="text-xs font-semibold text-slate-500">{p.fechaDevolucionReal ? new Date(p.fechaDevolucionReal).toLocaleDateString('es-PE') : '—'}</span>,
          },
          {
            key: 'acciones',
            header: 'Acciones',
            align: 'right',
            mobile: false,
            render: (p) =>
              (p.estado === 'APROBADO' || p.estado === 'ENTREGADO') ? (
                <button onClick={() => setDevolverId(p.id)} title="Registrar devolución" className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20">
                  <Undo2 className="w-4 h-4" /> Devolver
                </button>
              ) : null,
          },
        ]}
        data={paged}
        rowKey={(p) => p.id}
        loading={prestamosLoading}
        emptyIcon={PackagePlus}
        emptyTitle="Sin préstamos registrados"
        emptyDescription="Registra el primer préstamo de un activo a un colaborador."
        caption="Listado de préstamos de activos"
        minWidth="960px"
        renderMobileCard={(p) => (
          <div className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold text-slate-800 dark:text-slate-100">{p.activoNombre}</p>
                <p className="font-mono text-xs text-slate-400">{p.activoCodigo}</p>
              </div>
              <span className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ring-1 ring-inset ${PRESTAMO_BADGE[p.estado] || ''}`}>
                {PRESTAMO_LABELS[p.estado] || p.estado}
              </span>
            </div>
            <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
              <p>Solicitante: <span className="font-semibold text-slate-700 dark:text-slate-200">{p.solicitanteNombre || '—'}</span></p>
              <p>Entrega: <span className="font-semibold">{p.fechaEntrega ? new Date(p.fechaEntrega).toLocaleDateString('es-PE') : '—'}</span></p>
              <p>Prevista: <span className={`font-semibold ${p.devolucionVencida && p.estado !== 'DEVUELTO' ? 'text-red-500' : ''}`}>{p.fechaDevolucionPrevista ? new Date(p.fechaDevolucionPrevista).toLocaleDateString('es-PE') : '—'}</span></p>
            </div>
            {(p.estado === 'APROBADO' || p.estado === 'ENTREGADO') && (
              <button onClick={() => setDevolverId(p.id)} className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20">
                <Undo2 className="w-4 h-4" /> Registrar devolución
              </button>
            )}
          </div>
        )}
      />

      <Pagination
        page={page}
        pageSize={size}
        total={prestamos.length}
        onPageChange={setPage}
        onPageSizeChange={(s) => { setSize(s); setPage(1); }}
        label="préstamos"
      />

      <FormModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Registrar Préstamo"
        subtitle="Presta un activo a un colaborador"
        icon={<PackagePlus className="w-5 h-5" />}
        theme="inventory"
        onSubmit={(e) => { e.preventDefault(); submit(); }}
        submitLabel="Registrar"
        loading={saving}
        maxWidth="max-w-lg"
      >
        <SectionTitle>Datos del préstamo</SectionTitle>
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
      </FormModal>

      <ConfirmDialog isOpen={!!devolverId} variant="success" title="¿Registrar devolución?" message="El activo quedará devuelto y disponible nuevamente." confirmText="Sí, devolver" onConfirm={doDevolver} onClose={() => setDevolverId(null)} />
    </div>
  );
}