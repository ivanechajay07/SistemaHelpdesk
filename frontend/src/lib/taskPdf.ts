import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Task, TaskEvidence } from '../store/taskStore';
import { drawCorporateHeader, drawSectionTitle, drawFooter, BRAND, TEXT, MUTED, LIGHT, LINE } from './reportPdf';

export interface TaskPdfData {
  task: Task;
  evidencias: TaskEvidence[];
}

const MARGIN = 15;
const BOTTOM_SAFE = 18;
const MAX_IMG_H = 95;

const rgb = (c: readonly number[]): [number, number, number] => [c[0], c[1], c[2]];

const formatDate = (value?: string | null): string => {
  if (!value) return '—';
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = new Date(dateOnly ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' });
};

const getFormat = (dataUrl: string): 'PNG' | 'JPEG' =>
  dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

export async function generarTareaPdf({ task, evidencias }: TaskPdfData): Promise<jsPDF> {
  const doc = new jsPDF('p', 'mm', 'letter');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = 0;

  const ensure = (h: number) => {
    if (y + h > pageHeight - BOTTOM_SAFE) {
      doc.addPage();
      y = MARGIN;
    }
  };

  // ===== ENCABEZADO =====
  y = drawCorporateHeader(doc, {
    title: 'INFORME DE TAREA',
    subtitle: 'Gestor de Tareas · Seguimiento del trabajo asignado',
    meta: `Prioridad: ${task.prioridad} · Estado: ${task.estado.replace('_', ' ')}`,
  });
  y += 4;

  // ===== INFORMACIÓN DE LA TAREA =====
  y = drawSectionTitle(doc, 'Información de la Tarea', y);
  autoTable(doc, {
    startY: y,
    head: [['Campo', 'Detalle']],
    body: [
      ['Título', task.titulo],
      ['Estado', task.estado.replace('_', ' ')],
      ['Prioridad', task.prioridad],
      ['Técnico asignado', task.tecnicoNombre || 'Sin asignar'],
      ['Asignada por', task.creadorNombre || '—'],
      ['Periodo planificado', `${formatDate(task.fechaInicio)} al ${formatDate(task.fechaFin)}`],
      ['Fecha de registro', formatDate(task.fechaCreacion)],
      ['Inicio de proceso', formatDate(task.fechaInicioProceso)],
      ['Fecha de finalización', formatDate(task.fechaCompletada)],
    ],
    theme: 'grid',
    headStyles: { fillColor: [...rgb(BRAND)], fontSize: 8.5, fontStyle: 'bold', halign: 'center' },
    bodyStyles: { fontSize: 8.5, textColor: [...rgb(TEXT)] },
    alternateRowStyles: { fillColor: [...rgb(LIGHT)] },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 48, fillColor: [241, 245, 249] } },
    styles: { cellPadding: 2.2 },
    margin: { left: MARGIN, right: MARGIN },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // ===== DESCRIPCIÓN =====
  if (task.descripcion) {
    y = drawSectionTitle(doc, 'Descripción', y);
    const tw = pageWidth - MARGIN * 2;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(task.descripcion, tw - 10);
    const lineH = 4.2;
    const pad = 4.5;
    const boxH = lines.length * lineH + pad * 2;
    ensure(boxH + 8);
    const boxTop = y - 2;
    doc.setFillColor(...rgb(LIGHT));
    doc.setDrawColor(...rgb(LINE));
    doc.setLineWidth(0.2);
    doc.roundedRect(MARGIN, boxTop, tw, boxH, 1.5, 1.5, 'F');
    doc.setTextColor(...rgb(TEXT));
    doc.text(lines, MARGIN + 5, boxTop + pad + lineH - 1);
    y = boxTop + boxH + 8;
  }

  // ===== EVIDENCIAS =====
  const grupos: { tipo: 'PROCESO' | 'COMPLETADA'; titulo: string }[] = [
    { tipo: 'PROCESO', titulo: 'Evidencia de Avance (En Proceso)' },
    { tipo: 'COMPLETADA', titulo: 'Evidencia del Trabajo Realizado (Completada)' },
  ];

  const hayEvidencias = evidencias.length > 0;
  if (!hayEvidencias) {
    y = drawSectionTitle(doc, 'Evidencia', y);
    doc.setFontSize(9);
    doc.setTextColor(...rgb(MUTED));
    doc.text('No se registraron imágenes de evidencia para esta tarea.', MARGIN, y);
    y += 10;
  }

  for (const grupo of grupos) {
    const items = evidencias.filter((e) => e.tipo === grupo.tipo);
    if (items.length === 0) continue;

    ensure(16);
    y = drawSectionTitle(doc, grupo.titulo, y);
    y += 2;

    for (const ev of items) {
      let img: HTMLImageElement | null = null;
      try {
        img = await loadImage(ev.imagenData);
      } catch {
        img = null;
      }

      if (img) {
        const maxW = pageWidth - MARGIN * 2;
        let w = maxW;
        let h = (img.height / img.width) * w;
        if (h > MAX_IMG_H) {
          h = MAX_IMG_H;
          w = (img.width / img.height) * h;
        }
        ensure(h + 16);
        const x = MARGIN;
        const framePad = 2;
        doc.setDrawColor(...rgb(LINE));
        doc.setLineWidth(0.3);
        doc.roundedRect(x - framePad, y - 2 - framePad, w + framePad * 2, h + framePad * 2, 1.5, 1.5, 'S');
        doc.addImage(ev.imagenData, getFormat(ev.imagenData), x, y - 2, w, h);
        y += h + 3;
      } else {
        ensure(8);
        doc.setFontSize(8.5);
        doc.setTextColor(...rgb(MUTED));
        doc.text('[Imagen no disponible]', MARGIN, y + 2);
        y += 7;
      }

      const meta = `${ev.comentario ? ev.comentario + ' · ' : ''}${formatDate(ev.fechaCreacion)}${
        ev.subidoPorNombre ? ' · ' + ev.subidoPorNombre : ''
      }`;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(...rgb(MUTED));
      const metaLines = doc.splitTextToSize(meta, pageWidth - MARGIN * 2);
      doc.text(metaLines, MARGIN, y + 1);
      y += metaLines.length * 3.6 + 6;
    }
  }

  // ===== PIE DE PÁGINA =====
  drawFooter(doc, `Informe de tarea · ${task.titulo}`);

  return doc;
}
