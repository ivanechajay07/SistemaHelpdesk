// Feriados nacionales (Perú). Incluye fechas fijas y las movibles (Semana Santa).

const pad = (n: number) => String(n).padStart(2, '0');
const key = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Domingo de Pascua (algoritmo gregoriano anónimo). */
function getEaster(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

/** Devuelve un mapa 'YYYY-MM-DD' -> nombre del feriado para el año indicado. */
export function getPeruHolidays(year: number): Record<string, string> {
  const h: Record<string, string> = {};
  const add = (month: number, day: number, name: string) => {
    h[`${year}-${pad(month)}-${pad(day)}`] = name;
  };

  add(1, 1, 'Año Nuevo');
  add(5, 1, 'Día del Trabajo');
  add(6, 29, 'San Pedro y San Pablo');
  add(7, 28, 'Fiestas Patrias');
  add(7, 29, 'Fiestas Patrias');
  add(8, 30, 'Santa Rosa de Lima');
  add(10, 8, 'Combate de Angamos');
  add(11, 1, 'Todos los Santos');
  add(12, 8, 'Inmaculada Concepción');
  add(12, 25, 'Navidad');

  const easter = getEaster(year);
  const juevesSanto = new Date(easter);
  juevesSanto.setDate(easter.getDate() - 3);
  const viernesSanto = new Date(easter);
  viernesSanto.setDate(easter.getDate() - 2);
  h[key(juevesSanto)] = 'Jueves Santo';
  h[key(viernesSanto)] = 'Viernes Santo';

  return h;
}
