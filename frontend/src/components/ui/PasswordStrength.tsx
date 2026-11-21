import { Check, X, ShieldCheck } from 'lucide-react';
import { cn } from '../../lib/utils';
import { evaluatePassword } from '../../lib/passwordPolicy';

interface PasswordStrengthProps {
  value: string;
  /** Mostrar aunque el campo esté vacío. */
  always?: boolean;
  className?: string;
}

const BAR_TONES = {
  rose: 'bg-gradient-to-r from-rose-500 to-red-500',
  amber: 'bg-gradient-to-r from-amber-400 to-orange-500',
  emerald: 'bg-gradient-to-r from-emerald-500 to-teal-500',
} as const;

const TEXT_TONES = {
  rose: 'text-rose-600 dark:text-rose-400',
  amber: 'text-amber-600 dark:text-amber-400',
  emerald: 'text-emerald-600 dark:text-emerald-400',
} as const;

/** Barra de seguridad + checklist de la política de contraseñas. */
export default function PasswordStrength({ value, always = false, className }: PasswordStrengthProps) {
  if (!value && !always) return null;

  const evaluation = evaluatePassword(value);

  return (
    <div className={cn('mt-2 rounded-xl border border-slate-200/80 bg-slate-50/80 p-3 dark:border-slate-700/70 dark:bg-slate-950/40', className)}>
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400">
          <ShieldCheck className="h-3.5 w-3.5" /> Seguridad de la contraseña
        </span>
        <span className={cn('text-[11px] font-black', TEXT_TONES[evaluation.tone])}>
          {evaluation.label} · {evaluation.met}/{evaluation.total}
        </span>
      </div>

      <div
        className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
        role="progressbar"
        aria-label="Seguridad de la contraseña"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={evaluation.percent}
      >
        <div
          className={cn('h-full rounded-full transition-all duration-300', BAR_TONES[evaluation.tone])}
          style={{ width: `${Math.max(6, evaluation.percent)}%` }}
        />
      </div>

      <ul className="mt-2.5 grid grid-cols-1 gap-1 sm:grid-cols-2">
        {evaluation.rules.map(({ rule, ok }) => (
          <li
            key={rule.id}
            className={cn(
              'inline-flex items-center gap-1.5 text-[11px] font-medium',
              ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500',
            )}
          >
            {ok ? <Check className="h-3.5 w-3.5 shrink-0" /> : <X className="h-3.5 w-3.5 shrink-0 opacity-40" />}
            {rule.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
