/**
 * Paleta única para gráficos: misma familia cromática que el resto del
 * sistema (azul → cian → esmeralda → ámbar) y contraste suficiente en
 * modo claro y oscuro.
 */
export const CHART = {
  blue: '#3b82f6',
  sky: '#0ea5e9',
  cyan: '#06b6d4',
  teal: '#14b8a6',
  emerald: '#10b981',
  amber: '#f59e0b',
  orange: '#f97316',
  rose: '#ef4444',
  violet: '#8b5cf6',
  slate: '#94a3b8',
} as const;

/** Serie ordenada para gráficos de categorías, objetivos o técnicos. */
export const CHART_SERIES = [
  CHART.blue,
  CHART.cyan,
  CHART.emerald,
  CHART.amber,
  CHART.violet,
  CHART.sky,
  CHART.teal,
  CHART.rose,
  CHART.slate,
];

/** Colores de ejes y rejillas. */
export const CHART_AXIS = '#94a3b8';
export const CHART_GRID = '#94a3b8';

/** Colores por prioridad de ticket. */
export const PRIORITY_CHART_COLORS: Record<string, string> = {
  CRITICA: CHART.rose,
  ALTA: CHART.orange,
  MEDIA: CHART.amber,
  BAJA: CHART.emerald,
};

/** Colores por estado de monitoreo. */
export const MONITORING_STATUS_COLORS: Record<string, string> = {
  UP: CHART.emerald,
  DOWN: CHART.rose,
  PENDING: CHART.slate,
};
