import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { getPeruHolidays } from '../../lib/holidays';

interface MiniCalendarProps {
  /** Mapa 'YYYY-MM-DD' -> número de eventos de ese día. */
  events?: Record<string, number>;
  onDayClick?: (date: string) => void;
}

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const pad = (n: number) => String(n).padStart(2, '0');

/** Calendario compacto y adaptable para el Dashboard, con feriados. */
export default function MiniCalendar({ events = {}, onDayClick }: MiniCalendarProps) {
  const today = new Date();
  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() });

  const holidays = useMemo(() => getPeruHolidays(view.year), [view.year]);

  const first = new Date(view.year, view.month, 1);
  const startWeekday = (first.getDay() + 6) % 7; // lunes = 0
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: startWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const monthLabel = first.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  const dayKey = (d: number) => `${view.year}-${pad(view.month + 1)}-${pad(d)}`;
  const isToday = (d: number) =>
    view.year === today.getFullYear() && view.month === today.getMonth() && d === today.getDate();

  // Feriados del mes visible
  const monthHolidays = useMemo(() => {
    const prefix = `${view.year}-${pad(view.month + 1)}-`;
    return Object.entries(holidays)
      .filter(([date]) => date.startsWith(prefix))
      .map(([date, name]) => ({ date, day: Number(date.slice(-2)), name }))
      .sort((a, b) => a.day - b.day);
  }, [holidays, view.year, view.month]);

  const move = (delta: number) => {
    setView((v) => {
      const m = v.month + delta;
      if (m < 0) return { year: v.year - 1, month: 11 };
      if (m > 11) return { year: v.year + 1, month: 0 };
      return { year: v.year, month: m };
    });
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col hover:shadow-md transition-shadow">
      {/* Cabecera */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-500/15 flex items-center justify-center shrink-0">
            <CalendarDays className="w-[18px] h-[18px] text-blue-600 dark:text-blue-400" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white capitalize leading-tight truncate">{monthLabel}</h2>
            <p className="text-[11px] text-slate-400 font-medium">Calendario de tickets</p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => move(-1)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors" title="Mes anterior">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => setView({ year: today.getFullYear(), month: today.getMonth() })} className="px-2.5 py-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 rounded-lg transition-colors">
            Hoy
          </button>
          <button onClick={() => move(1)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors" title="Mes siguiente">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Días de la semana */}
      <div className="grid grid-cols-7 gap-1.5 mb-1">
        {WEEKDAYS.map((w, i) => (
          <span key={i} className="text-center text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 py-1">{w}</span>
        ))}
      </div>

      {/* Días */}
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((d, i) => {
          if (d === null) return <span key={`e-${i}`} />;
          const k = dayKey(d);
          const count = events[k] || 0;
          const holiday = holidays[k];
          const base = isToday(d)
            ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md shadow-blue-500/30'
            : holiday
              ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20'
              : count > 0
                ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800';
          return (
            <button
              key={k}
              onClick={() => onDayClick?.(k)}
              title={holiday ? `Feriado: ${holiday}` : count > 0 ? `${count} evento(s)` : undefined}
              className={`relative aspect-square rounded-xl text-xs font-bold flex items-center justify-center transition-all active:scale-95 ${base}`}
            >
              {d}
              {(holiday || count > 0) && (
                <span className={`absolute bottom-1 w-1 h-1 rounded-full ${isToday(d) ? 'bg-white' : holiday ? 'bg-rose-500' : 'bg-blue-500'}`} />
              )}
              {count > 1 && !isToday(d) && (
                <span className="absolute top-0.5 right-0.5 min-w-[14px] h-[14px] px-0.5 flex items-center justify-center text-[8px] font-black rounded-full bg-blue-600 text-white">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500" /> Con eventos</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500" /> Feriado</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-gradient-to-br from-blue-500 to-blue-600" /> Hoy</span>
      </div>

      {/* Feriados del mes */}
      {monthHolidays.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Feriados del mes</p>
          {monthHolidays.map((h) => (
            <div key={h.date} className="flex items-center gap-2 text-[11px]">
              <span className="w-6 shrink-0 font-black text-rose-500 tabular-nums">{h.day}</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">{h.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
