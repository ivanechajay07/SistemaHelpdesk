import { useEffect, useState } from 'react';
import {
  useInventarioStore, MANTENIMIENTO_LABELS, MANTENIMIENTO_BADGE,
} from '../../store/inventoryStore';
import { useToast } from '../../components/ui/Toast';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import FormModal, { SectionTitle } from '../../components/ui/FormModal';
import Pagination from '../../components/ui/Pagination';
import { useUserStore } from '../../store/userStore';
import InventoryPageHeader from './InventoryPageHeader';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { drawCorporateHeader, drawSectionTitle, drawFooter, formatReportDate } from '../../lib/reportPdf';
import {
  Wrench, Plus, X, Loader2, Play, CheckCircle2, Eye, FileDown, ClipboardList,
} from 'lucide-react';

export default function Mantenimientos() {
  const toast = useToast();
  const { mantenimientos, mantenimientosLoading, fetchMantenimientos, crearMantenimiento, cambiarEstadoMantenimiento, activos, fetchActivos } = useInventarioStore();
  const { technicians, fetchTechnicians } = useUserStore();
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [detalle, setDetalle] = useState<any>(null);
  const [finalizarId, setFinalizarId] = useState<number | null>(null);
  const [iniciarId, setIniciarId] = useState<number | null>(null);
  const [informe, setInforme] = useState<{ trabajoRealizado: string; problemaEncontrado: string; repuestos: string; costo?: number; proximaRevision: string; observaciones: string }>({ trabajoRealizado: '', problemaEncontrado: '', repuestos: '', proximaRevision: '', observaciones: '' });
  const [form, setForm] = useState<{ activoId?: number; tipo: string; fecha: string; tecnicoId?: number; proveedor?: string; descripcion?: string; proximaRevision?: string; costo?: number }>({ tipo: 'PREVENTIVO', fecha: '' });
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);

  useEffect(() => { fetchMantenimientos(); fetchActivos({ page: 0, size: 100 }); fetchTechnicians(); }, [fetchMantenimientos, fetchActivos, fetchTechnicians]);

  const paged = mantenimientos.slice((page - 1) * size, page * size);

  const submit = async () => {
    if (!form.activoId || !form.fecha) { toast({ variant: 'error', title: 'Campos requeridos', message: 'Selecciona activo y fecha' }); return; }
    setSaving(true);
    try {
      await crearMantenimiento({ ...form, estado: 'PROGRAMADO', tecnicoId: form.tecnicoId || undefined, proveedor: form.proveedor || undefined, descripcion: form.descripcion || undefined, fecha: form.fecha || undefined, proximaRevision: form.proximaRevision || undefined, costo: form.costo });
      toast({ variant: 'success', title: 'Mantenimiento registrado' });
      setShowModal(false); setForm({ tipo: 'PREVENTIVO', fecha: '' });
      fetchMantenimientos();
    } catch (e: any) { toast({ variant: 'error', title: 'Error', message: e.message }); }
    setSaving(false);
  };

  const doIniciar = async () => {
    if (!iniciarId) return;
    setSaving(true);
    try { await cambiarEstadoMantenimiento(iniciarId, 'EN_PROCESO'); toast({ variant: 'success', title: 'Mantenimiento en proceso' }); setIniciarId(null); fetchMantenimientos(); } catch (e: any) { toast({ variant: 'error', title: 'Error', message: e.message }); }
    setSaving(false);
  };

  const doFinalizar = async () => {
    if (!finalizarId) return;
    if (!informe.trabajoRealizado.trim()) { toast({ variant: 'error', title: 'Informe incompleto', message: 'Describe el trabajo realizado antes de finalizar' }); return; }
    setSaving(true);
    try {
      await cambiarEstadoMantenimiento(finalizarId, 'FINALIZADO', {
        trabajoRealizado: informe.trabajoRealizado.trim(),
        problemaEncontrado: informe.problemaEncontrado.trim() || undefined,
        repuestos: informe.repuestos.trim() || undefined,
        costo: informe.costo,
        proximaRevision: informe.proximaRevision || undefined,
        observaciones: informe.observaciones.trim() || undefined,
      });
      toast({ variant: 'success', title: 'Mantenimiento finalizado', message: 'Se guardó el informe de lo realizado.' });
      setFinalizarId(null);
      setInforme({ trabajoRealizado: '', problemaEncontrado: '', repuestos: '', proximaRevision: '', observaciones: '' });
      fetchMantenimientos();
    } catch (e: any) { toast({ variant: 'error', title: 'Error', message: e.message }); }
    setSaving(false);
  };

  /** Genera el PDF con el informe del mantenimiento (lo realizado). */
  const exportInformePdf = (m: any) => {
    try {
      const doc = new jsPDF({ orientation: 'portrait' });
      const dateStr = formatReportDate();
      const pageWidth = doc.internal.pageSize.getWidth();

      let y = drawCorporateHeader(doc, {
        title: 'INFORME DE MANTENIMIENTO',
        subtitle: `${m.activoCodigo} — ${m.activoNombre}`,
        meta: `Generado: ${dateStr}`,
        bandHeight: 26,
      });
      y += 2;

      y = drawSectionTitle(doc, 'Datos generales', y);
      autoTable(doc, {
        startY: y,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 2.5, textColor: [30, 41, 59] },
        headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: 'bold' },
        body: [
          ['Tipo', m.tipo === 'PREVENTIVO' ? 'Preventivo' : 'Correctivo', 'Estado', MANTENIMIENTO_LABELS[m.estado] || m.estado],
          ['Fecha', m.fecha || '—', 'Técnico', m.tecnicoNombre || '—'],
          ['Proveedor', m.proveedor || '—', 'Próxima revisión', m.proximaRevision || '—'],
        ],
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 34 }, 2: { fontStyle: 'bold', cellWidth: 34 } },
      });
      y = (doc as any).lastAutoTable.finalY + 8;

      y = drawSectionTitle(doc, 'Informe de lo realizado', y);
      autoTable(doc, {
        startY: y,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 2.5, textColor: [30, 41, 59] },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 44, fillColor: [241, 245, 249] } },
        body: [
          ['Descripción / alcance', m.descripcion || '—'],
          ['Problema encontrado', m.problemaEncontrado || '—'],
          ['Trabajo realizado', m.trabajoRealizado || '—'],
          ['Repuestos utilizados', m.repuestos || '—'],
          ['Costo', m.costo != null ? `S/ ${m.costo}` : '—'],
          ['Observaciones', m.observaciones || '—'],
        ],
      });
      y = (doc as any).lastAutoTable.finalY + 16;

      // Firmas
      doc.setDrawColor(203, 213, 225);
      doc.line(20, y, 85, y);
      doc.line(pageWidth - 85, y, pageWidth - 20, y);
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('Técnico responsable', 52.5, y + 5, { align: 'center' });
      doc.text('Supervisor / Administrador', pageWidth - 52.5, y + 5, { align: 'center' });

      drawFooter(doc, dateStr);
      doc.save(`Informe_Mantenimiento_${m.activoCodigo || m.id}.pdf`);
      toast({ variant: 'success', title: 'Informe generado', message: 'El PDF del mantenimiento se descargó.' });
    } catch (e) {
      console.error(e);
      toast({ variant: 'error', title: 'Error', message: 'No se pudo generar el informe' });
    }
  };

  const inputCls = 'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-shadow';

  return (
    <div className="space-y-6">
      <InventoryPageHeader icon={Wrench} eyebrow="Inventario" title="Mantenimientos" subtitle="Gestión de mantenimientos preventivos y correctivos de los activos, con estados y seguimiento de técnicos." gradient="from-cyan-600 via-teal-600 to-emerald-700" />

      <div className="flex justify-end">
        <button onClick={() => setShowModal(true)} className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 text-white text-sm font-bold shadow-lg shadow-teal-500/25 hover:shadow-xl hover:-translate-y-0.5 transition-all active:scale-95"><Plus className="w-4 h-4" /> Registrar Mantenimiento</button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 text-left text-[11px] uppercase tracking-wider font-black text-slate-500 dark:text-slate-400">
                <th className="px-4 py-3.5">Tipo</th>
                <th className="px-4 py-3.5">Activo</th>
                <th className="px-4 py-3.5">Estado</th>
                <th className="px-4 py-3.5 hidden md:table-cell">Fecha</th>
                <th className="px-4 py-3.5 hidden lg:table-cell">Técnico</th>
                <th className="px-4 py-3.5 hidden xl:table-cell">Próxima revisión</th>
                <th className="px-4 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {mantenimientosLoading && mantenimientos.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-16"><div className="flex items-center justify-center gap-3 text-slate-400"><Loader2 className="w-5 h-5 animate-spin" /> Cargando...</div></td></tr>
              ) : mantenimientos.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-16"><div className="flex flex-col items-center gap-2 text-slate-300 dark:text-slate-600"><Wrench className="w-10 h-10" /><p className="text-sm font-medium text-slate-400">Sin mantenimientos registrados</p></div></td></tr>
              ) : paged.map((m) => (
                <tr key={m.id} className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide ring-1 ring-inset ${m.tipo === 'PREVENTIVO' ? 'bg-blue-50 text-blue-700 ring-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400' : 'bg-orange-50 text-orange-700 ring-orange-500/20 dark:bg-orange-500/10 dark:text-orange-400'}`}>{m.tipo === 'PREVENTIVO' ? 'Preventivo' : 'Correctivo'}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="font-bold text-slate-800 dark:text-slate-100">{m.activoNombre}</p>
                    <p className="font-mono text-xs text-slate-400">{m.activoCodigo}</p>
                  </td>
                  <td className="px-4 py-3.5"><span className={`inline-flex px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide ring-1 ring-inset ${MANTENIMIENTO_BADGE[m.estado] || ''}`}>{MANTENIMIENTO_LABELS[m.estado] || m.estado}</span></td>
                  <td className="px-4 py-3.5 hidden md:table-cell text-xs font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">{m.fecha ? new Date(m.fecha).toLocaleDateString('es-PE') : '—'}</td>
                  <td className="px-4 py-3.5 hidden lg:table-cell text-xs font-semibold text-slate-500">{m.tecnicoNombre || m.proveedor || '—'}</td>
                  <td className="px-4 py-3.5 hidden xl:table-cell text-xs font-semibold text-slate-500">{m.proximaRevision || '—'}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-end gap-1.5">
                      <button onClick={() => setDetalle(m)} title="Ver detalle" className="p-2 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-500/10 transition-colors"><Eye className="w-4 h-4" /></button>
                      {m.estado === 'PROGRAMADO' && <button onClick={() => setIniciarId(m.id)} title="Iniciar" className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"><Play className="w-4 h-4" /></button>}
                      {m.estado === 'EN_PROCESO' && <button onClick={() => { setInforme({ trabajoRealizado: '', problemaEncontrado: '', repuestos: '', proximaRevision: '', observaciones: '' }); setFinalizarId(m.id); }} title="Finalizar y registrar informe" className="p-2 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors"><CheckCircle2 className="w-4 h-4" /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination
        page={page}
        pageSize={size}
        total={mantenimientos.length}
        onPageChange={setPage}
        onPageSizeChange={(s) => { setSize(s); setPage(1); }}
        label="mantenimientos"
      />

      <FormModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Registrar Mantenimiento"
        subtitle="Programa el mantenimiento de un activo"
        icon={<Wrench className="w-5 h-5" />}
        theme="inventory"
        onSubmit={(e) => { e.preventDefault(); submit(); }}
        submitLabel="Registrar"
        loading={saving}
        maxWidth="max-w-lg"
      >
        <SectionTitle>Datos del mantenimiento</SectionTitle>
              <label className="block"><span className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Activo *</span>
                <select value={form.activoId ?? ''} onChange={(e) => setForm({ ...form, activoId: Number(e.target.value) || undefined })} className={inputCls}>
                  <option value="">Seleccionar activo</option>
                  {activos.filter((a: any) => a.estado !== 'DADO_DE_BAJA').map((a) => <option key={a.id} value={a.id}>{a.codigo} — {a.nombre}</option>)}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block"><span className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Tipo *</span>
                  <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} className={inputCls}>
                    <option value="PREVENTIVO">Preventivo</option>
                    <option value="CORRECTIVO">Correctivo</option>
                  </select>
                </label>
                <label className="block"><span className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Fecha *</span>
                  <input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} className={inputCls} />
                </label>
              </div>
              <label className="block"><span className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Técnico</span>
                <select value={form.tecnicoId ?? ''} onChange={(e) => setForm({ ...form, tecnicoId: Number(e.target.value) || undefined })} className={inputCls}>
                  <option value="">Sin asignar</option>
                  {technicians.map((t) => <option key={t.id} value={t.id}>{t.nombre} {t.apellidos}</option>)}
                </select>
              </label>
              <label className="block"><span className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Proveedor</span>
                <input value={form.proveedor || ''} onChange={(e) => setForm({ ...form, proveedor: e.target.value })} className={inputCls} placeholder="Empresa proveedora" />
              </label>
              <label className="block"><span className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Descripción / alcance</span>
                <textarea value={form.descripcion || ''} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} rows={2} className={inputCls} placeholder="Describir el mantenimiento" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block"><span className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Próxima revisión</span>
                  <input type="date" value={form.proximaRevision || ''} onChange={(e) => setForm({ ...form, proximaRevision: e.target.value })} className={inputCls} />
                </label>
                <label className="block"><span className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Costo (S/)</span>
                  <input type="number" value={form.costo ?? ''} onChange={(e) => setForm({ ...form, costo: e.target.value === '' ? undefined : Number(e.target.value) })} className={inputCls} />
                </label>
              </div>
      </FormModal>

      {detalle && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-3 anim-fade-in">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden anim-scale-in">
            <div className="h-1.5 w-full bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500" />
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-teal-100 dark:bg-teal-500/15 flex items-center justify-center shrink-0">
                  <ClipboardList className="w-[18px] h-[18px] text-teal-600 dark:text-teal-400" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-white leading-tight">Informe de Mantenimiento</h3>
                  <p className="text-xs text-slate-400 font-medium truncate">{detalle.activoCodigo} — {detalle.activoNombre}</p>
                </div>
              </div>
              <button onClick={() => setDetalle(null)} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Tipo', value: detalle.tipo === 'PREVENTIVO' ? 'Preventivo' : 'Correctivo' },
                  { label: 'Estado', value: MANTENIMIENTO_LABELS[detalle.estado] || detalle.estado },
                  { label: 'Fecha', value: detalle.fecha || '—' },
                  { label: 'Técnico', value: detalle.tecnicoNombre || '—' },
                  { label: 'Proveedor', value: detalle.proveedor || '—' },
                  { label: 'Próxima revisión', value: detalle.proximaRevision || '—' },
                ].map((it) => (
                  <div key={it.label} className="rounded-xl bg-slate-50 dark:bg-slate-800/50 px-3 py-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{it.label}</p>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{it.value}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
                  <p className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5"><ClipboardList className="w-3.5 h-3.5" /> Informe de lo realizado</p>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {[
                    { label: 'Descripción / alcance', value: detalle.descripcion },
                    { label: 'Problema encontrado', value: detalle.problemaEncontrado },
                    { label: 'Trabajo realizado', value: detalle.trabajoRealizado },
                    { label: 'Repuestos utilizados', value: detalle.repuestos },
                    { label: 'Costo', value: detalle.costo != null ? `S/ ${detalle.costo}` : null },
                    { label: 'Observaciones', value: detalle.observaciones },
                  ].map((it) => (
                    <div key={it.label} className="px-4 py-2.5">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">{it.label}</p>
                      <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap break-words">{it.value || '—'}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-between gap-2">
              <button onClick={() => exportInformePdf(detalle)} className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-rose-500 to-red-600 rounded-xl shadow-lg shadow-rose-500/25 hover:-translate-y-0.5 active:scale-95 transition-all"><FileDown className="w-4 h-4" /> Descargar informe</button>
              <button onClick={() => setDetalle(null)} className="px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-teal-600 to-emerald-600 rounded-xl shadow-lg shadow-teal-500/25 active:scale-95 transition-all">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Informe de cierre: se registra al finalizar el mantenimiento */}
      <FormModal
        isOpen={!!finalizarId}
        onClose={() => setFinalizarId(null)}
        title="Informe de mantenimiento"
        subtitle="Registra lo que se realizó antes de finalizar"
        icon={<ClipboardList className="w-5 h-5" />}
        theme="inventory"
        onSubmit={(e) => { e.preventDefault(); doFinalizar(); }}
        submitLabel="Finalizar y guardar informe"
        loading={saving}
        maxWidth="max-w-lg"
      >
        <SectionTitle>Informe de lo realizado</SectionTitle>
        <label className="block"><span className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Trabajo realizado *</span>
          <textarea value={informe.trabajoRealizado} onChange={(e) => setInforme({ ...informe, trabajoRealizado: e.target.value })} rows={3} className={inputCls} placeholder="Describe el trabajo realizado (reparación, limpieza, cambio de piezas...)" />
        </label>
        <label className="block"><span className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Problema encontrado</span>
          <textarea value={informe.problemaEncontrado} onChange={(e) => setInforme({ ...informe, problemaEncontrado: e.target.value })} rows={2} className={inputCls} placeholder="Diagnóstico / problema detectado" />
        </label>
        <label className="block"><span className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Repuestos utilizados</span>
          <input value={informe.repuestos} onChange={(e) => setInforme({ ...informe, repuestos: e.target.value })} className={inputCls} placeholder="Repuestos / materiales usados" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block"><span className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Costo (S/)</span>
            <input type="number" value={informe.costo ?? ''} onChange={(e) => setInforme({ ...informe, costo: e.target.value === '' ? undefined : Number(e.target.value) })} className={inputCls} />
          </label>
          <label className="block"><span className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Próxima revisión</span>
            <input type="date" value={informe.proximaRevision} onChange={(e) => setInforme({ ...informe, proximaRevision: e.target.value })} className={inputCls} />
          </label>
        </div>
        <label className="block"><span className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Observaciones</span>
          <textarea value={informe.observaciones} onChange={(e) => setInforme({ ...informe, observaciones: e.target.value })} rows={2} className={inputCls} placeholder="Observaciones adicionales" />
        </label>
      </FormModal>

      <ConfirmDialog isOpen={!!iniciarId} variant="info" title="¿Iniciar mantenimiento?" message="El mantenimiento pasará a estado 'En Proceso' y el activo a 'En Mantenimiento'." confirmText="Sí, iniciar" onConfirm={doIniciar} onClose={() => setIniciarId(null)} />
    </div>
  );
}