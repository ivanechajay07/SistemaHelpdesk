interface TooltipEntry {
  name?: string;
  dataKey?: string;
  value?: number | string;
  color?: string;
  payload?: Record<string, any>;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  /** Devuelve [valor, nombre] o solo el valor formateado. */
  formatter?: (value: any, name: string, entry: TooltipEntry) => [string, string] | string;
  /** Personaliza la etiqueta superior. */
  labelFormatter?: (label: any) => string;
  /** Oculta la fila de etiqueta (útil en donas). */
  hideLabel?: boolean;
}

/** Tooltip unificado y legible para los gráficos del sistema. */
export default function ChartTooltip({ active, payload, label, formatter, labelFormatter, hideLabel }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const topLabel = labelFormatter ? labelFormatter(label) : label;

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/95 px-3 py-2 shadow-xl shadow-black/40 backdrop-blur-sm min-w-[130px]">
      {!hideLabel && topLabel !== undefined && topLabel !== null && topLabel !== '' && (
        <p className="text-xs font-bold text-white mb-1.5">{topLabel}</p>
      )}
      <div className="space-y-1">
        {payload.map((entry, i) => {
          const rawName = entry.name ?? entry.dataKey ?? '';
          let value: any = entry.value;
          let displayName: string = String(rawName);

          if (formatter) {
            const res = formatter(entry.value, String(rawName), entry);
            if (Array.isArray(res)) {
              value = res[0];
              displayName = res[1];
            } else {
              value = res;
            }
          }

          const raw = entry.color || (entry.payload?.fill as string) || '#60a5fa';
          const dot = typeof raw === 'string' && raw.startsWith('url') ? '#60a5fa' : raw;

          return (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: dot }} />
              <span className="text-slate-300 font-medium truncate">{displayName}</span>
              <span className="text-white font-bold ml-auto tabular-nums pl-3">{value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
