import { Clock, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

type SlaEstado = 'EN_TIEMPO' | 'POR_VENCER' | 'VENCIDO' | 'CUMPLIDO';

const CONFIG: Record<SlaEstado, { label: string; icon: React.ElementType; classes: string }> = {
  EN_TIEMPO: {
    label: 'SLA en tiempo',
    icon: Clock,
    classes: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/30',
  },
  POR_VENCER: {
    label: 'Por vencer',
    icon: AlertTriangle,
    classes: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/30',
  },
  VENCIDO: {
    label: 'SLA vencido',
    icon: XCircle,
    classes: 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/30',
  },
  CUMPLIDO: {
    label: 'SLA cumplido',
    icon: CheckCircle2,
    classes: 'bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-500/10 dark:text-sky-400 dark:ring-sky-500/30',
  },
};

export default function SlaBadge({
  estado,
  horasRestantes,
  limiteHoras,
}: {
  estado?: string | null;
  horasRestantes?: number | null;
  limiteHoras?: number | null;
}) {
  if (!estado) return null;
  const cfg = CONFIG[estado as SlaEstado];
  if (!cfg) return null;
  const Icon = cfg.icon;

  let detail = '';
  if ((estado === 'EN_TIEMPO' || estado === 'POR_VENCER') && horasRestantes != null) {
    detail = `${Math.max(0, Math.round(horasRestantes))}h restantes`;
  } else if (estado === 'VENCIDO' && limiteHoras) {
    detail = `límite ${limiteHoras}h`;
  } else if (estado === 'CUMPLIDO' && limiteHoras) {
    detail = `${limiteHoras}h`;
  }

  return (
    <span
      title={`SLA de resolución: ${limiteHoras ?? '?'} horas`}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wide ring-1 ${cfg.classes}`}
    >
      <Icon className="w-3 h-3" />
      <span className="hidden xl:inline">{detail || cfg.label}</span>
    </span>
  );
}
