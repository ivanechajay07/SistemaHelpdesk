import React, { useEffect, useState, useMemo } from 'react';
import { useTicketStore } from '../store/ticketStore';
import {
  Printer,
  PieChart as PieChartIcon,
  BarChart3,
  FileSpreadsheet,
  FileText,
  Loader2,
  Inbox,
  Clock,
  CheckCircle2,
  Archive,
  TrendingUp,
  CalendarDays,
  Sparkles,
  Filter,
  UserCheck
} from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx-js-style';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useUserStore } from '../store/userStore';
import Pagination from '../components/ui/Pagination';
import { usePagedList } from '../lib/hooks';
import { drawCorporateHeader, drawSectionTitle, drawFooter, drawKpiCards } from '../lib/reportPdf';
import { mergeRow, styleRow, setCols, downloadWorkbook, exTitle, exSubtitle, exHeader, exData, exDataAlt, exSection } from '../lib/reportExcel';

const COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#6366f1', '#94a3b8', '#ec4899'];

const PRIORITY_COLORS: Record<string, string> = {
  CRITICA: '#ef4444',
  ALTA: '#f97316',
  MEDIA: '#eab308',
  BAJA: '#10b981',
};

const STATUS_LABELS: Record<string, string> = {
  NUEVO: 'Nuevo',
  ASIGNADO: 'Asignado',
  EN_PROCESO: 'En Proceso',
  EN_REVISION: 'En Revisión',
  RESUELTO: 'Resuelto',
  CERRADO: 'Cerrado',
  CANCELADO: 'Cancelado',
};

const PRIORITY_LABELS: Record<string, string> = {
  CRITICA: 'Crítica',
  ALTA: 'Alta',
  MEDIA: 'Media',
  BAJA: 'Baja',
};

const STATUS_BADGE: Record<string, string> = {
  NUEVO: 'bg-blue-50 text-blue-700 ring-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400',
  ASIGNADO: 'bg-purple-50 text-purple-700 ring-purple-500/20 dark:bg-purple-500/10 dark:text-purple-400',
  EN_PROCESO: 'bg-amber-50 text-amber-700 ring-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400',
  EN_REVISION: 'bg-cyan-50 text-cyan-700 ring-cyan-500/20 dark:bg-cyan-500/10 dark:text-cyan-400',
  RESUELTO: 'bg-emerald-50 text-emerald-700 ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400',
  CERRADO: 'bg-slate-100 text-slate-600 ring-slate-500/20 dark:bg-slate-500/10 dark:text-slate-400',
  CANCELADO: 'bg-red-50 text-red-700 ring-red-500/20 dark:bg-red-500/10 dark:text-red-400',
};

const PRIORITY_BADGE: Record<string, string> = {
  CRITICA: 'bg-red-50 text-red-700 ring-red-500/20 dark:bg-red-500/10 dark:text-red-400',
  ALTA: 'bg-orange-50 text-orange-700 ring-orange-500/20 dark:bg-orange-500/10 dark:text-orange-400',
  MEDIA: 'bg-yellow-50 text-yellow-700 ring-yellow-500/20 dark:bg-yellow-500/10 dark:text-yellow-400',
  BAJA: 'bg-emerald-50 text-emerald-700 ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400',
};

function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(target * eased * 10) / 10);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

interface StatCardProps {
  label: string;
  value: number;
  suffix?: string;
  decimals?: number;
  icon: React.ElementType;
  iconBg: string;
  textColor: string;
  barGradient: string;
  barPct: number;
  delay: number;
}

function StatCard({ label, value, suffix = '', decimals = 0, icon: Icon, iconBg, textColor, barGradient, barPct, delay }: StatCardProps) {
  const display = useCountUp(value);
  const [barWidth, setBarWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setBarWidth(barPct), 250 + delay);
    return () => clearTimeout(t);
  }, [barPct, delay]);

  return (
    <div
      className="group relative bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300 anim-fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</p>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg} transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
          <Icon className={`w-[18px] h-[18px] ${textColor}`} />
        </div>
      </div>
      <p className={`text-3xl sm:text-4xl font-black tabular-nums leading-none ${textColor}`}>
        {decimals > 0 ? display.toFixed(decimals) : Math.round(display)}
        <span className="text-xl">{suffix}</span>
      </p>
      <div className="mt-3 h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${barGradient} transition-[width] duration-1000 ease-out`}
          style={{ width: `${barWidth}%` }}
        />
      </div>
    </div>
  );
}

