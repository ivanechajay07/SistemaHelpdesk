import { useEffect } from 'react';
import { useMonitoringStore } from '../store/monitoringStore';
import ChartTooltip from '../components/ui/ChartTooltip';
import {
  Activity, AlertTriangle, CheckCircle2, Timer, CalendarDays, Server, Loader2,
  RefreshCw, Wifi, WifiOff, Clock,
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, Cell, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, LabelList,
} from 'recharts';

const STATUS_COLORS = { UP: '#10b981', DOWN: '#ef4444', PENDING: '#94a3b8' };
const OBJ_COLORS = ['#06b6d4', '#3b82f6', '#f59e0b', '#ef4444', '#10b981', '#0ea5e9'];

export default function MonitoringDashboard() {
  const { dashboard, dashboardLoading, fetchDashboard, targets, loading: targetsLoading, fetchTargets } = useMonitoringStore();

  const load = () => { fetchDashboard(); fetchTargets(); };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const loading = (dashboardLoading || targetsLoading) && !dashboard;

  const d = dashboard;
  const upCount = targets.filter((t) => t.ultimoEstado === 'UP').length;
  const downCount = targets.filter((t) => t.ultimoEstado === 'DOWN').length;
  const pendingCount = targets.filter((t) => t.ultimoEstado === 'PENDING').length;

  const statusData = [
    { name: 'Disponibles', value: upCount, color: STATUS_COLORS.UP },
    { name: 'Caídos', value: downCount, color: STATUS_COLORS.DOWN },
    { name: 'Pendientes', value: pendingCount, color: STATUS_COLORS.PENDING },
  ].filter((x) => x.value > 0);

  const kpis = [
    { label: 'Objetivos monitoreados', value: targets.length, icon: Server, cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
    { label: 'Caídos ahora', value: downCount, icon: WifiOff, cls: 'bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400', alert: downCount > 0 },
    { label: 'Incidencias totales', value: d?.totalIncidencias ?? 0, icon: Activity, cls: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-400' },
    { label: 'Abiertas', value: d?.abiertas ?? 0, icon: AlertTriangle, cls: 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400', alert: (d?.abiertas ?? 0) > 0 },
    { label: 'Duración media', value: d?.duracionPromedioMin != null ? `${d.duracionPromedioMin} min` : '—', icon: Timer, cls: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-cyan-600 via-blue-700 to-slate-900 px-6 py-7 sm:px-8 sm:py-9 shadow-xl shadow-blue-500/20 anim-fade-in-up">
        <div className="absolute -top-16 -right-16 w-56 h-56 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-10 w-64 h-64 bg-cyan-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/25 flex items-center justify-center shrink-0">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-[11px] font-black tracking-widest uppercase text-white/90 mb-2">
                Monitoreo de Red
              </span>
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">Dashboard de Incidencias</h1>
              <p className="text-white/85 mt-1.5 font-medium text-sm sm:text-base max-w-2xl">Estadísticas de caídas detectadas por el monitoreo, por día, mes y año.</p>
            </div>
          </div>
          <button onClick={load} disabled={loading} className="btn-shine inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white text-blue-700 hover:bg-blue-50 rounded-xl text-sm font-black transition-all shadow-lg shadow-blue-900/30 active:scale-95 hover:-translate-y-0.5 disabled:opacity-60 shrink-0">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Actualizar
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-cyan-500" /></div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
            {kpis.map((k, i) => (
              <div key={k.label} className="group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 anim-fade-in-up" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{k.label}</p>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${k.cls} transition-transform group-hover:scale-110 ${k.alert ? 'animate-pulse' : ''}`}>
                    <k.icon className="w-[18px] h-[18px]" />
                  </div>
                </div>
                <p className="text-3xl font-black text-slate-800 dark:text-white tabular-nums leading-none">{k.value}</p>
              </div>
            ))}
          </div>

          {/* Tendencia lineal por día + estado actual */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow anim-fade-in-up">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-500/15 flex items-center justify-center">
                  <CalendarDays className="w-[18px] h-[18px] text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white leading-tight">Incidencias por Día</h3>
                  <p className="text-xs text-slate-400 font-medium">Tendencia de los últimos 30 días</p>
                </div>
              </div>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={d?.porDia ?? []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.12} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} interval={4} dy={8} />
                    <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} dx={-8} />
                    <Tooltip content={<ChartTooltip formatter={(v: any) => [`${v} incidencias`, 'Incidencias']} />} cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '4 4' }} />
                    <Line type="monotone" dataKey="value" stroke="#06b6d4" strokeWidth={3} dot={{ r: 3, fill: '#06b6d4', strokeWidth: 0 }} activeDot={{ r: 6, strokeWidth: 3, stroke: '#fff', fill: '#06b6d4' }} isAnimationActive animationDuration={1000} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow anim-fade-in-up">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center">
                  <Wifi className="w-[18px] h-[18px] text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white leading-tight">Estado Actual</h3>
                  <p className="text-xs text-slate-400 font-medium">Objetivos monitoreados</p>
                </div>
              </div>
              {statusData.length > 0 ? (
                <>
                  <div className="relative">
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={76} paddingAngle={3} cornerRadius={6} dataKey="value" stroke="none">
                          {statusData.map((s, i) => <Cell key={i} fill={s.color} />)}
                        </Pie>
                        <Tooltip content={<ChartTooltip hideLabel formatter={(v: any, name: any) => [`${v}`, name]} />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <p className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">{targets.length}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Objetivos</p>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1.5">
                    {statusData.map((s) => (
                      <div key={s.name} className="flex items-center gap-2 text-xs">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                        <span className="text-slate-600 dark:text-slate-300 font-semibold">{s.name}</span>
                        <span className="ml-auto font-black text-slate-800 dark:text-white tabular-nums">{s.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="h-[200px] flex flex-col items-center justify-center text-slate-300 dark:text-slate-600 gap-2">
                  <Server className="w-9 h-9" />
                  <p className="text-xs font-medium text-slate-400">Sin objetivos registrados</p>
                </div>
              )}
            </div>
          </div>

          {/* Por mes (lineal) + por año */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow anim-fade-in-up">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-9 h-9 rounded-xl bg-cyan-100 dark:bg-cyan-500/15 flex items-center justify-center">
                  <Activity className="w-[18px] h-[18px] text-cyan-600 dark:text-cyan-400" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white leading-tight">Incidencias por Mes</h3>
                  <p className="text-xs text-slate-400 font-medium">Últimos 12 meses</p>
                </div>
              </div>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={d?.porMes ?? []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.12} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} dy={8} />
                    <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} dx={-8} />
                    <Tooltip content={<ChartTooltip formatter={(v: any) => [`${v} incidencias`, 'Incidencias']} />} cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '4 4' }} />
                    <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }} activeDot={{ r: 6, strokeWidth: 3, stroke: '#fff', fill: '#3b82f6' }} isAnimationActive animationDuration={1000} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow anim-fade-in-up">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-500/15 flex items-center justify-center">
                  <Clock className="w-[18px] h-[18px] text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white leading-tight">Por Año</h3>
                  <p className="text-xs text-slate-400 font-medium">Histórico</p>
                </div>
              </div>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={d?.porAnio ?? []} margin={{ top: 14, right: 10, left: -20, bottom: 0 }}>
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
            {(d?.porObjetivo?.length ?? 0) > 0 ? (
              <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={d!.porObjetivo} layout="vertical" margin={{ top: 5, right: 34, left: 5, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" opacity={0.12} />
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} width={140} />
                    <Tooltip content={<ChartTooltip formatter={(v: any) => [`${v} incidencias`, 'Incidencias']} />} cursor={{ fill: 'rgba(100,116,139,0.10)' }} />
                    <Bar dataKey="value" radius={[0, 8, 8, 0]} maxBarSize={26} isAnimationActive animationDuration={900}>
                      {d!.porObjetivo.map((_, i) => <Cell key={i} fill={OBJ_COLORS[i % OBJ_COLORS.length]} />)}
                      <LabelList dataKey="value" position="right" fill="#64748b" fontSize={11} fontWeight={700} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[160px] flex flex-col items-center justify-center text-slate-300 dark:text-slate-600 gap-2">
                <CheckCircle2 className="w-9 h-9" />
                <p className="text-sm font-medium text-slate-400">Sin incidencias registradas</p>
                <p className="text-xs text-slate-400">Las caídas detectadas por el monitoreo aparecerán aquí.</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
