import { describe, expect, it } from 'vitest';
import { IDLE_TIMEOUT_MS, isIdle } from './idle';

describe('isIdle', () => {
  it('no marca inactividad antes del límite', () => {
    const now = 1_000_000;
    expect(isIdle(now - 60_000, now, 15 * 60_000)).toBe(false);
  });

  it('marca inactividad justo al alcanzar el límite', () => {
    const now = 1_000_000;
    expect(isIdle(now - 15 * 60_000, now, 15 * 60_000)).toBe(true);
  });

  it('marca inactividad después del límite', () => {
    const now = 1_000_000;
    expect(isIdle(now - 20 * 60_000, now, 15 * 60_000)).toBe(true);
  });

  it('se desactiva con timeout 0 o inválido', () => {
    expect(isIdle(0, 1_000_000, 0)).toBe(false);
    expect(isIdle(0, 1_000_000, Number.NaN)).toBe(false);
  });

  it('expone un timeout por defecto de 15 minutos', () => {
    expect(IDLE_TIMEOUT_MS).toBe(15 * 60_000);
  });
});