export default function Reports() {
  const { tickets, fetchTickets, loading } = useTicketStore();
  const { technicians, fetchTechnicians } = useUserStore();
  const [dateFilter, setDateFilter] = useState('all');
  const [exporting, setExporting] = useState<string | null>(null);
  const [selectedTecnicoId, setSelectedTecnicoId] = useState<number | ''>('');

  useEffect(() => {
    fetchTickets();
    fetchTechnicians();
  }, [fetchTickets, fetchTechnicians]);

  const filteredTickets = tickets.filter(t => {
    if (dateFilter === 'all') return true;
    const ticketDate = new Date(t.fechaCreacion);
    const now = new Date();
    if (dateFilter === 'month') {
      return ticketDate.getMonth() === now.getMonth() && ticketDate.getFullYear() === now.getFullYear();
    }
    if (dateFilter === 'year') {
      return ticketDate.getFullYear() === now.getFullYear();
    }
    return true;
  });
  const { page, setPage, pageSize, setPageSize, paged: pagedTickets, total: totalFilteredTickets } = usePagedList(filteredTickets, 10);

  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredTickets.forEach(t => {
      counts[t.estado] = (counts[t.estado] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({
      name: STATUS_LABELS[name] || name.replace('_', ' '),
      value,
    }));
  }, [filteredTickets]);

  const priorityData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredTickets.forEach(t => {
      counts[t.prioridad] = (counts[t.prioridad] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({
      name: PRIORITY_LABELS[name] || name,
      value,
      rawName: name,
    }));
  }, [filteredTickets]);

  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredTickets.forEach(t => {
      const cat = t.subcategoriaNombre || 'Sin categoría';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [filteredTickets]);

  const getStatusCount = (status: string) => filteredTickets.filter(t => t.estado === status).length;

  // Tickets completados del técnico seleccionado (para el informe por usuario)
  const userCompletedTickets = useMemo(() => {
    if (!selectedTecnicoId) return [];
    return filteredTickets
      .filter((t) => t.tecnicoId === selectedTecnicoId && (t.estado === 'RESUELTO' || t.estado === 'CERRADO'))
      .sort((a, b) => new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickets, dateFilter, selectedTecnicoId]);
  const {
    page: userPage, setPage: setUserPage,
    pageSize: userPageSize, setPageSize: setUserPageSize,
    paged: pagedUserTickets, total: totalUserTickets,
  } = usePagedList(userCompletedTickets, 10);

  const selectedTecnico = technicians.find((t) => t.id === selectedTecnicoId);

  const total = filteredTickets.length;
  const resolvedCount = getStatusCount('RESUELTO') + getStatusCount('CERRADO');
  const resolutionRate = total > 0 ? (resolvedCount / total) * 100 : 0;

  const kpis = [
    { label: 'Total Tickets', value: total, icon: Inbox, iconBg: 'bg-blue-100 dark:bg-blue-500/15', textColor: 'text-blue-600 dark:text-blue-400', barGradient: 'from-blue-500 to-indigo-500', barPct: 100 },
    { label: 'En Proceso', value: getStatusCount('EN_PROCESO') + getStatusCount('ASIGNADO'), icon: Clock, iconBg: 'bg-amber-100 dark:bg-amber-500/15', textColor: 'text-amber-600 dark:text-amber-400', barGradient: 'from-amber-400 to-orange-500', barPct: total ? ((getStatusCount('EN_PROCESO') + getStatusCount('ASIGNADO')) / total) * 100 : 0 },
    { label: 'Resueltos', value: getStatusCount('RESUELTO'), icon: CheckCircle2, iconBg: 'bg-emerald-100 dark:bg-emerald-500/15', textColor: 'text-emerald-600 dark:text-emerald-400', barGradient: 'from-emerald-400 to-teal-500', barPct: total ? (getStatusCount('RESUELTO') / total) * 100 : 0 },
    { label: 'Cerrados', value: getStatusCount('CERRADO'), icon: Archive, iconBg: 'bg-slate-100 dark:bg-slate-500/15', textColor: 'text-slate-600 dark:text-slate-400', barGradient: 'from-slate-400 to-slate-600', barPct: total ? (getStatusCount('CERRADO') / total) * 100 : 0 },
    { label: 'Tasa Resolución', value: resolutionRate, suffix: '%', decimals: 1, icon: TrendingUp, iconBg: 'bg-violet-100 dark:bg-violet-500/15', textColor: 'text-violet-600 dark:text-violet-400', barGradient: 'from-violet-500 to-fuchsia-500', barPct: resolutionRate },
  ];

  const handlePrint = () => {
    window.print();
  };

  const getReportMeta = () => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
    const filterLabel = dateFilter === 'all' ? 'Todos los tiempos' : dateFilter === 'month' ? 'Este Mes' : 'Este Año';
    return { dateStr, filterLabel };
  };

  const handleExportExcel = async () => {
    setExporting('excel');
    try {
      const now = new Date();
      const { dateStr, filterLabel } = getReportMeta();
      const wb = XLSX.utils.book_new();

      const buildSheet = (title: string, headers: string[], rows: (string | number)[][], widths: number[]): XLSX.WorkSheet => {
        const aoa: (string | number)[][] = [[title], [`Generado: ${dateStr} · Periodo: ${filterLabel}`], [''], headers, ...rows];
        const ws = XLSX.utils.aoa_to_sheet(aoa);
        mergeRow(ws, 0, 0, headers.length - 1, title, exTitle);
        mergeRow(ws, 1, 0, headers.length - 1, `Generado: ${dateStr} · Periodo: ${filterLabel}`, exSubtitle);
        styleRow(ws, 3, headers.length, exHeader);
        rows.forEach((_, i) => styleRow(ws, 4 + i, headers.length, i % 2 === 0 ? exData : exDataAlt));
        setCols(ws, widths);
        return ws;
      };

      // ===== Hoja 1: Resumen Ejecutivo =====
      const wsSummary = XLSX.utils.aoa_to_sheet([
        ['REPORTE DE HELPDESK — RESUMEN EJECUTIVO'],
        [`Generado: ${dateStr} · Periodo: ${filterLabel}`],
        [''],
        ['Métrica', 'Valor'],
        ['Total de Tickets', filteredTickets.length],
        ['En Proceso / Asignados', getStatusCount('EN_PROCESO') + getStatusCount('ASIGNADO')],
        ['Resueltos', getStatusCount('RESUELTO')],
        ['Cerrados', getStatusCount('CERRADO')],
        ['Tasa de Resolución', filteredTickets.length > 0 ? `${(((getStatusCount('RESUELTO') + getStatusCount('CERRADO')) / filteredTickets.length) * 100).toFixed(1)}%` : '0%'],
        [''],
        ['DISTRIBUCIÓN POR ESTADO'],
        ['Estado', 'Cantidad', 'Porcentaje'],
        ...statusData.map(d => [
          d.name,
          d.value,
          filteredTickets.length > 0 ? `${((d.value / filteredTickets.length) * 100).toFixed(1)}%` : '0%',
        ]),
        [''],
        ['DISTRIBUCIÓN POR PRIORIDAD'],
        ['Prioridad', 'Cantidad', 'Porcentaje'],
        ...priorityData.map(d => [
          d.name,
          d.value,
          filteredTickets.length > 0 ? `${((d.value / filteredTickets.length) * 100).toFixed(1)}%` : '0%',
        ]),
      ]);
      mergeRow(wsSummary, 0, 0, 2, 'REPORTE DE HELPDESK — RESUMEN EJECUTIVO', exTitle);
      mergeRow(wsSummary, 1, 0, 2, `Generado: ${dateStr} · Periodo: ${filterLabel}`, exSubtitle);
      styleRow(wsSummary, 3, 2, exHeader);
      for (let i = 4; i <= 8; i++) styleRow(wsSummary, i, 2, i % 2 === 0 ? exData : exDataAlt);
      // Sección ESTADO
      mergeRow(wsSummary, 10, 0, 2, 'DISTRIBUCIÓN POR ESTADO', exSection);
      styleRow(wsSummary, 11, 3, exHeader);
      for (let i = 12; i < 12 + statusData.length; i++) styleRow(wsSummary, i, 3, i % 2 === 0 ? exData : exDataAlt);
      // Sección PRIORIDAD (offset después de la tabla de estado)
      const priorityStart = 13 + statusData.length;
      mergeRow(wsSummary, priorityStart, 0, 2, 'DISTRIBUCIÓN POR PRIORIDAD', exSection);
      styleRow(wsSummary, priorityStart + 1, 3, exHeader);
      for (let i = priorityStart + 2; i < priorityStart + 2 + priorityData.length; i++) styleRow(wsSummary, i, 3, i % 2 === 0 ? exData : exDataAlt);
      setCols(wsSummary, [28, 16, 16]);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen');

      // ===== Hoja 2: Detalle de Tickets =====
      XLSX.utils.book_append_sheet(wb, buildSheet(
        'DETALLE DE TICKETS',
        ['Código', 'Título', 'Descripción', 'Estado', 'Prioridad', 'Categoría', 'Técnico Asignado', 'Solicitante', 'Fecha Creación'],
        filteredTickets.map(t => [
          t.codigo,
          t.titulo,
          t.descripcion || '',
          STATUS_LABELS[t.estado] || t.estado,
          PRIORITY_LABELS[t.prioridad] || t.prioridad,
          t.subcategoriaNombre || 'Sin categoría',
          t.tecnicoNombre || 'Sin asignar',
          t.solicitanteNombre || 'N/A',
          new Date(t.fechaCreacion).toLocaleDateString('es-ES'),
        ]),
        [12, 32, 42, 15, 12, 22, 22, 22, 16],
      ), 'Detalle de Tickets');

      // ===== Hoja 3: Top Categorías =====
      if (categoryData.length > 0) {
        XLSX.utils.book_append_sheet(wb, buildSheet(
          'TOP CATEGORÍAS',
          ['Subcategoría', 'Cantidad de Tickets'],
          categoryData.map(d => [d.name, d.value]),
          [32, 22],
        ), 'Por Categoría');
      }

      downloadWorkbook(wb, `Reporte_HelpDesk_${now.toISOString().slice(0, 10)}.xlsx`);
    } catch (err) {
      console.error('Error exportando Excel:', err);
    } finally {
      setExporting(null);
    }
  };

  const handleExportPDF = async () => {
    setExporting('pdf');
    try {
      const { dateStr, filterLabel } = getReportMeta();
      const doc = new jsPDF('p', 'mm', 'letter');
      const pageHeight = doc.internal.pageSize.getHeight();
      const M = 15;

      let y = drawCorporateHeader(doc, {
        title: 'REPORTE DE HELPDESK',
        subtitle: 'Soporte técnico · Gestión de tickets',
        meta: `Generado: ${dateStr} · Periodo: ${filterLabel}`,
      });
      y += 2;

      y = drawKpiCards(doc, [
        { label: 'Total tickets', value: String(filteredTickets.length) },
        { label: 'En proceso', value: String(getStatusCount('EN_PROCESO') + getStatusCount('ASIGNADO')) },
        { label: 'Resueltos', value: String(getStatusCount('RESUELTO')) },
        { label: 'Cerrados', value: String(getStatusCount('CERRADO')) },
        { label: 'Tasa resolución', value: `${filteredTickets.length > 0 ? (((getStatusCount('RESUELTO') + getStatusCount('CERRADO')) / filteredTickets.length) * 100).toFixed(1) : '0'}%` },
      ], y);
      y += 6;

      const ensureSpace = (h: number) => {
        if (y + h > pageHeight - 22) {
          doc.addPage();
          y = M;
        }
      };

      const tableStyles = {
        theme: 'grid' as const,
        headStyles: { fillColor: [30, 64, 175] as [number, number, number], fontSize: 9, fontStyle: 'bold' as const, halign: 'center' as const },
        bodyStyles: { fontSize: 9 },
        alternateRowStyles: { fillColor: [241, 245, 249] as [number, number, number] },
        margin: { left: M, right: M },
      };

      // ===== Resumen Ejecutivo =====
      ensureSpace(60);
      y = drawSectionTitle(doc, 'Resumen Ejecutivo', y);
      autoTable(doc, {
        ...tableStyles,
        startY: y,
        head: [['Métrica', 'Valor']],
        body: [
          ['Total de Tickets', String(filteredTickets.length)],
          ['En Proceso / Asignados', String(getStatusCount('EN_PROCESO') + getStatusCount('ASIGNADO'))],
          ['Resueltos', String(getStatusCount('RESUELTO'))],
          ['Cerrados', String(getStatusCount('CERRADO'))],
          ['Tasa de Resolución', filteredTickets.length > 0
            ? `${(((getStatusCount('RESUELTO') + getStatusCount('CERRADO')) / filteredTickets.length) * 100).toFixed(1)}%`
            : '0%'],
        ],
        columnStyles: { 0: { fontStyle: 'bold' }, 1: { halign: 'right' } },
      });
      y = (doc as any).lastAutoTable.finalY + 10;

      // ===== Distribución por Estado =====
      ensureSpace(40);
      y = drawSectionTitle(doc, 'Distribución por Estado', y);
      autoTable(doc, {
        ...tableStyles,
        startY: y,
        head: [['Estado', 'Cantidad', 'Porcentaje']],
        body: statusData.map(d => [
          d.name,
          String(d.value),
          filteredTickets.length > 0 ? `${((d.value / filteredTickets.length) * 100).toFixed(1)}%` : '0%',
        ]),
      });
      y = (doc as any).lastAutoTable.finalY + 10;

      // ===== Distribución por Prioridad =====
      ensureSpace(40);
      y = drawSectionTitle(doc, 'Distribución por Prioridad', y);
      autoTable(doc, {
        ...tableStyles,
        startY: y,
        head: [['Prioridad', 'Cantidad', 'Porcentaje']],
        body: priorityData.map(d => [
          d.name,
          String(d.value),
          filteredTickets.length > 0 ? `${((d.value / filteredTickets.length) * 100).toFixed(1)}%` : '0%',
        ]),
      });
      y = (doc as any).lastAutoTable.finalY + 10;

      // ===== Página 2: Detalle de Tickets =====
      doc.addPage();
      y = drawCorporateHeader(doc, {
        title: 'DETALLE DE TICKETS',
        subtitle: 'Relación completa de tickets del periodo',
        meta: `Generado: ${dateStr} · Periodo: ${filterLabel}`,
      });
      y += 2;

      autoTable(doc, {
        startY: y,
        head: [['Código', 'Título', 'Estado', 'Prioridad', 'Técnico', 'Fecha']],
        body: filteredTickets.map(t => [
          t.codigo,
          t.titulo?.substring(0, 40) || '',
          STATUS_LABELS[t.estado] || t.estado,
          PRIORITY_LABELS[t.prioridad] || t.prioridad,
          t.tecnicoNombre?.substring(0, 20) || 'Sin asignar',
          new Date(t.fechaCreacion).toLocaleDateString('es-ES'),
        ]),
        theme: 'striped',
        headStyles: { fillColor: [30, 64, 175], fontSize: 8, fontStyle: 'bold' },
        bodyStyles: { fontSize: 7.5 },
        alternateRowStyles: { fillColor: [241, 245, 249] },
        columnStyles: {
          0: { cellWidth: 20, fontStyle: 'bold' },
          1: { cellWidth: 55 },
          2: { cellWidth: 25 },
          3: { cellWidth: 22 },
          4: { cellWidth: 35 },
          5: { cellWidth: 25 },
        },
        margin: { left: M, right: M },
      });

      drawFooter(doc, `Reporte HelpDesk · ${dateStr}`);
      doc.save(`Reporte_HelpDesk_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error('Error exportando PDF:', err);
    } finally {
      setExporting(null);
    }
  };

  const handleExportUserPDF = async () => {
    if (!selectedTecnicoId || !selectedTecnico) return;
    setExporting('user-pdf');
    try {
      const { dateStr, filterLabel } = getReportMeta();
      const doc = new jsPDF('p', 'mm', 'letter');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // ===== Encabezado corporativo =====
      const headerY = drawCorporateHeader(doc, {
        title: `${selectedTecnico.nombre} ${selectedTecnico.apellidos}`.substring(0, 42),
        subtitle: 'Informe de desempeño · Tickets completados',
        meta: `Generado: ${dateStr} · Periodo: ${filterLabel}`,
      });

      // ===== Tarjetas KPI =====
      const resueltos = userCompletedTickets.filter(t => t.estado === 'RESUELTO').length;
      const cerrados = userCompletedTickets.filter(t => t.estado === 'CERRADO').length;
      const kpiY = drawKpiCards(doc, [
        { label: 'Completados', value: String(userCompletedTickets.length) },
        { label: 'Resueltos', value: String(resueltos) },
        { label: 'Cerrados', value: String(cerrados) },
      ], headerY + 2);

      // ===== Tabla de tickets =====
      let y = kpiY + 8;
      y = drawSectionTitle(doc, 'Detalle de Tickets Completados', y);

      if (userCompletedTickets.length === 0) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text('El técnico no tiene tickets completados en el periodo seleccionado.', 15, y + 6);
      } else {
        const tableBody = userCompletedTickets.map(t => [
          t.codigo,
          t.titulo?.substring(0, 38) || '',
          STATUS_LABELS[t.estado] || t.estado,
          PRIORITY_LABELS[t.prioridad] || t.prioridad,
          new Date(t.fechaCreacion).toLocaleDateString('es-ES'),
          t.fechaResolucion ? new Date(t.fechaResolucion).toLocaleDateString('es-ES') : '—',
        ]);

        autoTable(doc, {
          startY: y,
          head: [['Código', 'Título', 'Estado', 'Prioridad', 'F. Creación', 'F. Resolución']],
          body: tableBody,
          theme: 'striped',
          headStyles: { fillColor: [79, 70, 229], fontSize: 8, fontStyle: 'bold' },
          bodyStyles: { fontSize: 7.5 },
          alternateRowStyles: { fillColor: [238, 242, 255] },
          columnStyles: {
            0: { cellWidth: 24, fontStyle: 'bold' },
            1: { cellWidth: 62 },
            2: { cellWidth: 22 },
            3: { cellWidth: 20 },
            4: { cellWidth: 24 },
            5: { cellWidth: 24 },
          },
          margin: { left: 15, right: 15 },
        });

        // ===== Informes de resolución =====
        doc.addPage();
        drawCorporateHeader(doc, {
          title: 'INFORMES DE RESOLUCIÓN',
          subtitle: `${selectedTecnico.nombre} ${selectedTecnico.apellidos}`,
          meta: `Generado: ${dateStr} · Periodo: ${filterLabel}`,
          bandHeight: 24,
        });

        let ry = 34;
        userCompletedTickets.forEach((t) => {
          const informe = t.informeResolucion
            ? t.informeResolucion.replace(/^Ticket resuelto por el técnico, pendiente de confirmación del cliente:\s*/i, '')
            : 'Sin informe registrado.';
          const blockHeight = 20 + Math.ceil(informe.length / 95) * 4.5;

          if (ry + blockHeight > pageHeight - 20) {
            doc.addPage();
            drawCorporateHeader(doc, {
              title: 'INFORMES DE RESOLUCIÓN',
              subtitle: 'Continuación',
              meta: `Generado: ${dateStr} · Periodo: ${filterLabel}`,
              bandHeight: 20,
            });
            ry = 30;
          }

          // Barra lateral de acento
          doc.setFillColor(79, 70, 229);
          doc.roundedRect(15, ry, 2.2, blockHeight - 4, 1, 1, 'F');
          doc.setTextColor(79, 70, 229);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.text(`${t.codigo} · ${t.titulo?.substring(0, 60) || ''}`, 21, ry + 5);
          doc.setTextColor(71, 85, 105);
          doc.setFontSize(8.5);
          doc.setFont('helvetica', 'normal');
          const lines = doc.splitTextToSize(informe, pageWidth - 40);
          doc.text(lines, 21, ry + 11);
          ry += blockHeight + 2;
        });
      }

      drawFooter(doc, `Informe por usuario · ${dateStr}`);
      doc.save(`Informe_Usuario_${selectedTecnico.nombre}_${selectedTecnico.apellidos}_${new Date().toISOString().slice(0, 10)}.pdf`.replace(/\s+/g, '_'));
    } catch (err) {
      console.error('Error exportando PDF por usuario:', err);
    } finally {
      setExporting(null);
    }
  };

  const filterOptions = [
    { value: 'all', label: 'Todos' },
    { value: 'month', label: 'Este Mes' },
    { value: 'year', label: 'Este Año' },
  ];

  const tooltipStyle = {
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    border: '1px solid #334155',
    borderRadius: '12px',
    color: '#f8fafc',
    fontSize: '12px',
    fontWeight: 600,
    boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
  };

  return (
    <div className="space-y-6">

      {/* ===== HERO ===== */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 px-6 py-7 sm:px-8 sm:py-9 shadow-xl shadow-indigo-500/20 print:hidden anim-fade-in-up">
        <div className="absolute -top-16 -right-16 w-56 h-56 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-10 w-64 h-64 bg-fuchsia-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-6 right-1/3 w-24 h-24 border border-white/15 rounded-full pointer-events-none" />
        <div className="absolute top-14 right-1/4 w-16 h-16 border border-white/10 rounded-full pointer-events-none hidden sm:block" />

        <div className="relative flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-[11px] font-black tracking-widest uppercase text-white/90 mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              Análisis y Métricas
            </span>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">Reportes e Informes</h1>
            <p className="text-blue-100/90 mt-2 font-medium text-sm sm:text-base max-w-xl">
              Visualiza el rendimiento del sistema de tickets y exporta informes profesionales en un clic.
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 text-xs font-bold text-white/85">
                <CalendarDays className="w-3.5 h-3.5" />
                {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 text-xs font-bold text-white/85">
                <Filter className="w-3.5 h-3.5" />
                {filterOptions.find(f => f.value === dateFilter)?.label}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 text-xs font-bold text-white/85 tabular-nums">
                {total} ticket{total !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={handleExportExcel}
              disabled={exporting === 'excel'}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-70 text-white rounded-xl transition-all shadow-lg shadow-emerald-900/30 font-bold text-sm active:scale-95 hover:-translate-y-0.5"
            >
              {exporting === 'excel' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
              Excel
            </button>
            <button
              onClick={handleExportPDF}
              disabled={exporting === 'pdf'}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-400 hover:to-red-400 disabled:opacity-70 text-white rounded-xl transition-all shadow-lg shadow-red-900/30 font-bold text-sm active:scale-95 hover:-translate-y-0.5"
            >
              {exporting === 'pdf' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              PDF
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white/15 hover:bg-white/25 backdrop-blur-sm border border-white/25 text-white rounded-xl transition-all font-bold text-sm active:scale-95 hover:-translate-y-0.5"
            >
              <Printer className="w-4 h-4" /> Imprimir
            </button>
          </div>
        </div>
      </div>

      {/* ===== FILTRO SEGMENTADO ===== */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden anim-fade-in-up" style={{ animationDelay: '60ms' }}>
        <div className="inline-flex bg-slate-100 dark:bg-slate-800/70 rounded-2xl p-1.5 gap-1 shadow-inner">
          {filterOptions.map(f => (
            <button
              key={f.value}
              onClick={() => setDateFilter(f.value)}
              className={`px-4 sm:px-5 py-2 rounded-xl text-sm font-bold transition-all duration-300 active:scale-95 ${
                dateFilter === f.value
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/30 scale-[1.03]'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          Mostrando <span className="font-black text-slate-800 dark:text-slate-200 tabular-nums">{total}</span> registro{total !== 1 ? 's' : ''}
        </p>
      </div>

      {/* ===== KPI CARDS ===== */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {kpis.map((k, i) => (
          <StatCard
            key={k.label}
            {...k}
            delay={120 + i * 70}
          />
        ))}
      </div>

      {/* ===== INFORME POR USUARIO ===== */}
      <div className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 anim-fade-in-up overflow-hidden" style={{ animationDelay: '360ms' }}>
        <div className="relative bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 px-5 sm:px-6 py-4">
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-sm border border-white/25 flex items-center justify-center">
                <UserCheck className="w-[18px] h-[18px] text-white" />
              </div>
              <div>
                <h3 className="font-extrabold text-white leading-tight">Informe por Usuario</h3>
                <p className="text-[11px] text-indigo-100 font-medium">Tickets completados y su informe de resolución</p>
              </div>
            </div>
            <button
              onClick={handleExportUserPDF}
              disabled={!selectedTecnicoId || exporting === 'user-pdf' || userCompletedTickets.length === 0}
              className="btn-shine flex items-center justify-center gap-2 px-4 py-2 bg-white text-indigo-700 rounded-xl text-xs font-black shadow-lg shadow-indigo-900/30 transition-all active:scale-95 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0 whitespace-nowrap"
            >
              {exporting === 'user-pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
              Exportar PDF
            </button>
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={selectedTecnicoId}
              onChange={(e) => setSelectedTecnicoId(e.target.value ? Number(e.target.value) : '')}
              className="flex-1 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all"
            >
              <option value="">Seleccionar técnico...</option>
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>{t.nombre} {t.apellidos}</option>
              ))}
            </select>
            {selectedTecnicoId && (
              <div className="inline-flex items-center gap-2 self-start">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {userCompletedTickets.length} completado{userCompletedTickets.length !== 1 ? 's' : ''}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300">
                  {userCompletedTickets.filter(t => t.estado === 'CERRADO').length} cerrado{userCompletedTickets.filter(t => t.estado === 'CERRADO').length !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>

          {!selectedTecnicoId ? (
            <p className="text-sm text-slate-400 font-medium py-6 text-center">Selecciona un técnico para ver sus tickets completados.</p>
          ) : userCompletedTickets.length === 0 ? (
            <p className="text-sm text-slate-400 font-medium py-6 text-center">
              El técnico no tiene tickets completados en el periodo seleccionado.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
                    <th className="px-4 py-2.5 font-black">Código</th>
                    <th className="px-4 py-2.5 font-black">Título</th>
                    <th className="px-4 py-2.5 font-black">Estado</th>
                    <th className="px-4 py-2.5 font-black hidden md:table-cell">Resolución</th>
                    <th className="px-4 py-2.5 font-black hidden lg:table-cell">Informe</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                  {pagedUserTickets.map((t) => (
                    <tr key={t.id} className="hover:bg-indigo-50/40 dark:hover:bg-indigo-500/5 transition-colors align-top">
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">{t.codigo}</span>
                      </td>
                      <td className="px-4 py-3 max-w-[220px]">
                        <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{t.titulo}</p>
                        <p className="text-[11px] text-slate-400">{new Date(t.fechaCreacion).toLocaleDateString('es-ES')}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-black uppercase ring-1 ${STATUS_BADGE[t.estado]}`}>
                          {STATUS_LABELS[t.estado] || t.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 hidden md:table-cell">
                        {t.fechaResolucion ? new Date(t.fechaResolucion).toLocaleDateString('es-ES') : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 hidden lg:table-cell max-w-[280px]">
                        <p className="line-clamp-2 leading-relaxed">
                          {t.informeResolucion?.replace(/^Ticket resuelto por el técnico, pendiente de confirmación del cliente:\s*/i, '') || 'Sin informe registrado.'}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {selectedTecnicoId && userCompletedTickets.length > 0 && (
            <Pagination
              page={userPage}
              pageSize={userPageSize}
              total={totalUserTickets}
              onPageChange={setUserPage}
              onPageSizeChange={setUserPageSize}
              label="tickets completados"
            />
          )}
        </div>
      </div>

      {/* ===== GRÁFICAS PRINCIPALES ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Donut Estado */}
        <div className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-xl transition-all duration-300 anim-fade-in-up" style={{ animationDelay: '420ms' }}>
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-500/15 flex items-center justify-center">
              <PieChartIcon className="w-[18px] h-[18px] text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white leading-tight">Distribución por Estado</h3>
              <p className="text-xs text-slate-400 font-medium">Proporción del ciclo de vida</p>
            </div>
          </div>
          {statusData.length > 0 ? (
            <>
              <div className="relative">
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={68}
                      outerRadius={98}
                      paddingAngle={4}
                      cornerRadius={6}
                      dataKey="value"
                      animationDuration={900}
                      animationEasing="cubic-bezier(.21,1.02,.73,1)"
                    >
                      {statusData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <p className="text-4xl font-black text-slate-900 dark:text-white tabular-nums">{total}</p>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tickets</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4">
                {statusData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 truncate flex-1">{d.name}</span>
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200 tabular-nums">{d.value}</span>
                    <span className="text-[10px] font-bold text-slate-400 tabular-nums w-9 text-right">
                      {total ? `${((d.value / total) * 100).toFixed(0)}%` : '0%'}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[280px] flex flex-col items-center justify-center text-slate-300 dark:text-slate-600 gap-2">
              <PieChartIcon className="w-10 h-10" />
              <p className="text-sm font-medium text-slate-400">Sin datos en este periodo</p>
            </div>
          )}
        </div>

        {/* Barras Prioridad */}
        <div className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-xl transition-all duration-300 anim-fade-in-up" style={{ animationDelay: '490ms' }}>
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-500/15 flex items-center justify-center">
              <BarChart3 className="w-[18px] h-[18px] text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white leading-tight">Distribución por Prioridad</h3>
              <p className="text-xs text-slate-400 font-medium">Urgencia de los tickets</p>
            </div>
          </div>
          {priorityData.length > 0 ? (
            <ResponsiveContainer width="100%" height={330}>
              <BarChart data={priorityData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                <defs>
                  {Object.keys(PRIORITY_COLORS).map(key => (
                    <linearGradient key={key} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={PRIORITY_COLORS[key]} stopOpacity={0.95} />
                      <stop offset="100%" stopColor={PRIORITY_COLORS[key]} stopOpacity={0.45} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" opacity={0.2} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
                <Bar dataKey="value" radius={[10, 10, 4, 4]} maxBarSize={64} animationDuration={900} animationEasing="cubic-bezier(.21,1.02,.73,1)">
                  {priorityData.map(entry => (
                    <Cell key={`cell-${entry.rawName}`} fill={`url(#grad-${entry.rawName})`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[330px] flex flex-col items-center justify-center text-slate-300 dark:text-slate-600 gap-2">
              <BarChart3 className="w-10 h-10" />
              <p className="text-sm font-medium text-slate-400">Sin datos en este periodo</p>
            </div>
          )}
        </div>
      </div>

      {/* ===== TOP CATEGORÍAS ===== */}
      {categoryData.length > 0 && (
        <div className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-xl transition-all duration-300 anim-fade-in-up" style={{ animationDelay: '560ms' }}>
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-500/15 flex items-center justify-center">
              <BarChart3 className="w-[18px] h-[18px] text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white leading-tight">Top Subcategorías</h3>
              <p className="text-xs text-slate-400 font-medium">Problemas más frecuentes reportados</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={Math.max(categoryData.length * 44 + 40, 220)}>
            <BarChart data={categoryData} layout="vertical" margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="gradCat" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.55} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.95} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#94a3b8" opacity={0.2} />
              <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} allowDecimals={false} />
              <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} width={140} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
              <Bar dataKey="value" fill="url(#gradCat)" radius={[0, 10, 10, 0]} maxBarSize={22} animationDuration={900} animationEasing="cubic-bezier(.21,1.02,.73,1)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ===== TABLA DETALLE ===== */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden anim-fade-in-up" style={{ animationDelay: '630ms' }}>
        <div className="px-5 sm:px-6 py-4 border-b border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-slate-900 dark:text-white">Detalle de Tickets</h3>
            <p className="text-xs text-slate-400 font-medium mt-0.5">{total} registro{total !== 1 ? 's' : ''} en el periodo seleccionado</p>
          </div>
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/70 dark:bg-slate-800/30 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-6 py-3.5 font-bold text-xs uppercase tracking-wider">Código</th>
                <th className="px-6 py-3.5 font-bold text-xs uppercase tracking-wider">Título</th>
                <th className="px-6 py-3.5 font-bold text-xs uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3.5 font-bold text-xs uppercase tracking-wider">Prioridad</th>
                <th className="px-6 py-3.5 font-bold text-xs uppercase tracking-wider">Técnico</th>
                <th className="px-6 py-3.5 font-bold text-xs uppercase tracking-wider">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-500 mx-auto mb-2" />
                    <span className="text-slate-500 font-medium">Cargando datos...</span>
                  </td>
                </tr>
              ) : filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-14 text-center">
                    <Inbox className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-500 font-bold">No hay datos para mostrar</p>
                    <p className="text-slate-400 text-sm mt-1">Prueba con otro filtro de fecha</p>
                  </td>
                </tr>
              ) : (
                pagedTickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    className="hover:bg-blue-50/50 dark:hover:bg-slate-800/40 transition-colors group/row"
                  >
                    <td className="px-6 py-3">
                      <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2 py-1 rounded-lg">
                        {ticket.codigo}
                      </span>
                    </td>
                    <td className="px-6 py-3 max-w-[260px] truncate font-bold text-slate-800 dark:text-slate-200 group-hover/row:text-blue-600 dark:group-hover/row:text-blue-400 transition-colors">
                      {ticket.titulo}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`inline-block text-[11px] font-bold px-2.5 py-1 rounded-full ring-1 ${STATUS_BADGE[ticket.estado] || 'bg-slate-100 text-slate-600 ring-slate-500/20'}`}>
                        {STATUS_LABELS[ticket.estado] || ticket.estado}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <span className={`inline-block text-[11px] font-bold px-2.5 py-1 rounded-full ring-1 ${PRIORITY_BADGE[ticket.prioridad] || 'bg-slate-100 text-slate-600 ring-slate-500/20'}`}>
                        {PRIORITY_LABELS[ticket.prioridad] || ticket.prioridad}
                      </span>
                    </td>
                    <td className="px-6 py-3 font-medium text-slate-600 dark:text-slate-400 text-xs">{ticket.tecnicoNombre || 'Sin asignar'}</td>
                    <td className="px-6 py-3 font-medium text-slate-500 dark:text-slate-400 text-xs tabular-nums">{new Date(ticket.fechaCreacion).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="md:hidden flex flex-col gap-3 p-4">
          {loading ? (
            <div className="p-6 text-center">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500 mx-auto" />
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="p-8 text-center">
              <Inbox className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500 text-sm font-medium">No hay datos para mostrar</p>
            </div>
          ) : (
            pagedTickets.map(ticket => (
              <div key={ticket.id} className="bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 rounded-xl p-4 shadow-sm active:scale-[0.98] transition-transform">
                <div className="flex justify-between items-center mb-2 gap-2">
                  <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">{ticket.codigo}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ring-1 ${STATUS_BADGE[ticket.estado] || ''}`}>
                    {STATUS_LABELS[ticket.estado] || ticket.estado}
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm leading-snug mb-2">{ticket.titulo}</h3>
                <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
                  <span>{ticket.tecnicoNombre || 'Sin asignar'}</span>
                  <span className="flex items-center gap-1.5">
                    <span className={`font-bold px-1.5 py-0.5 rounded ring-1 text-[10px] ${PRIORITY_BADGE[ticket.prioridad] || ''}`}>
                      {PRIORITY_LABELS[ticket.prioridad] || ticket.prioridad}
                    </span>
                    {new Date(ticket.fechaCreacion).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {!loading && filteredTickets.length > 0 && (
        <Pagination
          page={page}
          pageSize={pageSize}
          total={totalFilteredTickets}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          label="registros"
        />
      )}
    </div>
  );
}
