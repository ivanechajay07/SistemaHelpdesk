import React, { useEffect, useState } from 'react';
import {
  useInventarioStore, ESTADO_LABELS, MOVIMIENTO_LABELS, TRANSFERENCIA_LABELS, MANTENIMIENTO_LABELS, PRESTAMO_LABELS,
} from '../../store/inventoryStore';
import { useToast } from '../../components/ui/Toast';
import InventoryPageHeader from './InventoryPageHeader';
import { BarChart3, Download, FileSpreadsheet, Loader2, PackageCheck, Wrench, PackagePlus, ArrowLeftRight, Boxes, CheckCircle2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
      const doc = new jsPDF({ orientation: 'landscape' });
      doc.setFontSize(18); doc.setTextColor(20, 184, 166);
      doc.text('Reporte de Inventario', 14, 16);
      doc.setFontSize(10); doc.setTextColor(100, 116, 139);
      doc.text(`Generado: ${new Date().toLocaleString('es-PE')} · Total activos: ${activoTotal}`, 14, 24);

      doc.setFontSize(13); doc.setTextColor(15, 23, 42); doc.text('Activos', 14, 36);
      autoTable(doc, {
        startY: 40,
        head: [['Código', 'Nombre', 'Categoría', 'Estado', 'Sede', 'Responsable', 'Serie']],
        body: activos.map((a) => [a.codigo, a.nombre, a.categoriaNombre || '—', ESTADO_LABELS[a.estado] || a.estado, a.sedeNombre || '—', a.responsableNombre || '—', a.numeroSerie || '—']),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [20, 184, 166] },
        alternateRowStyles: { fillColor: [240, 253, 250] },
      });

      if (movimientos.length > 0) {
        doc.addPage();
        doc.setFontSize(13); doc.setTextColor(15, 23, 42); doc.text('Movimientos', 14, 16);
        autoTable(doc, {
          startY: 20,
          head: [['Tipo', 'Activo', 'Origen', 'Destino', 'Fecha', 'Usuario']],
          body: movimientos.map((m) => [MOVIMIENTO_LABELS[m.tipo] || m.tipo, `${m.activoCodigo} ${m.activoNombre}`, m.sedeOrigenNombre || m.entidadOrigenNombre || '—', m.sedeDestinoNombre || m.entidadDestinoNombre || '—', m.fecha ? new Date(m.fecha).toLocaleDateString('es-PE') : '—', m.usuarioOperacion || '—']),
          styles: { fontSize: 8 },
          headStyles: { fillColor: [20, 184, 166] },
          alternateRowStyles: { fillColor: [240, 253, 250] },
        });
      }

      if (transferencias.length > 0) {
        doc.addPage();
        doc.setFontSize(13); doc.setTextColor(15, 23, 42); doc.text('Transferencias', 14, 16);
        autoTable(doc, {
          startY: 20,
          head: [['N° Documento', 'Origen', 'Destino', 'Estado', 'Fecha']],
          body: transferencias.map((t) => [t.numeroDocumento, t.sedeOrigenNombre || '—', t.sedeDestinoNombre || '—', TRANSFERENCIA_LABELS[t.estado] || t.estado, t.fecha ? new Date(t.fecha).toLocaleDateString('es-PE') : '—']),
          styles: { fontSize: 8 },
          headStyles: { fillColor: [20, 184, 166] },
          alternateRowStyles: { fillColor: [240, 253, 250] },
        });
      }

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
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([
        { Reporte: 'Inventario', Generado: new Date().toLocaleString('es-PE'), TotalActivos: activoTotal },
      ]), 'Resumen');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(activos.map((a) => ({
        Codigo: a.codigo, Nombre: a.nombre, Categoria: a.categoriaNombre || '', Estado: ESTADO_LABELS[a.estado] || a.estado,
        Marca: a.marca || '', Modelo: a.modelo || '', Serie: a.numeroSerie || '', Sede: a.sedeNombre || '',
        Responsable: a.responsableNombre || '', Area: a.area || '',
      }))), 'Activos');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(movimientos.map((m) => ({
        Tipo: MOVIMIENTO_LABELS[m.tipo] || m.tipo, Activo: `${m.activoCodigo} ${m.activoNombre}`, Origen: m.sedeOrigenNombre || m.entidadOrigenNombre || '',
        Destino: m.sedeDestinoNombre || m.entidadDestinoNombre || '', Fecha: m.fecha || '', Usuario: m.usuarioOperacion || '',
      }))), 'Movimientos');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(mantenimientos.map((m) => ({
        Activo: `${m.activoCodigo} ${m.activoNombre}`, Tipo: m.tipo, Estado: MANTENIMIENTO_LABELS[m.estado] || m.estado,
        Fecha: m.fecha || '', Tecnico: m.tecnicoNombre || '', Proveedor: m.proveedor || '', Costo: m.costo ?? '',
      }))), 'Mantenimientos');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(prestamos.map((p) => ({
        Activo: `${p.activoCodigo} ${p.activoNombre}`, Solicitante: p.solicitanteNombre || '', Estado: PRESTAMO_LABELS[p.estado] || p.estado,
        Entrega: p.fechaEntrega || '', DevolucionPrevista: p.fechaDevolucionPrevista || '', DevolucionReal: p.fechaDevolucionReal || '',
      }))), 'Prestamos');
      XLSX.writeFile(wb, `Reporte_Inventario_${new Date().toISOString().slice(0, 10)}.xlsx`);
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