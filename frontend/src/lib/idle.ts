/**
 * Utilidades de inactividad de sesión.
 *
 * El tiempo se configura con VITE_IDLE_TIMEOUT_MINUTES en tiempo de build.
 * Valor por defecto: 15 minutos.
 */
const configurado = Number(import.meta.env.VITE_IDLE_TIMEOUT_MINUTES ?? 15);

// 0 desactiva el cierre automático; valores inválidos usan 15 minutos.
export const IDLE_TIMEOUT_MINUTES =
  Number.isFinite(configurado) && configurado >= 0 ? configurado : 15;

export const IDLE_TIMEOUT_MS = IDLE_TIMEOUT_MINUTES * 60_000;

/** true si ha pasado el tiempo de inactividad desde `lastActivity`. */
export function isIdle(lastActivity: number, now: number, timeoutMs: number = IDLE_TIMEOUT_MS): boolean {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return false;
  return now - lastActivity >= timeoutMs;
}
