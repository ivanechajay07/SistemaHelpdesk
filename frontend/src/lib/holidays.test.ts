import { describe, expect, it } from 'vitest';
import { getPeruHolidays } from './holidays';

describe('getPeruHolidays', () => {
  it('incluye los feriados fijos', () => {
    const feriados = getPeruHolidays(2026);

    expect(feriados['2026-01-01']).toBe('Año Nuevo');
    expect(feriados['2026-07-28']).toBe('Fiestas Patrias');
    expect(feriados['2026-07-29']).toBe('Fiestas Patrias');
    expect(feriados['2026-12-25']).toBe('Navidad');
  });

  it('calcula Jueves y Viernes Santo (Semana Santa 2026)', () => {
    const feriados = getPeruHolidays(2026);

    // Pascua 2026: 5 de abril.
    expect(feriados['2026-04-02']).toBe('Jueves Santo');
    expect(feriados['2026-04-03']).toBe('Viernes Santo');
  });

  it('no mezcla años distintos', () => {
    const feriados = getPeruHolidays(2027);

    expect(feriados['2027-07-28']).toBe('Fiestas Patrias');
    expect(feriados['2026-07-28']).toBeUndefined();
  });
});
