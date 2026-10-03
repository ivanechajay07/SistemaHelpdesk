import { useEffect } from 'react';
import { useMonitoringStore } from '../store/monitoringStore';
import ChartTooltip from '../components/ui/ChartTooltip';
import {
  Activity, AlertTriangle, CheckCircle2, Timer, TrendingUp, CalendarDays, Server, Loader2,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area, LabelList,
} from 'recharts';

const COLORS = ['#06b6d4', '#3b82f6', '#f59e0b', '#ef4444', '#10b981', '#0ea5e9'];

export default function MonitoringDashboard() {
  const { dashboard, dashboardLoading, fetchDashboard } = useMonitoringStore();

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  if (dashboardLoading && !dashboard) {
    return <div className="flex items-center justify-center py-32"><Loader2 className="w-8 h-8 animate-spin text-cyan-500" /></div>;
  }

  const d = dashboard;
  const kpis = [
    { label: 'Incidencias totales', value: d?.totalIncidencias ?? 0, icon: Activity, cls: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-400' },
    { label: 'Abiertas', value: d?.abiertas ?? 0, icon: AlertTriangle, cls: 'bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400', alert: (d?.abiertas ?? 0) > 0 },
    { label: 'Resueltas', value: d?.resueltas ?? 0, icon: CheckCircle2, cls: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400' },
    { label: 'Duración media', value: d?.duracionPromedioMin != null ? `${d.duracionPromedioMin} min` : '—', icon: Timer, cls: 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400' },
  ];

  const hasData = (d?.totalIncidencias ?? 0) > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-cyan-600 via-blue-700 to-slate-900 px-6 py-7 sm:px-8 sm:py-9 shadow-xl shadow-blue-500/20 anim-fade-in-up">
        <div className="absolute -top-16 -right-16 w-56 h-56 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-10 w-64 h-64 bg-cyan-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/25 flex items-center justify-center shrink-0">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-[11px] font-black tracking-widest uppercase text-white/90 mb-2">
              Monitoreo de Red
            </span>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">Dashboard de Incidencias</h1>
            <p className="text-white/85 mt-1.5 font-medium text-sm sm:text-base max-w-2xl">Resumen de caídas detectadas por el monitoreo, por día, mes y año.</p>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k, i) => (
          <div key={k.label} className="group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 anim-fade-in-up" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{k.label}</p>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${k.cls} transition-transform group-hover:scale-110 ${k.alert ? 'animate-pulse' : ''}`}>
                <k.icon className="w-[18px] h-[18px]" />
              </div>
            </div>
            <p className="text-3xl font-black text-slate-800 dark:text-white tabular-nums leading-none">{k.value}</p>
          </div>
        ))}
      </div>

      {!hasData ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-20 flex flex-col items-center gap-2 text-slate-300 dark:text-slate-600">
          <Activity className="w-10 h-10" />
          <p className="text-sm font-medium text-slate-400">Aún no hay incidencias registradas</p>
          <p className="text-xs text-slate-400">Las caídas detectadas por el monitoreo aparecerán aquí.</p>
        </div>
      ) : (
        <>
          {/* Por día */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow anim-fade-in-up">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-500/15 flex items-center justify-center">
                <CalendarDays className="w-[18px] h-[18px] text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-white leading-tight">Incidencias por Día</h3>
                <p className="text-xs text-slate-400 font-medium">Últimos 30 días</p>
              </div>
            </div>
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={d!.porDia} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradIncDia" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.12} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} interval={4} dy={8} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} dx={-8} />
                  <Tooltip content={<ChartTooltip formatter={(v: any) => [`${v} incidencias`, 'Incidencias']} />} cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '4 4' }} />
                  <Area type="monotone" dataKey="value" stroke="#06b6d4" strokeWidth={2.5} fill="url(#gradIncDia)" isAnimationActive animationDuration={1000} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Por mes y por año */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow anim-fade-in-up">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-9 h-9 rounded-xl bg-cyan-100 dark:bg-cyan-500/15 flex items-center justify-center">
                  <TrendingUp className="w-[18px] h-[18px] text-cyan-600 dark:text-cyan-400" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white leading-tight">Incidencias por Mes</h3>
                  <p className="text-xs text-slate-400 font-medium">Últimos 12 meses</p>
                </div>
              </div>
              <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={d!.porMes} margin={{ top: 14, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradIncMes" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#93c5fd" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.12} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} dy={8} />
                    <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} dx={-8} />
                    <Tooltip content={<ChartTooltip formatter={(v: any) => [`${v} incidencias`, 'Incidencias']} />} cursor={{ fill: 'rgba(100,116,139,0.10)' }} />
                    <Bar dataKey="value" fill="url(#gradIncMes)" radius={[8, 8, 0, 0]} maxBarSize={38} isAnimationActive animationDuration={900}>
                      <LabelList dataKey="value" position="top" fill="#64748b" fontSize={11} fontWeight={700} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow anim-fade-in-up">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-500/15 flex items-center justify-center">
                  <CalendarDays className="w-[18px] h-[18px] text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white leading-tight">Por Año</h3>
                  <p className="text-xs text-slate-400 font-medium">Histórico</p>
                </div>
              </div>
              <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={d!.porAnio} margin={{ top: 14, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradIncAnio" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f59e0b" />
                        <stop offset="100%" stopColor="#fcd34d" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.12} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} dy={8} />
                    <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} dx={-8} />
                    <Tooltip content={<ChartTooltip formatter={(v: any) => [`${v} incidencias`, 'Incidencias']} />} cursor={{ fill: 'rgba(100,116,139,0.10)' }} />
                    <Bar dataKey="value" fill="url(#gradIncAnio)" radius={[8, 8, 0, 0]} maxBarSize={44} isAnimationActive animationDuration={900}>
                      <LabelList dataKey="value" position="top" fill="#64748b" fontSize={11} fontWeight={700} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Top objetivos */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow anim-fade-in-up">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <Server className="w-[18px] h-[18px] text-slate-600 dark:text-slate-300" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-white leading-tight">Objetivos con más Incidencias</h3>
                <p className="text-xs text-slate-400 font-medium">Top 6</p>
              </div>
            </div>
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={d!.porObjetivo} layout="vertical" margin={{ top: 5, right: 34, left: 5, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" opacity={0.12} />
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} width={140} />
                  <Tooltip content={<ChartTooltip formatter={(v: any) => [`${v} incidencias`, 'Incidencias']} />} cursor={{ fill: 'rgba(100,116,139,0.10)' }} />
                  <Bar dataKey="value" radius={[0, 8, 8, 0]} maxBarSize={26} isAnimationActive animationDuration={900}>
                    {d!.porObjetivo.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    <LabelList dataKey="value" position="right" fill="#64748b" fontSize={11} fontWeight={700} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
