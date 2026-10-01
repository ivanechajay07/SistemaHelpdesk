import React, { useEffect, useState } from 'react';
import {
  useInventarioStore, ESTADO_LABELS, MOVIMIENTO_LABELS, TRANSFERENCIA_LABELS, MANTENIMIENTO_LABELS, PRESTAMO_LABELS,
} from '../../store/inventoryStore';
import { useToast } from '../../components/ui/Toast';
import InventoryPageHeader from './InventoryPageHeader';
import { BarChart3, Download, FileSpreadsheet, Loader2, PackageCheck, Wrench, PackagePlus, ArrowLeftRight, Boxes, CheckCircle2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import * as XLSX from 'xlsx-js-style';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { drawCorporateHeader, drawSectionTitle, drawFooter, drawKpiCards, formatReportDate } from '../../lib/reportPdf';
import { mergeRow, styleRow, setCols, downloadWorkbook, exTitle, exSubtitle, exHeader, exData, exDataAlt } from '../../lib/reportExcel';

const COLORS = ['#10b981', '#f59e0b', '#f97316', '#8b5cf6', '#06b6d4', '#3b82f6', '#ef4444', '#6366f1', '#ec4899', '#94a3b8'];
const tooltipStyle = { backgroundColor: 'rgba(15, 23, 42, 0.92)', border: '1px solid #334155', borderRadius: '12px', color: '#f8fafc', fontSize: '12px', fontWeight: 600 };

function Seccion({ title, icon: Icon, iconCls, children, delay = 0 }: { title: string; icon: React.ElementType; iconCls: string; children: React.ReactNode; delay?: number }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm anim-fade-in-up" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center gap-2.5 mb-4">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconCls}`}><Icon className="w-[18px] h-[18px]" /></div>
        <h3 className="font-extrabold text-slate-900 dark:text-white">{title}</h3>
      </div>
      {children}
    </div>
  );
}

export default function Reportes() {
  const toast = useToast();
  const { dashboard, fetchDashboard, dashboardLoading, activos, activoTotal, activoLoading, fetchActivos, movimientos, movimientosLoading, fetchMovimientos, transferencias, transferenciasLoading, fetchTransferencias, mantenimientos, mantenimientosLoading, fetchMantenimientos, prestamos, prestamosLoading, fetchPrestamos } = useInventarioStore();
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null);

  useEffect(() => {
    fetchDashboard();
    fetchActivos({ page: 0, size: 5000 });
    fetchMovimientos(undefined, 0, 5000);
    fetchTransferencias();
    fetchMantenimientos();
    fetchPrestamos();
  }, [fetchDashboard, fetchActivos, fetchMovimientos, fetchTransferencias, fetchMantenimientos, fetchPrestamos]);

  const cargando = dashboardLoading || activoLoading || movimientosLoading || transferenciasLoading || mantenimientosLoading || prestamosLoading;

  const stats = [
    { label: 'Activos registrados', value: activoTotal, icon: Boxes, iconCls: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-400' },
    { label: 'Operativos', value: dashboard?.operativos || 0, icon: CheckCircle2, iconCls: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400' },
    { label: 'En mantenimiento', value: dashboard?.enMantenimiento || 0, icon: Wrench, iconCls: 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400' },
    { label: 'Movimientos', value: movimientos.length, icon: BarChart3, iconCls: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400' },
    { label: 'Transferencias', value: transferencias.length, icon: ArrowLeftRight, iconCls: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-400' },
    { label: 'Mantenimientos', value: mantenimientos.length, icon: Wrench, iconCls: 'bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400' },
    { label: 'Préstamos', value: prestamos.length, icon: PackagePlus, iconCls: 'bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400' },
  ];

  const exportPdf = async () => {
    setExporting('pdf');
    try {
      const dateStr = formatReportDate();
      const doc = new jsPDF({ orientation: 'landscape' });
      const pageHeight = doc.internal.pageSize.getHeight();
      const M = 14;

      let y = drawCorporateHeader(doc, {
        title: 'REPORTE DE INVENTARIO',
        subtitle: 'Activos, movimientos, transferencias, mantenimientos y préstamos',
        meta: `Generado: ${dateStr}`,
        bandHeight: 26,
      });
      y += 2;

      y = drawKpiCards(doc, [
        { label: 'Activos registrados', value: String(activoTotal) },
        { label: 'Operativos', value: String(dashboard?.operativos || 0) },
        { label: 'En mantenimiento', value: String(dashboard?.enMantenimiento || 0) },
        { label: 'Movimientos', value: String(movimientos.length) },
        { label: 'Transferencias', value: String(transferencias.length) },
        { label: 'Mantenimientos', value: String(mantenimientos.length) },
        { label: 'Préstamos', value: String(prestamos.length) },
      ], y);
      y += 8;

      const ensureSpace = (h: number) => {
        if (y + h > pageHeight - 22) {
          doc.addPage();
          y = 14;
        }
      };

      const tableStyles = {
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [30, 64, 175] as [number, number, number], fontSize: 8, fontStyle: 'bold' as const, halign: 'center' as const },
        alternateRowStyles: { fillColor: [241, 245, 249] as [number, number, number] },
        margin: { left: M, right: M },
      };

      // ===== Activos =====
      ensureSpace(20);
      y = drawSectionTitle(doc, 'Activos', y);
      autoTable(doc, {
        ...tableStyles,
        startY: y,
        head: [['Código', 'Nombre', 'Categoría', 'Estado', 'Sede', 'Responsable', 'Serie']],
        body: activos.map((a) => [a.codigo, a.nombre, a.categoriaNombre || '—', ESTADO_LABELS[a.estado] || a.estado, a.sedeNombre || '—', a.responsableNombre || '—', a.numeroSerie || '—']),
      });
      y = (doc as any).lastAutoTable.finalY + 10;

      // ===== Movimientos =====
      if (movimientos.length > 0) {
        ensureSpace(20);
        y = drawSectionTitle(doc, 'Movimientos', y);
        autoTable(doc, {
          ...tableStyles,
          startY: y,
          head: [['Tipo', 'Activo', 'Origen', 'Destino', 'Fecha', 'Usuario']],
          body: movimientos.map((m) => [MOVIMIENTO_LABELS[m.tipo] || m.tipo, `${m.activoCodigo} ${m.activoNombre}`, m.sedeOrigenNombre || m.entidadOrigenNombre || '—', m.sedeDestinoNombre || m.entidadDestinoNombre || '—', m.fecha ? new Date(m.fecha).toLocaleDateString('es-PE') : '—', m.usuarioOperacion || '—']),
        });
        y = (doc as any).lastAutoTable.finalY + 10;
      }

      // ===== Transferencias =====
      if (transferencias.length > 0) {
        ensureSpace(20);
        y = drawSectionTitle(doc, 'Transferencias', y);
        autoTable(doc, {
          ...tableStyles,
          startY: y,
          head: [['N° Documento', 'Origen', 'Destino', 'Estado', 'Fecha']],
          body: transferencias.map((t) => [t.numeroDocumento, t.sedeOrigenNombre || '—', t.sedeDestinoNombre || '—', TRANSFERENCIA_LABELS[t.estado] || t.estado, t.fecha ? new Date(t.fecha).toLocaleDateString('es-PE') : '—']),
        });
        y = (doc as any).lastAutoTable.finalY + 10;
      }

      // ===== Mantenimientos =====
      if (mantenimientos.length > 0) {
        ensureSpace(20);
        y = drawSectionTitle(doc, 'Mantenimientos', y);
        autoTable(doc, {
          ...tableStyles,
          startY: y,
          head: [['Activo', 'Tipo', 'Estado', 'Fecha', 'Técnico', 'Proveedor', 'Costo']],
          body: mantenimientos.map((m) => [`${m.activoCodigo} ${m.activoNombre}`, m.tipo || '—', MANTENIMIENTO_LABELS[m.estado] || m.estado || '—', m.fecha ? new Date(m.fecha).toLocaleDateString('es-PE') : '—', m.tecnicoNombre || '—', m.proveedor || '—', m.costo != null ? `S/ ${m.costo}` : '—']),
        });
        y = (doc as any).lastAutoTable.finalY + 10;
      }

      // ===== Préstamos =====
      if (prestamos.length > 0) {
        ensureSpace(20);
        y = drawSectionTitle(doc, 'Préstamos', y);
        autoTable(doc, {
          ...tableStyles,
          startY: y,
          head: [['Activo', 'Solicitante', 'Estado', 'Entrega', 'Devolución prevista', 'Devolución real']],
          body: prestamos.map((p) => [`${p.activoCodigo} ${p.activoNombre}`, p.solicitanteNombre || '—', PRESTAMO_LABELS[p.estado] || p.estado || '—', p.fechaEntrega || '—', p.fechaDevolucionPrevista || '—', p.fechaDevolucionReal || '—']),
        });
        y = (doc as any).lastAutoTable.finalY + 10;
      }

      drawFooter(doc, dateStr);
      doc.save(`Reporte_Inventario_${new Date().toISOString().slice(0, 10)}.pdf`);
      toast({ variant: 'success', title: 'PDF generado', message: 'Reporte de inventario exportado' });
    } catch (e) {
      console.error(e);
      toast({ variant: 'error', title: 'Error', message: 'No se pudo generar el PDF' });
    }
    setExporting(null);
  };

  const exportExcel = async () => {
    setExporting('excel');
    try {
      const now = new Date();
      const dateStr = now.toLocaleString('es-PE', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      const wb = XLSX.utils.book_new();

      const buildSheet = (title: string, headers: string[], rows: (string | number)[][], widths: number[]): XLSX.WorkSheet => {
        const aoa: (string | number)[][] = [[title], [`Generado: ${dateStr}`], [''], headers, ...rows];
        const ws = XLSX.utils.aoa_to_sheet(aoa);
        mergeRow(ws, 0, 0, headers.length - 1, title, exTitle);
        mergeRow(ws, 1, 0, headers.length - 1, `Generado: ${dateStr}`, exSubtitle);
        styleRow(ws, 3, headers.length, exHeader);
        rows.forEach((_, i) => styleRow(ws, 4 + i, headers.length, i % 2 === 0 ? exData : exDataAlt));
        setCols(ws, widths);
        return ws;
      };

      // ===== Resumen =====
      const resumenRows: (string | number)[][] = [
        ['REPORTE DE INVENTARIO'],
        [`Generado: ${dateStr}`],
        [''],
        ['Métrica', 'Valor'],
        ['Activos registrados', activoTotal],
        ['Operativos', dashboard?.operativos || 0],
        ['En mantenimiento', dashboard?.enMantenimiento || 0],
        ['Movimientos', movimientos.length],
        ['Transferencias', transferencias.length],
        ['Mantenimientos', mantenimientos.length],
        ['Préstamos', prestamos.length],
      ];
      const wsResumen = XLSX.utils.aoa_to_sheet(resumenRows);
      mergeRow(wsResumen, 0, 0, 1, 'REPORTE DE INVENTARIO', exTitle);
      mergeRow(wsResumen, 1, 0, 1, `Generado: ${dateStr}`, exSubtitle);
      styleRow(wsResumen, 3, 2, exHeader);
      for (let i = 4; i <= 10; i++) styleRow(wsResumen, i, 2, i % 2 === 0 ? exData : exDataAlt);
      setCols(wsResumen, [32, 22]);
      XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

      // ===== Activos =====
      XLSX.utils.book_append_sheet(wb, buildSheet(
        'ACTIVOS',
        ['Código', 'Nombre', 'Categoría', 'Estado', 'Marca', 'Modelo', 'Serie', 'Sede', 'Responsable', 'Área'],
        activos.map((a) => [a.codigo, a.nombre, a.categoriaNombre || '', ESTADO_LABELS[a.estado] || a.estado, a.marca || '', a.modelo || '', a.numeroSerie || '', a.sedeNombre || '', a.responsableNombre || '', a.area || '']),
        [12, 28, 16, 14, 14, 14, 16, 22, 20, 16],
      ), 'Activos');

      // ===== Movimientos =====
      XLSX.utils.book_append_sheet(wb, buildSheet(
        'MOVIMIENTOS',
        ['Tipo', 'Activo', 'Origen', 'Destino', 'Fecha', 'Usuario'],
        movimientos.map((m) => [MOVIMIENTO_LABELS[m.tipo] || m.tipo, `${m.activoCodigo} ${m.activoNombre}`, m.sedeOrigenNombre || m.entidadOrigenNombre || '', m.sedeDestinoNombre || m.entidadDestinoNombre || '', m.fecha || '', m.usuarioOperacion || '']),
        [16, 30, 24, 24, 16, 20],
      ), 'Movimientos');

      // ===== Transferencias =====
      XLSX.utils.book_append_sheet(wb, buildSheet(
        'TRANSFERENCIAS',
        ['N° Documento', 'Origen', 'Destino', 'Estado', 'Fecha'],
        transferencias.map((t) => [t.numeroDocumento, t.sedeOrigenNombre || '', t.sedeDestinoNombre || '', TRANSFERENCIA_LABELS[t.estado] || t.estado, t.fecha || '']),
        [20, 30, 30, 18, 16],
      ), 'Transferencias');

      // ===== Mantenimientos =====
      XLSX.utils.book_append_sheet(wb, buildSheet(
        'MANTENIMIENTOS',
        ['Activo', 'Tipo', 'Estado', 'Fecha', 'Técnico', 'Proveedor', 'Costo'],
        mantenimientos.map((m) => [`${m.activoCodigo} ${m.activoNombre}`, m.tipo || '', MANTENIMIENTO_LABELS[m.estado] || m.estado || '', m.fecha || '', m.tecnicoNombre || '', m.proveedor || '', m.costo ?? '']),
        [30, 16, 16, 16, 20, 20, 14],
      ), 'Mantenimientos');

      // ===== Préstamos =====
      XLSX.utils.book_append_sheet(wb, buildSheet(
        'PRÉSTAMOS',
        ['Activo', 'Solicitante', 'Estado', 'Entrega', 'Devolución prevista', 'Devolución real'],
        prestamos.map((p) => [`${p.activoCodigo} ${p.activoNombre}`, p.solicitanteNombre || '', PRESTAMO_LABELS[p.estado] || p.estado || '', p.fechaEntrega || '', p.fechaDevolucionPrevista || '', p.fechaDevolucionReal || '']),
        [30, 22, 18, 18, 20, 20],
      ), 'Prestamos');

      downloadWorkbook(wb, `Reporte_Inventario_${now.toISOString().slice(0, 10)}.xlsx`);
      toast({ variant: 'success', title: 'Excel generado', message: 'Reporte de inventario exportado' });
    } catch (e) {
      console.error(e);
      toast({ variant: 'error', title: 'Error', message: 'No se pudo generar el Excel' });
    }
    setExporting(null);
  };

  return (
    <div className="space-y-6">
      <InventoryPageHeader icon={BarChart3} eyebrow="Inventario" title="Reportes" subtitle="Estadísticas consolidadas del inventario con exportación a PDF y Excel." gradient="from-cyan-600 via-teal-600 to-emerald-700" />

      <div className="flex flex-wrap gap-2.5">
        <button onClick={exportPdf} disabled={exporting !== null} className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20 border border-rose-200 dark:border-rose-500/20 text-sm font-bold transition-colors disabled:opacity-50">
          {exporting === 'pdf' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Exportar PDF
        </button>
        <button onClick={exportExcel} disabled={exporting !== null} className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/20 text-sm font-bold transition-colors disabled:opacity-50">
          {exporting === 'excel' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />} Exportar Excel
        </button>
      </div>

      {cargando && activos.length === 0 ? (
        <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-teal-500" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-4">
            {stats.map((s, i) => (
              <div key={s.label} className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-sm anim-fade-in-up" style={{ animationDelay: `${i * 60}ms` }}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2.5 ${s.iconCls}`}><s.icon className="w-[18px] h-[18px]" /></div>
                <p className="text-2xl font-black text-slate-900 dark:text-white tabular-nums leading-none">{s.value}</p>
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mt-1.5">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Seccion title="Activos por Estado" icon={PackageCheck} iconCls="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400" delay={100}>
              {(dashboard?.porEstado?.length || 0) > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={dashboard!.porEstado} cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={3} cornerRadius={5} dataKey="value">
                      {dashboard!.porEstado.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-sm text-slate-400 py-10 text-center">Sin datos</p>}
            </Seccion>

            <Seccion title="Movimientos por Tipo" icon={ArrowLeftRight} iconCls="bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400" delay={160}>
              {movimientos.length > 0 ? (
                (() => {
                  const counts = Object.entries(MOVIMIENTO_LABELS).map(([tipo, label]) => ({ name: label, value: movimientos.filter((m) => m.tipo === tipo).length })).filter((x) => x.value > 0);
                  return counts.length > 0 ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={counts} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" opacity={0.2} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }} interval={0} angle={-20} textAnchor="end" height={50} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} allowDecimals={false} />
                        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
                        <Bar dataKey="value" fill="#6366f1" radius={[8, 8, 3, 3]} maxBarSize={42} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <p className="text-sm text-slate-400 py-10 text-center">Sin datos</p>;
                })()
              ) : <p className="text-sm text-slate-400 py-10 text-center">Sin datos</p>}
            </Seccion>
          </div>
        </>
      )}
    </div>
  );
}