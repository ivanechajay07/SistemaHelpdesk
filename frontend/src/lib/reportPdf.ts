import jsPDF from 'jspdf';

// Paleta corporativa SOBRIA: un solo color de marca (azul profundo) + neutros
export const BRAND: readonly number[] = [30, 58, 138]; // azul corporativo
export const TEXT: readonly number[] = [30, 41, 59];
export const MUTED: readonly number[] = [100, 116, 139];
export const LIGHT: readonly number[] = [241, 245, 249];
export const LINE: readonly number[] = [203, 213, 225];
export const WHITE: readonly number[] = [255, 255, 255];

const MARGIN = 15;

const rgb = (c: readonly number[]): [number, number, number] => [c[0], c[1], c[2]];

export function formatReportDate(d: Date = new Date()): string {
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' });
}

/**
 * Encabezado corporativo sobrio y ordenado:
 * banda superior de color único, LOGO CENTRADO, título y subtítulo centrados,
 * y una línea divisoria. Devuelve la coordenada Y donde inicia el contenido.
 */
export function drawCorporateHeader(
  doc: jsPDF,
  opts: { title: string; subtitle?: string; meta?: string; bandHeight?: number }
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const bandH = opts.bandHeight ?? 34;

  // Banda superior (único color de marca)
  doc.setFillColor(...rgb(BRAND));
  doc.rect(0, 0, pageWidth, bandH, 'F');

  // Logo del sistema centrado
  const logoW = 13;
  const logoH = 13;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(pageWidth / 2 - logoW / 2, 4.5, logoW, logoH, 2.2, 2.2, 'F');
  doc.setTextColor(...rgb(BRAND));
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('HD', pageWidth / 2, 13, { align: 'center' });

  // Nombre del sistema centrado
  doc.setTextColor(226, 232, 240);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('HELPDESK PRO · SISTEMA DE GESTIÓN DE SOPORTE TÉCNICO', pageWidth / 2, bandH - 6, {
    align: 'center',
  });

  // Título centrado
  doc.setTextColor(...rgb(TEXT));
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(opts.title, pageWidth / 2, bandH + 15, { align: 'center' });

  if (opts.subtitle) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...rgb(MUTED));
    doc.text(opts.subtitle, pageWidth / 2, bandH + 21, { align: 'center' });
  }
  if (opts.meta) {
    doc.setFontSize(8);
    doc.text(opts.meta, pageWidth / 2, bandH + 26, { align: 'center' });
  }

  // Línea divisoria centrada
  doc.setDrawColor(...rgb(BRAND));
  doc.setLineWidth(0.5);
  doc.line(pageWidth / 2 - 45, bandH + 31, pageWidth / 2 + 45, bandH + 31);

  return bandH + 37;
}

/** Título de sección: marcador de color único + texto en mayúsculas + línea. */
export function drawSectionTitle(doc: jsPDF, text: string, y: number): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFillColor(...rgb(BRAND));
  doc.roundedRect(MARGIN, y - 4, 3, 7, 1, 1, 'F');
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...rgb(TEXT));
  doc.text(text.toUpperCase(), MARGIN + 6, y);
  doc.setDrawColor(...rgb(BRAND));
  doc.setLineWidth(0.35);
  doc.line(MARGIN, y + 3.5, pageWidth - MARGIN, y + 3.5);
  return y + 9;
}

/** Pie de página sobrio en todas las páginas, con "Página X de Y". */
export function drawFooter(doc: jsPDF, label: string) {
  const pages = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...rgb(BRAND));
    doc.setLineWidth(0.4);
    doc.line(MARGIN, pageHeight - 14, pageWidth - MARGIN, pageHeight - 14);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...rgb(MUTED));
    doc.text('HELPDESK PRO · Sistema de Gestión de Soporte Técnico', MARGIN, pageHeight - 9);
    doc.text('Documento generado electrónicamente por el sistema.', MARGIN, pageHeight - 4.5);
    doc.text(`Página ${i} de ${pages}`, pageWidth - MARGIN, pageHeight - 9, { align: 'right' });
    doc.text(label, pageWidth - MARGIN, pageHeight - 4.5, { align: 'right' });
  }
}

/** Tarjetas KPI en un SOLO color de marca, sobrias y uniformes. */
export function drawKpiCards(
  doc: jsPDF,
  items: { label: string; value: string }[],
  y: number
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const gap = 5;
  const w = (pageWidth - MARGIN * 2 - gap * (items.length - 1)) / items.length;
  let x = MARGIN;
  items.forEach((k) => {
    doc.setFillColor(...rgb(BRAND));
    doc.roundedRect(x, y, w, 17, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.text(k.label.toUpperCase(), x + 5, y + 6.5);
    doc.setFontSize(12);
    doc.text(k.value, x + 5, y + 13.5);
    x += w + gap;
  });
  return y + 22;
}