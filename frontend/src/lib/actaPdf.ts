import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Ticket } from '../store/ticketStore';
import { drawCorporateHeader, drawSectionTitle, drawFooter, BRAND, TEXT, MUTED, LIGHT, LINE } from './reportPdf';

export interface ActaPdfData {
  ticket: Ticket;
  fecha: string;
  trabajosRealizados: string;
  observaciones?: string | null;
  fotoData?: string | null;
  firmaSolicitante: string;
  firmaTecnico: string;
}

const MARGIN = 15;
const BOTTOM_SAFE = 18;

const rgb = (c: readonly number[]): [number, number, number] => [c[0], c[1], c[2]];

const formatDate = (value?: string | null): string => {
  if (!value) return '—';
  // Fecha sola (YYYY-MM-DD) se interpreta en hora local; si ya trae hora
  // (ISO date-time, como fechaCreacion/fechaResolucion) se usa tal cual.
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = new Date(dateOnly ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
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

export async function generarActaPdf(data: ActaPdfData): Promise<jsPDF> {
  const { ticket, fecha, trabajosRealizados, observaciones, fotoData, firmaSolicitante, firmaTecnico } = data;
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

  // Párrafo en recuadro sobrio
  const boxedText = (text: string) => {
    const tw = pageWidth - MARGIN * 2;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(text, tw - 10);
    const lineH = 4.2;
    const pad = 4.5;
    const boxH = lines.length * lineH + pad * 2;
    ensure(boxH + 4);
    const boxTop = y - 2;
    doc.setFillColor(...rgb(LIGHT));
    doc.setDrawColor(...rgb(LINE));
    doc.setLineWidth(0.2);
    doc.roundedRect(MARGIN, boxTop, tw, boxH, 1.5, 1.5, 'F');
    doc.setTextColor(...rgb(TEXT));
    doc.text(lines, MARGIN + 5, boxTop + pad + lineH - 1);
    y = boxTop + boxH + 8;
  };

  // ===== ENCABEZADO CORPORATIVO (logo centrado, color único) =====
  y = drawCorporateHeader(doc, {
    title: 'ACTA DE CONFORMIDAD',
    subtitle: 'Servicio de Soporte Técnico · Solución de Incidencias',
    meta: `N° ${ticket.codigo} · Fecha: ${fecha}`,
  });
  y += 4;

  // ===== INFORMACIÓN DEL SERVICIO =====
  y = drawSectionTitle(doc, 'Información del Servicio', y);
  autoTable(doc, {
    startY: y,
    head: [['Campo', 'Detalle']],
    body: [
      ['Código de ticket', ticket.codigo],
      ['Título', ticket.titulo],
      [
        'Categoría',
        ticket.subcategoriaNombre
          ? `${ticket.categoriaNombre} / ${ticket.subcategoriaNombre}`
          : ticket.categoriaNombre || '—',
      ],
      ['Prioridad', ticket.prioridad],
      ['Entidad / Sede', `${ticket.entidad || '—'} / ${ticket.sede || '—'}`],
      ['Estado', ticket.estado],
      ['Solicitante', ticket.solicitanteNombre],
      ['Técnico responsable', ticket.tecnicoNombre || 'Sin asignar'],
      ['Fecha de conformidad', fecha],
      ['Fecha de creación', formatDate(ticket.fechaCreacion)],
      ['Fecha de resolución', formatDate(ticket.fechaResolucion)],
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

  // ===== TRABAJOS REALIZADOS =====
  y = drawSectionTitle(doc, 'Trabajos Realizados', y);
  boxedText(trabajosRealizados);

  // ===== OBSERVACIONES =====
  if (observaciones) {
    y = drawSectionTitle(doc, 'Observaciones', y);
    boxedText(observaciones);
  }

  // ===== DECLARACIÓN DE CONFORMIDAD =====
  y = drawSectionTitle(doc, 'Declaración de Conformidad', y);
  boxedText(
    `El(la) suscrito(a), ${ticket.solicitanteNombre}, en calidad de solicitante del servicio identificado con el código ${ticket.codigo}, declara haber recibido y verificado la solución brindada por ${ticket.tecnicoNombre || 'el técnico responsable'}, manifestando su conformidad con los trabajos ejecutados y con la calidad del servicio prestado, no existiendo observación pendiente alguna por parte de quien suscribe.`
  );

  // ===== EVIDENCIA FOTOGRÁFICA =====
  if (fotoData) {
    y = drawSectionTitle(doc, 'Evidencia Fotográfica', y);
    const img = await loadImage(fotoData);
    const maxW = pageWidth - MARGIN * 2;
    const maxH = 80;
    let w = maxW;
    let h = (img.height / img.width) * w;
    if (h > maxH) {
      h = maxH;
      w = (img.width / img.height) * h;
    }
    ensure(h + 14);
    const x = (pageWidth - w) / 2;
    const framePad = 2.5;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...rgb(LINE));
    doc.setLineWidth(0.3);
    doc.roundedRect(x - framePad, y - 2 - framePad, w + framePad * 2, h + framePad * 2, 1.5, 1.5, 'S');
    doc.addImage(fotoData, getFormat(fotoData), x, y - 2, w, h);
    y += h + 2;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...rgb(MUTED));
    doc.text('Registro fotográfico del trabajo realizado', pageWidth / 2, y, { align: 'center' });
    y += 10;
  }

  // ===== FIRMAS DE CONFORMIDAD =====
  if (y > pageHeight - 82) {
    doc.addPage();
    y = MARGIN + 4;
  }
  y = drawSectionTitle(doc, 'Firmas de Conformidad', y);
  y += 2;

  const sigSolicitante = await loadImage(firmaSolicitante);
  const sigTecnico = await loadImage(firmaTecnico);

  const colGap = 12;
  const colW = (pageWidth - MARGIN * 2 - colGap) / 2;
  const sigW = colW;
  const sigH = 34;
  const sigY = y;

  const placeSignature = (x: number, img: HTMLImageElement, dataUrl: string, name: string, role: string) => {
    const h = Math.min((img.height / img.width) * sigW, sigH);
    const imgY = sigY + (sigH - h);
    doc.setFillColor(...rgb(LIGHT));
    doc.setDrawColor(...rgb(LINE));
    doc.setLineWidth(0.2);
    doc.roundedRect(x, sigY, sigW, sigH, 1.5, 1.5, 'F');
    doc.addImage(dataUrl, getFormat(dataUrl), x + 1, imgY + 1, sigW - 2, h - 1);
    doc.setDrawColor(...rgb(BRAND));
    doc.setLineWidth(0.5);
    doc.line(x + 3, sigY + sigH + 4, x + sigW - 3, sigY + sigH + 4);
    doc.setTextColor(...rgb(TEXT));
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(name, x + sigW / 2, sigY + sigH + 8, { align: 'center' });
    doc.setTextColor(...rgb(MUTED));
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.text(role.toUpperCase(), x + sigW / 2, sigY + sigH + 12, { align: 'center' });
  };

  placeSignature(MARGIN, sigSolicitante, firmaSolicitante, ticket.solicitanteNombre, 'Solicitante');
  placeSignature(MARGIN + colW + colGap, sigTecnico, firmaTecnico, ticket.tecnicoNombre || 'Sin asignar', 'Técnico Responsable');

  // ===== PIE DE PÁGINA =====
  drawFooter(doc, `Acta de Conformidad · ${fecha}`);

  return doc;
}