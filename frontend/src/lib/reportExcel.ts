import * as XLSX from 'xlsx-js-style';

// Paleta corporativa sobria: un solo color de marca (azul profundo) + neutros
export const XC = {
  brand: '1E3A8A',
  navy: '0F172A',
  light: 'F1F5F9',
  white: 'FFFFFF',
  text: '1E293B',
  muted: '64748B',
  border: 'CBD5E1',
} as const;

type CellStyle = XLSX.CellStyle;

const solid = (rgb: string) => ({ fgColor: { rgb }, patternType: 'solid' as const });

const thinBorder = (color: string) => ({
  top: { style: 'thin' as const, color: { rgb: color } },
  bottom: { style: 'thin' as const, color: { rgb: color } },
  left: { style: 'thin' as const, color: { rgb: color } },
  right: { style: 'thin' as const, color: { rgb: color } },
});

export const exTitle: CellStyle = {
  font: { bold: true, color: { rgb: XC.white }, sz: 15 },
  fill: solid(XC.brand),
  alignment: { horizontal: 'center', vertical: 'center' },
};

export const exSubtitle: CellStyle = {
  font: { bold: true, color: { rgb: XC.muted }, sz: 10 },
  fill: solid(XC.light),
  alignment: { horizontal: 'left', vertical: 'center' },
};

export const exHeader: CellStyle = {
  font: { bold: true, color: { rgb: XC.white }, sz: 10 },
  fill: solid(XC.brand),
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  border: thinBorder(XC.navy),
};

export const exData: CellStyle = {
  font: { color: { rgb: XC.text }, sz: 9.5 },
  alignment: { vertical: 'center', wrapText: true },
  border: thinBorder(XC.border),
};

export const exDataAlt: CellStyle = {
  font: { color: { rgb: XC.text }, sz: 9.5 },
  fill: solid(XC.light),
  alignment: { vertical: 'center', wrapText: true },
  border: thinBorder(XC.border),
};

export const exLabel: CellStyle = {
  font: { bold: true, color: { rgb: XC.text }, sz: 10 },
  alignment: { horizontal: 'left', vertical: 'center' },
  border: thinBorder(XC.border),
};

export const exValue: CellStyle = {
  font: { color: { rgb: XC.muted }, sz: 10 },
  alignment: { horizontal: 'left', vertical: 'center' },
  border: thinBorder(XC.border),
};

export const exSection: CellStyle = {
  font: { bold: true, color: { rgb: XC.brand }, sz: 11 },
  fill: solid(XC.light),
  alignment: { horizontal: 'left', vertical: 'center' },
  border: thinBorder(XC.border),
};

export function setCell(ws: XLSX.WorkSheet, row: number, col: number, value: unknown, style: CellStyle) {
  const addr = XLSX.utils.encode_cell({ r: row, c: col });
  ws[addr] = { v: value, s: style };
}

export function styleRow(ws: XLSX.WorkSheet, row: number, cols: number, style: CellStyle) {
  for (let c = 0; c < cols; c++) {
    const addr = XLSX.utils.encode_cell({ r: row, c });
    const cell = ws[addr];
    if (cell && cell.t !== 'z') cell.s = style;
  }
}

export function styleRange(ws: XLSX.WorkSheet, fromRow: number, toRow: number, cols: number, style: CellStyle) {
  for (let r = fromRow; r <= toRow; r++) styleRow(ws, r, cols, style);
}

export function mergeRow(ws: XLSX.WorkSheet, row: number, colStart: number, colEnd: number, value: unknown, style: CellStyle) {
  setCell(ws, row, colStart, value, style);
  ws['!merges'] = ws['!merges'] || [];
  ws['!merges'].push({ s: { r: row, c: colStart }, e: { r: row, c: colEnd } });
}

export function setCols(ws: XLSX.WorkSheet, widths: number[]) {
  ws['!cols'] = widths.map((wch) => ({ wch }));
}

export function downloadWorkbook(wb: XLSX.WorkBook, filename: string) {
  XLSX.writeFile(wb, filename);
}