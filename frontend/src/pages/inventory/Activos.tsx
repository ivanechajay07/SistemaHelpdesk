import React, { useEffect, useState } from 'react';
import {
  useInventarioStore, ESTADO_LABELS, ESTADO_LABELS as EL,
  ESTADO_BADGE as EB,
} from '../../store/inventoryStore';
import { useCatalogStore } from '../../store/catalogStore';
import { useUserStore } from '../../store/userStore';
import { useAuthStore } from '../../store/authStore';
import { useToast } from '../../components/ui/Toast';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Pagination from '../../components/ui/Pagination';
import InventoryPageHeader from './InventoryPageHeader';
import {
  Boxes, Plus, Search, Pencil, Trash2, Download, FileSpreadsheet, QrCode,
  Eye, X, Loader2, AlertTriangle, Package, ArrowLeft,
  User, MapPin, Building2, Tag, CircleDollarSign, CalendarDays, Cpu,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import * as XLSX from 'xlsx-js-style';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { drawCorporateHeader, drawSectionTitle, drawFooter, drawKpiCards, formatReportDate } from '../../lib/reportPdf';
import { mergeRow, styleRow, setCols, downloadWorkbook, exTitle, exSubtitle, exHeader, exData, exDataAlt } from '../../lib/reportExcel';

function Badge({ estado }: { estado: string }) {
  if (!estado) return null;
  return <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide ring-1 ring-inset ${EB[estado] || 'bg-slate-100 text-slate-600 ring-slate-500/20 dark:bg-slate-500/10 dark:text-slate-400'}`}>{EL[estado] || estado}</span>;
}

const estadoOptions = Object.entries(ESTADO_LABELS).map(([v, l]) => ({ value: v, label: l }));

interface ActivoForm {
  codigo: string; nombre: string; marca: string; modelo: string; numeroSerie: string; codigoPatrimonial: string;
  categoriaId?: number; sedeId?: number; area: string; ubicacionFisica: string;
  responsableId?: number; cargoResponsable: string; numeroFactura: string; proveedor: string;
  fechaCompra: string; costo?: number; moneda: string; tieneGarantia: boolean; garantiaVencimiento: string;
  estado: string;
}

const emptyForm: ActivoForm = {
  codigo: '', nombre: '', marca: '', modelo: '', numeroSerie: '', codigoPatrimonial: '',
  categoriaId: undefined, sedeId: undefined, area: '', ubicacionFisica: '',
  responsableId: undefined, cargoResponsable: '', numeroFactura: '', proveedor: '',
  fechaCompra: '', costo: undefined, moneda: 'PEN', tieneGarantia: false, garantiaVencimiento: '',
  estado: 'OPERATIVO',
};

export default function Activos() {
  const toast = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [permissions, setPermissions] = useState<string[]>([]);

  useEffect(() => {
    const a = useAuthStore.getState() as any;
    setPermissions(a.permissions || []);
    setIsAdmin(Boolean(a.isAdmin && a.isAdmin()));
  }, []);

  const { activos, activoTotal, activoTotalPages, activoLoading, fetchActivos, fetchActivo, crearActivo, actualizarActivo, eliminarActivo, darDeBajaActivo, generarQr, activoDetalle } = useInventarioStore();
  const { sedes, fetchSedes } = useCatalogStore();
  const { users, fetchUsers } = useUserStore();
  const { categorias, fetchCategorias } = useInventarioStore();

  const [filters, setFilters] = useState({ estado: '', sedeId: '', q: '' });
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const totalPages = activoTotalPages;

  const [modal, setModal] = useState<null | { mode: 'create' | 'edit'; id?: number }>(null);
  const [form, setForm] = useState<ActivoForm>(emptyForm);
  const [detalleId, setDetalleId] = useState<number | null>(null);
  const [bajaId, setBajaId] = useState<number | null>(null);
  const [eliminarId, setEliminarId] = useState<number | null>(null);
  const [qrPreview, setQrPreview] = useState<{ id: number; token: string; codigo: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [specs, setSpecs] = useState<Record<string, string>>({});
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null);

  const canCreate = isAdmin || permissions.includes('INV_CREATE');

  useEffect(() => {
    fetchActivos({ page, size, ...filters, sedeId: filters.sedeId || undefined, estado: filters.estado || undefined, q: filters.q || undefined });
  }, [page, size, filters, fetchActivos]);

  useEffect(() => { fetchSedes(); fetchUsers(); fetchCategorias(); }, [fetchSedes, fetchUsers, fetchCategorias]);

  const openCreate = () => {
    setForm(emptyForm); setSpecs({}); fetchCategorias(); setModal({ mode: 'create' });
  };
  const openEdit = async (id: number) => {
    setSaving(true);
    const a = await fetchActivo(id);
    if (a) {
      setForm({
        codigo: a.codigo || '', nombre: a.nombre || '', marca: a.marca || '', modelo: a.modelo || '', numeroSerie: a.numeroSerie || '',
        codigoPatrimonial: a.codigoPatrimonial || '', categoriaId: a.categoriaId, sedeId: a.sedeId,
        area: a.area || '', ubicacionFisica: a.ubicacionFisica || '', responsableId: a.responsableId,
        cargoResponsable: a.cargoResponsable || '', numeroFactura: a.numeroFactura || '', proveedor: a.proveedor || '',
        fechaCompra: a.fechaCompra || '', costo: a.costo, moneda: a.moneda || 'PEN',
        tieneGarantia: a.tieneGarantia ?? false, garantiaVencimiento: a.garantiaVencimiento || '',
        estado: a.estado || 'OPERATIVO',
      });
      setSpecs(a.especificaciones || {});
      setModal({ mode: 'edit', id });
    }
    setSaving(false);
  };

  const openDetalle = async (id: number) => { setDetalleId(id); fetchActivo(id); };

  const submit = async () => {
    if (!form.codigo || !form.nombre || !form.categoriaId) {
      toast({ variant: 'error', title: 'Campos requeridos', message: 'Código, nombre y categoría son obligatorios' });
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, estado: form.estado, fechaCompra: form.fechaCompra || undefined, garantiaVencimiento: form.tieneGarantia ? (form.garantiaVencimiento || undefined) : undefined, especificaciones: specs };
      if (modal?.mode === 'edit' && modal.id) {
        await actualizarActivo(modal.id, payload);
        toast({ variant: 'success', title: 'Activo actualizado' });
      } else {
        await crearActivo(payload);
        toast({ variant: 'success', title: 'Activo registrado' });
      }
      setModal(null);
      fetchActivos({ page, size, ...filters });
      if (detalleId) fetchActivo(detalleId);
    } catch (e: any) {
      toast({ variant: 'error', title: 'Error', message: e.message });
    }
    setSaving(false);
  };

  const confirmBaja = async () => {
    if (!bajaId) return;
    setSaving(true);
    try { await darDeBajaActivo(bajaId); toast({ variant: 'success', title: 'Activo dado de baja' }); setBajaId(null); fetchActivos({ page, size }); } catch (e: any) { toast({ variant: 'error', title: 'Error', message: e.message }); }
    setSaving(false);
  };

  const confirmEliminar = async () => {
    if (!eliminarId) return;
    setSaving(true);
    try { await eliminarActivo(eliminarId); toast({ variant: 'success', title: 'Activo eliminado' }); setEliminarId(null); fetchActivos({ page, size }); } catch (e: any) { toast({ variant: 'error', title: 'Error', message: e.message }); }
    setSaving(false);
  };

  const handleQr = async (id: number, codigo: string) => {
    try { const t = await generarQr(id); setQrPreview({ id, token: t || '', codigo }); } catch (e: any) { toast({ variant: 'error', title: 'Error QR', message: e.message }); }
  };

  const loadAllActivos = async () => {
    await fetchActivos({ page: 0, size: 5000, ...filters, sedeId: filters.sedeId || undefined, estado: filters.estado || undefined, q: filters.q || undefined });
    return useInventarioStore.getState().activos;
  };

  const exportPdf = async () => {
    setExporting('pdf');
    try {
      const list = await loadAllActivos();
      const dateStr = formatReportDate();
      const doc = new jsPDF({ orientation: 'landscape' });
      const pageHeight = doc.internal.pageSize.getHeight();
      const M = 14;

      let y = drawCorporateHeader(doc, {
        title: 'INVENTARIO DE ACTIVOS',
        subtitle: 'Registro y control de activos del sistema',
        meta: `Generado: ${dateStr} · Total: ${list.length}`,
        bandHeight: 26,
      });
      y += 2;

      y = drawKpiCards(doc, [
        { label: 'Total activos', value: String(list.length) },
        { label: 'Operativos', value: String(list.filter((a) => a.estado === 'OPERATIVO').length) },
        { label: 'En mantenimiento', value: String(list.filter((a) => a.estado === 'EN_MANTENIMIENTO' || a.estado === 'EN_REPARACION').length) },
        { label: 'Dados de baja', value: String(list.filter((a) => a.estado === 'DADO_DE_BAJA').length) },
      ], y);
      y += 8;

      if (y + 20 > pageHeight - 22) {
        doc.addPage();
        y = 14;
      }
      y = drawSectionTitle(doc, 'Listado de Activos', y);
      autoTable(doc, {
        startY: y,
        head: [['Código', 'Nombre', 'Categoría', 'Estado', 'Sede', 'Responsable', 'Marca', 'Modelo', 'Serie']],
        body: list.map((a) => [a.codigo, a.nombre, a.categoriaNombre || '—', ESTADO_LABELS[a.estado] || a.estado, a.sedeNombre || '—', a.responsableNombre || '—', a.marca || '—', a.modelo || '—', a.numeroSerie || '—']),
        styles: { fontSize: 7.5, cellPadding: 1.8 },
        headStyles: { fillColor: [30, 58, 138], fontSize: 7.5, fontStyle: 'bold', halign: 'center' },
        alternateRowStyles: { fillColor: [241, 245, 249] },
        margin: { left: M, right: M },
      });

      drawFooter(doc, `Inventario de activos · ${dateStr}`);
      doc.save(`Inventario_Activos_${new Date().toISOString().slice(0, 10)}.pdf`);
      toast({ variant: 'success', title: 'PDF generado', message: `Se exportaron ${list.length} activos` });
    } catch (e) {
      console.error(e);
      toast({ variant: 'error', title: 'Error', message: 'No se pudo generar el PDF de activos' });
    }
    setExporting(null);
  };

  const exportExcel = async () => {
    setExporting('excel');
    try {
      const list = await loadAllActivos();
      const now = new Date();
      const dateStr = now.toLocaleString('es-PE', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      const wb = XLSX.utils.book_new();

      // ===== Resumen =====
      const resumenRows: (string | number)[][] = [
        ['INVENTARIO DE ACTIVOS'],
        [`Generado: ${dateStr}`],
        [''],
        ['Métrica', 'Valor'],
        ['Total activos', list.length],
        ['Operativos', list.filter((a) => a.estado === 'OPERATIVO').length],
        ['En mantenimiento', list.filter((a) => a.estado === 'EN_MANTENIMIENTO' || a.estado === 'EN_REPARACION').length],
        ['Dados de baja', list.filter((a) => a.estado === 'DADO_DE_BAJA').length],
      ];
      const wsResumen = XLSX.utils.aoa_to_sheet(resumenRows);
      mergeRow(wsResumen, 0, 0, 1, 'INVENTARIO DE ACTIVOS', exTitle);
      mergeRow(wsResumen, 1, 0, 1, `Generado: ${dateStr}`, exSubtitle);
      styleRow(wsResumen, 3, 2, exHeader);
      for (let i = 4; i <= 7; i++) styleRow(wsResumen, i, 2, i % 2 === 0 ? exData : exDataAlt);
      setCols(wsResumen, [32, 22]);
      XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

      // ===== Activos =====
      const headers = ['Código', 'Nombre', 'Categoría', 'Estado', 'Marca', 'Modelo', 'Serie', 'Sede', 'Responsable', 'Área'];
      const aoa: (string | number)[][] = [
        ['ACTIVOS'],
        [`Generado: ${dateStr}`],
        [''],
        headers,
        ...list.map((a) => [a.codigo, a.nombre, a.categoriaNombre || '', ESTADO_LABELS[a.estado] || a.estado, a.marca || '', a.modelo || '', a.numeroSerie || '', a.sedeNombre || '', a.responsableNombre || '', a.area || '']),
      ];
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      const ncols = headers.length;
      mergeRow(ws, 0, 0, ncols - 1, 'ACTIVOS', exTitle);
      mergeRow(ws, 1, 0, ncols - 1, `Generado: ${dateStr}`, exSubtitle);
      styleRow(ws, 3, ncols, exHeader);
      list.forEach((_, i) => styleRow(ws, 4 + i, ncols, i % 2 === 0 ? exData : exDataAlt));
      setCols(ws, [12, 28, 16, 14, 14, 14, 16, 22, 20, 14]);
      XLSX.utils.book_append_sheet(wb, ws, 'Activos');

      downloadWorkbook(wb, `Inventario_Activos_${now.toISOString().slice(0, 10)}.xlsx`);
      toast({ variant: 'success', title: 'Excel generado', message: `Se exportaron ${list.length} activos` });
    } catch (e) {
      console.error(e);
      toast({ variant: 'error', title: 'Error', message: 'No se pudo generar el Excel de activos' });
    }
    setExporting(null);
  };

  const setF = (k: keyof typeof filters, v: string) => { setFilters((p) => ({ ...p, [k]: v })); setPage(0); };

  return (
    <div className="space-y-6">
      <InventoryPageHeader icon={Boxes} eyebrow="Inventario" title="Gestión de Activos" subtitle="Registro, seguimiento y control de los activos del sistema, con estados, responsables y garantías." gradient="from-cyan-600 via-teal-600 to-emerald-700" />

      {/* toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={filters.q} onChange={(e) => setF('q', e.target.value)} placeholder="Buscar por código, nombre, serie..." className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/60 focus:border-teal-500 transition-shadow" />
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <select value={filters.estado} onChange={(e) => setF('estado', e.target.value)} className="h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/60 cursor-pointer">
            <option value="">Todos los estados</option>
            {estadoOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={filters.sedeId} onChange={(e) => setF('sedeId', e.target.value)} className="h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/60 cursor-pointer">
            <option value="">Todas las sedes</option>
            {sedes.map((s) => <option key={s.id} value={s.id}>{s.nombre} — {s.entidadNombre}</option>)}
          </select>
          <button onClick={exportExcel} disabled={exporting !== null} className="inline-flex items-center gap-2 h-11 px-4 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/20 text-sm font-bold transition-colors disabled:opacity-50">{exporting === 'excel' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />} Excel</button>
          <button onClick={exportPdf} disabled={exporting !== null} className="inline-flex items-center gap-2 h-11 px-4 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20 border border-rose-200 dark:border-rose-500/20 text-sm font-bold transition-colors disabled:opacity-50">{exporting === 'pdf' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} PDF</button>
          {canCreate && (
            <button onClick={openCreate} className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 text-white text-sm font-bold shadow-lg shadow-teal-500/25 hover:shadow-xl hover:shadow-teal-500/30 transition-all hover:-translate-y-0.5 active:scale-95"><Plus className="w-4 h-4" /> Nuevo Activo</button>
          )}
        </div>
      </div>

      {/* table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 text-left text-[11px] uppercase tracking-wider font-black text-slate-500 dark:text-slate-400">
                <th className="px-4 py-3.5">Código</th>
                <th className="px-4 py-3.5">Activo</th>
                <th className="px-4 py-3.5">Estado</th>
                <th className="px-4 py-3.5 hidden md:table-cell">Sede</th>
                <th className="px-4 py-3.5 hidden lg:table-cell">Responsable</th>
                <th className="px-4 py-3.5 hidden xl:table-cell">Serie</th>
                <th className="px-4 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {(activoLoading && activos.length === 0) ? (
                <tr><td colSpan={7} className="px-4 py-16"><div className="flex items-center justify-center gap-3 text-slate-400"><Loader2 className="w-5 h-5 animate-spin" /> Cargando activos...</div></td></tr>
              ) : activos.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-16"><div className="flex flex-col items-center justify-center gap-2 text-slate-300 dark:text-slate-600"><Package className="w-10 h-10" /><p className="text-sm font-medium text-slate-400">No se encontraron activos</p></div></td></tr>
              ) : activos.map((a) => (
                <tr key={a.id} className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3.5"><button onClick={() => openDetalle(a.id)} className="inline-flex items-center gap-1.5 font-bold text-teal-600 dark:text-teal-400 hover:underline"><Tag className="w-3.5 h-3.5" />{a.codigo}</button></td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center shrink-0"><Package className="w-4 h-4 text-white" /></div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 dark:text-slate-100 truncate max-w-[200px]">{a.nombre}</p>
                        <p className="text-xs text-slate-400">{a.categoriaNombre || '—'}{a.marca ? ` · ${a.marca} ${a.modelo || ''}` : ''}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5"><Badge estado={a.estado} /></td>
                  <td className="px-4 py-3.5 hidden md:table-cell"><span className="text-slate-600 dark:text-slate-300 text-xs font-semibold">{a.sedeNombre || '—'}</span></td>
                  <td className="px-4 py-3.5 hidden lg:table-cell"><span className="text-slate-600 dark:text-slate-300 text-xs font-semibold">{a.responsableNombre || 'Sin asignar'}</span></td>
                  <td className="px-4 py-3.5 hidden xl:table-cell"><span className="font-mono text-xs text-slate-500">{a.numeroSerie || '—'}</span></td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-end gap-1.5">
                      <button onClick={() => openDetalle(a.id)} title="Ver detalle" className="p-2 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-500/10 transition-colors"><Eye className="w-4 h-4" /></button>
                      <button onClick={() => handleQr(a.id, a.codigo)} title="Ver QR" className="p-2 rounded-lg text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-500/10 transition-colors"><QrCode className="w-4 h-4" /></button>
                      {isAdmin && (
                        <>
                          <button onClick={() => openEdit(a.id)} title="Editar" className="p-2 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors"><Pencil className="w-4 h-4" /></button>
                          <button onClick={() => setBajaId(a.id)} title="Dar de baja" className="p-2 rounded-lg text-slate-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-colors"><AlertTriangle className="w-4 h-4" /></button>
                          <button onClick={() => setEliminarId(a.id)} title="Eliminar" className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page + 1} pageSize={size} total={activoTotal} totalPages={totalPages} onPageChange={(p) => setPage(p - 1)} onPageSizeChange={(s) => { setSize(s); setPage(0); }} label="activos" />
      </div>

      {/* MODAL CREAR/EDITAR */}
      {modal && (
        <div className="fixed inset-0 z-[90] flex items-start sm:items-center justify-center bg-slate-900/70 backdrop-blur-md p-3 anim-fade-in overflow-y-auto">
          <div className="my-auto relative w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden anim-scale-in">
            <div className="h-1.5 w-full bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500" />
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">{modal.mode === 'edit' ? 'Editar Activo' : 'Registrar Nuevo Activo'}</h3>
                <p className="text-xs text-slate-400 font-medium">Completa la información del activo</p>
              </div>
              <button onClick={() => setModal(null)} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="w-5 h-5" /></button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-6">
              <Field label="Código *">
                <input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value.toUpperCase() })} className={inputCls} placeholder="Ej. ACT-0001" disabled={modal.mode === 'edit'} />
              </Field>
              <Field label="Estado *">
                <select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })} className={inputCls}>
                  {estadoOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </Field>
              <div className="sm:col-span-2"><Field label="Nombre del activo *"><input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className={inputCls} placeholder="Ej. Laptop Lenovo ThinkPad" /></Field></div>
              <Field label="Categoría *">
                <select value={form.categoriaId ?? ''} onChange={(e) => setForm({ ...form, categoriaId: Number(e.target.value) || undefined })} className={inputCls}>
                  <option value="">Seleccionar categoría</option>
                  {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </Field>
              <Field label="Sede">
                <select value={form.sedeId ?? ''} onChange={(e) => setForm({ ...form, sedeId: Number(e.target.value) || undefined })} className={inputCls}>
                  <option value="">Seleccionar sede</option>
                  {sedes.map((s) => <option key={s.id} value={s.id}>{s.nombre} — {s.entidadNombre}</option>)}
                </select>
              </Field>
              <Field label="Marca"><input value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} className={inputCls} /></Field>
              <Field label="Modelo"><input value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} className={inputCls} /></Field>
              <Field label="Número de serie"><input value={form.numeroSerie} onChange={(e) => setForm({ ...form, numeroSerie: e.target.value })} className={inputCls} /></Field>
              <Field label="Código patrimonial"><input value={form.codigoPatrimonial} onChange={(e) => setForm({ ...form, codigoPatrimonial: e.target.value })} className={inputCls} /></Field>
              <Field label="Área / Dependencia"><input value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} className={inputCls} /></Field>
              <Field label="Ubicación física"><input value={form.ubicacionFisica} onChange={(e) => setForm({ ...form, ubicacionFisica: e.target.value })} className={inputCls} /></Field>
              <Field label="Responsable">
                <select value={form.responsableId ?? ''} onChange={(e) => setForm({ ...form, responsableId: Number(e.target.value) || undefined })} className={inputCls}>
                  <option value="">Sin asignar</option>
                  {users.filter((u) => u.roles?.some((r) => ['TECNICO', 'SUPERVISOR', 'ADMIN'].includes(r.toUpperCase()))).map((u) => <option key={u.id} value={u.id}>{u.nombre} {u.apellidos}</option>)}
                </select>
              </Field>
              <Field label="Cargo del responsable"><input value={form.cargoResponsable} onChange={(e) => setForm({ ...form, cargoResponsable: e.target.value })} className={inputCls} /></Field>
              <Field label="Proveedor"><input value={form.proveedor} onChange={(e) => setForm({ ...form, proveedor: e.target.value })} className={inputCls} /></Field>
              <Field label="N° factura / compra"><input value={form.numeroFactura} onChange={(e) => setForm({ ...form, numeroFactura: e.target.value })} className={inputCls} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Fecha de compra"><input type="date" value={form.fechaCompra} onChange={(e) => setForm({ ...form, fechaCompra: e.target.value })} className={inputCls} /></Field>
                <Field label="Costo (S/)">
                  <input type="number" value={form.costo ?? ''} onChange={(e) => setForm({ ...form, costo: e.target.value === '' ? undefined : Number(e.target.value) })} className={inputCls} />
                </Field>
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300 cursor-pointer">
                  <input type="checkbox" checked={form.tieneGarantia} onChange={(e) => setForm({ ...form, tieneGarantia: e.target.checked })} className="w-4 h-4 rounded accent-emerald-600" />
                  Tiene garantía
                </label>
              </div>
              {form.tieneGarantia && (
                <Field label="Vencimiento de garantía"><input type="date" value={form.garantiaVencimiento} onChange={(e) => setForm({ ...form, garantiaVencimiento: e.target.value })} className={inputCls} /></Field>
              )}

              {/* Especificaciones */}
              <div className="sm:col-span-2 mt-2">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Especificaciones técnicas</p>
                  <button type="button" onClick={() => setSpecs((s) => ({ ...s, ['']: '' }))} className="text-xs font-bold text-teal-600 hover:text-teal-700 dark:text-teal-400 inline-flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Agregar</button>
                </div>
                {Object.entries(specs).map(([k, v], idx) => (
                  <div key={idx} className="grid grid-cols-2 gap-2 mb-2">
                    <input value={k} onChange={(e) => {
                      const neo: Record<string, string> = {};
                      Object.entries(specs).forEach(([ok, ov], i) => {
                        if (i === idx) neo[e.target.value] = ov; else neo[ok] = ov;
                      });
                      setSpecs(neo);
                    }} placeholder="Campo (RAM, Disco, etc.)" className={inputCls} />
                    <input value={v} onChange={(e) => {
                      const kk = k;
                      setSpecs((s) => ({ ...s, [kk]: e.target.value }));
                    }} placeholder="Valor" className={inputCls} />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800">
              <button onClick={() => setModal(null)} className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors">Cancelar</button>
              <button onClick={submit} disabled={saving} className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-teal-600 to-emerald-600 shadow-lg shadow-teal-500/25 rounded-xl hover:shadow-xl disabled:opacity-60 transition-all hover:-translate-y-0.5 active:scale-95">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />} {modal.mode === 'edit' ? 'Guardar cambios' : 'Registrar activo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER DETALLE */}
      {detalleId && <DetallePanel activo={activoDetalle} onClose={() => setDetalleId(null)} onQr={handleQr} />}

      {/* QR MODAL */}
      {qrPreview && <QrModal qr={qrPreview} onClose={() => setQrPreview(null)} />}

      <ConfirmDialog isOpen={!!bajaId} variant="warning" title="¿Dar de baja este activo?" message="El activo cambiará a estado 'Dado de Baja' y dejará de estar disponible." confirmText="Sí, dar de baja" onConfirm={confirmBaja} onClose={() => setBajaId(null)} />
      <ConfirmDialog isOpen={!!eliminarId} variant="danger" title="¿Eliminar activo?" message="Esta acción eliminará definitivamente el activo. No podrás recuperarlo." confirmText="Sí, eliminar" onConfirm={confirmEliminar} onClose={() => setEliminarId(null)} />
    </div>
  );
}

const inputCls = 'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-shadow';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function DetallePanel({ activo, onClose, onQr }: { activo: any; onClose: () => void; onQr: (id: number, codigo: string) => void }) {
  if (!activo) return null;
  const rows: { icon: React.ElementType; label: string; value: any }[] = [
    { icon: Building2, label: 'Sede', value: activo.sedeNombre },
    { icon: MapPin, label: 'Ubicación', value: activo.ubicacionFisica },
    { icon: User, label: 'Responsable', value: activo.responsableNombre },
    { icon: Tag, label: 'Serie', value: activo.numeroSerie },
    { icon: Cpu, label: 'Marca / Modelo', value: `${activo.marca || ''} ${activo.modelo || ''}`.trim() },
    { icon: CircleDollarSign, label: 'Costo', value: activo.costo ? `S/ ${activo.costo}` : '—' },
    { icon: CalendarDays, label: 'Fecha compra', value: activo.fechaCompra },
    { icon: CalendarDays, label: 'Garantía vence', value: activo.garantiaVencimiento },
  ];
  return (
    <div className="fixed inset-0 z-[85] flex justify-end bg-slate-900/50 backdrop-blur-sm anim-fade-in">
      <div className="relative w-full max-w-lg h-full bg-white dark:bg-slate-900 shadow-2xl overflow-y-auto anim-slide-in-right">
        <div className="h-1.5 w-full bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500" />
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg z-10">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"><ArrowLeft className="w-5 h-5" /></button>
            <div>
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">{activo.nombre}</h3>
              <p className="text-xs text-teal-600 dark:text-teal-400 font-bold font-mono">{activo.codigo}</p>
            </div>
          </div>
          <Badge estado={activo.estado} />
        </div>

        <div className="p-6 space-y-5">
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-600 text-white shadow-lg">
            <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center"><Package className="w-7 h-7" /></div>
            <div>
              <p className="text-xs uppercase tracking-wider font-bold text-white/80">{activo.categoriaNombre || 'Activo'}</p>
              <p className="text-xl font-black">{activo.estado ? ESTADO_LABELS[activo.estado] : '—'}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {rows.map((r) => (
              <div key={r.label} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1"><r.icon className="w-3 h-3" />{r.label}</div>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200 break-words">{r.value || '—'}</p>
              </div>
            ))}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Especificaciones</p>
            </div>
            {Object.keys(activo.especificaciones || {}).length > 0 ? (
              <div className="rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                {Object.entries(activo.especificaciones || {}).map(([k, v], i) => (
                  <div key={k} className={`flex items-center justify-between px-4 py-2.5 ${i % 2 ? 'bg-slate-50 dark:bg-slate-800/40' : 'bg-white dark:bg-slate-900'}`}>
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">{k}</span>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{String(v)}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-slate-400">Sin especificaciones registradas</p>}
          </div>

          <div className="flex gap-3">
            <button onClick={() => activo.id && onQr(activo.id, activo.codigo)} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-cyan-700 bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-500/10 dark:text-cyan-400 dark:hover:bg-cyan-500/20 border border-cyan-200 dark:border-cyan-500/20 rounded-xl transition-colors"><QrCode className="w-4 h-4" /> Ver QR</button>
            <button onClick={onClose} className="flex-1 px-4 py-3 text-sm font-bold text-slate-600 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors">Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function QrModal({ qr, onClose }: { qr: { token: string; codigo: string }; onClose: () => void }) {
  // URL pública configurable (VITE_PUBLIC_APP_URL) para que el QR sea escaneable
  // desde otros dispositivos; si no se define, se usa el origen actual.
  const publicBase =
    (import.meta.env.VITE_PUBLIC_APP_URL as string | undefined)?.replace(/\/+$/, '') ||
    window.location.origin;
  const qrValue = qr.token
    ? `${publicBase}/qr/${qr.token}`
    : qr.codigo;
  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-3 anim-fade-in">
      <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden anim-scale-in">
        <div className="h-1.5 w-full bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500" />
        <div className="p-6 text-center">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Código QR</h3>
            <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="w-5 h-5" /></button>
          </div>
          {qr.token ? (
            <div className="w-56 h-56 mx-auto rounded-2xl border-2 border-teal-100 dark:border-teal-500/30 bg-white p-3 flex items-center justify-center">
              <QRCodeSVG value={qrValue} size={208} level="M" marginSize={0} />
            </div>
          ) : (
            <div className="w-56 h-56 mx-auto rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center gap-2 text-slate-400">
              <QrCode className="w-8 h-8" />
              <p className="text-xs font-medium px-6">Primero genera el QR del activo</p>
            </div>
          )}
          <p className="mt-4 text-sm font-bold text-slate-700 dark:text-slate-200">Código: <span className="font-mono text-teal-600 dark:text-teal-400">{qr.codigo}</span></p>
          <p className="mt-1 text-[11px] text-slate-400 font-medium break-all">{qrValue}</p>
          <button onClick={onClose} className="mt-5 w-full px-4 py-3 text-sm font-bold text-white bg-gradient-to-r from-teal-600 to-emerald-600 rounded-xl shadow-lg shadow-teal-500/25">Cerrar</button>
        </div>
      </div>
    </div>
  );
}
