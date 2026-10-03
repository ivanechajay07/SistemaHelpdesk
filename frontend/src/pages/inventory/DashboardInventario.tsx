import React, { useEffect, useState } from 'react';
import { useInventarioStore, ESTADO_BADGE, ESTADO_LABELS } from '../../store/inventoryStore';
import {
  Boxes, Wrench, ShieldCheck, ArrowLeftRight, PackageCheck, Truck, Trash2, AlertTriangle,
  Loader2, Package, RefreshCcw, Percent, UserX, MapPin, CalendarClock, GraduationCap, Scale
} from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import InventoryPageHeader from './InventoryPageHeader';
import ChartTooltip from '../../components/ui/ChartTooltip';

const COLORS = [
  '#06b6d4', '#10b981', '#3b82f6', '#f59e0b', '#f97316', '#0ea5e9', '#ef4444',
  '#14b8a6', '#84cc16', '#94a3b8',
];

/** Barras horizontales de distribución con porcentaje. */
function DistBars({ items, total, gradient, empty }: {
  items: { name: string; value: number }[]; total: number; gradient: string; empty: string;
}) {
  if (!items || items.length === 0) return <p className="text-sm text-slate-400 py-6 text-center">{empty}</p>;
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="space-y-3">
      {items.map((x) => {
        const pct = total ? Math.round((x.value / total) * 100) : 0;
        return (
          <div key={x.name}>
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 truncate">{x.name}</span>
              <span className="text-xs font-black text-slate-800 dark:text-white tabular-nums shrink-0">
                {x.value} <span className="text-slate-400 dark:text-slate-500 font-bold">· {pct}%</span>
              </span>
            </div>
            <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className={`h-full rounded-full bg-gradient-to-r ${gradient} transition-[width] duration-700`} style={{ width: `${(x.value / max) * 100}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

function StatCard({ label, value, icon: Icon, iconBg, textColor, barGradient, barPct, delay }: {
  label: string; value: number; icon: React.ElementType; iconBg: string; textColor: string;
  barGradient: string; barPct: number; delay: number;
}) {
  const display = useCountUp(value);
  const [barWidth, setBarWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setBarWidth(barPct), 250 + delay);
    return () => clearTimeout(t);
  }, [barPct, delay]);
  return (
    <div className="group relative bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 anim-fade-in-up"
      style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</p>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg} transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
          <Icon className={`w-[18px] h-[18px] ${textColor}`} />
        </div>
      </div>
      <p className={`text-3xl sm:text-4xl font-black tabular-nums leading-none ${textColor}`}>{display}</p>
      <div className="mt-3 h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full bg-gradient-to-r ${barGradient} transition-[width] duration-1000 ease-out`} style={{ width: `${barWidth}%` }} />
      </div>
    </div>
  );
}

export default function DashboardInventario() {
  const { dashboard, fetchDashboard, dashboardLoading } = useInventarioStore();

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  if (dashboardLoading && !dashboard) {
    return <div className="flex items-center justify-center py-32"><Loader2 className="w-8 h-8 animate-spin text-teal-500" /></div>;
  }

  const d = dashboard;
  const total = d?.totalActivos || 0;

  const kpis = [
    { label: 'Total Activos', value: d?.totalActivos || 0, icon: Boxes, iconBg: 'bg-cyan-100 dark:bg-cyan-500/15', textColor: 'text-cyan-600 dark:text-cyan-400', barGradient: 'from-cyan-500 to-blue-600', barPct: 100 },
    { label: 'Operativos', value: d?.operativos || 0, icon: ShieldCheck, iconBg: 'bg-emerald-100 dark:bg-emerald-500/15', textColor: 'text-emerald-600 dark:text-emerald-400', barGradient: 'from-emerald-400 to-teal-500', barPct: total ? ((d?.operativos || 0) / total) * 100 : 0 },
    { label: 'En Mantenimiento', value: d?.enMantenimiento || 0, icon: Wrench, iconBg: 'bg-amber-100 dark:bg-amber-500/15', textColor: 'text-amber-600 dark:text-amber-400', barGradient: 'from-amber-400 to-orange-500', barPct: total ? ((d?.enMantenimiento || 0) / total) * 100 : 0 },
    { label: 'Prestados', value: d?.prestados || 0, icon: Package, iconBg: 'bg-sky-100 dark:bg-sky-500/15', textColor: 'text-sky-600 dark:text-sky-400', barGradient: 'from-sky-500 to-blue-600', barPct: total ? ((d?.prestados || 0) / total) * 100 : 0 },
    { label: 'En Tránsito', value: d?.enTransito || 0, icon: Truck, iconBg: 'bg-cyan-100 dark:bg-cyan-500/15', textColor: 'text-cyan-600 dark:text-cyan-400', barGradient: 'from-cyan-500 to-sky-600', barPct: total ? ((d?.enTransito || 0) / total) * 100 : 0 },
  ];

  const alertas = [
    { label: 'Garantías por vencer (30 días)', value: d?.garantiasPorVencer || 0, icon: CalendarClock, iconBg: 'bg-amber-100 dark:bg-amber-500/15', textColor: 'text-amber-600 dark:text-amber-400' },
    { label: 'Garantías vencidas', value: d?.garantiasVencidas || 0, icon: AlertTriangle, iconBg: 'bg-red-100 dark:bg-red-500/15', textColor: 'text-red-600 dark:text-red-400' },
    { label: 'Mantenimientos próximos', value: d?.mantenimientosProximos || 0, icon: RefreshCcw, iconBg: 'bg-blue-100 dark:bg-blue-500/15', textColor: 'text-blue-600 dark:text-blue-400' },
    { label: 'Mantenimientos vencidos', value: d?.mantenimientosVencidos || 0, icon: Wrench, iconBg: 'bg-orange-100 dark:bg-orange-500/15', textColor: 'text-orange-600 dark:text-orange-400' },
    { label: 'Préstamos vencidos', value: d?.prestamosVencidos || 0, icon: Percent, iconBg: 'bg-rose-100 dark:bg-rose-500/15', textColor: 'text-rose-600 dark:text-rose-400' },
    { label: 'Transferencias pendientes', value: d?.transferenciasPendientes || 0, icon: ArrowLeftRight, iconBg: 'bg-cyan-100 dark:bg-cyan-500/15', textColor: 'text-cyan-600 dark:text-cyan-400' },
    { label: 'Sin responsable', value: d?.sinResponsable || 0, icon: UserX, iconBg: 'bg-slate-100 dark:bg-slate-500/15', textColor: 'text-slate-600 dark:text-slate-400' },
    { label: 'Sin ubicación', value: d?.sinUbicacion || 0, icon: MapPin, iconBg: 'bg-slate-100 dark:bg-slate-500/15', textColor: 'text-slate-600 dark:text-slate-400' },
  ];

  return (
    <div className="space-y-6">
      <InventoryPageHeader
        icon={Boxes}
        eyebrow="Módulo de Inventario"
        title="Dashboard de Inventario"
        subtitle="Estado general de los activos, alertas de garantías, mantenimientos, préstamos y transferencias."
        gradient="from-cyan-600 via-teal-600 to-emerald-700"
      />

      {/* KPI PRINCIPALES */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {kpis.map((k, i) => <StatCard key={k.label} {...k} delay={100 + i * 70} />)}
      </div>

      {/* ALERTAS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {alertas.map((a, i) => {
          const Display = a.value;
          return (
            <div key={a.label} className="group relative bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 anim-fade-in-up" style={{ animationDelay: `${500 + i * 50}ms` }}>
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${a.iconBg}`}>
                  <a.icon className={`w-[18px] h-[18px] ${a.textColor}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xl font-black text-slate-800 dark:text-slate-100 tabular-nums leading-none">{Display}</p>
                  <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mt-1 truncate">{a.label}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* GRÁFICAS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm anim-fade-in-up" style={{ animationDelay: '700ms' }}>
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center">
              <ShieldCheck className="w-[18px] h-[18px] text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white leading-tight">Distribución por Estado</h3>
              <p className="text-xs text-slate-400 font-medium">Situación de los activos</p>
            </div>
          </div>
          {(d?.porEstado?.length || 0) > 0 ? (
            <>
              <div className="relative">
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={d!.porEstado} cx="50%" cy="50%" innerRadius={68} outerRadius={100}
                      paddingAngle={4} cornerRadius={6} dataKey="value" animationDuration={900}>
                      {d!.porEstado.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<ChartTooltip hideLabel formatter={(v: any, name: any) => [`${v} activos`, ESTADO_LABELS[name] || name]} />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <p className="text-4xl font-black text-slate-900 dark:text-white tabular-nums">{total}</p>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Activos</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4">
                {d!.porEstado.map((x, i) => {
                  const pct = total ? Math.round((x.value / total) * 100) : 0;
                  return (
                    <div key={x.name} className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="inline-block max-w-[110px]"><span className={`inline-flex px-1.5 py-0.5 rounded-md text-[9px] font-black ring-1 ${ESTADO_BADGE[x.name] || ''}`}>{ESTADO_LABELS[x.name] || x.name}</span></span>
                      <span className="text-xs font-black text-slate-800 dark:text-slate-200 tabular-nums ml-auto">{x.value}</span>
                      <span className="text-[10px] font-bold text-slate-400 tabular-nums w-8 text-right">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="h-[280px] flex flex-col items-center justify-center text-slate-300 dark:text-slate-600 gap-2">
              <PackageCheck className="w-10 h-10" />
              <p className="text-sm font-medium text-slate-400">Sin activos registrados</p>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm anim-fade-in-up" style={{ animationDelay: '770ms' }}>
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-9 h-9 rounded-xl bg-cyan-100 dark:bg-cyan-500/15 flex items-center justify-center">
              <ArrowLeftRight className="w-[18px] h-[18px] text-cyan-600 dark:text-cyan-400" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white leading-tight">Movimientos por Mes</h3>
              <p className="text-xs text-slate-400 font-medium">Historial de los últimos 12 meses</p>
            </div>
          </div>
          {(d?.movimientosPorMes?.length || 0) > 0 && d!.movimientosPorMes.some(x => x.value > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={d!.movimientosPorMes} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="gradMov" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#14b8a6" stopOpacity={0.45} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" opacity={0.2} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} allowDecimals={false} />
                <Tooltip content={<ChartTooltip formatter={(v: any) => [`${v} mov.`, 'Movimientos']} />} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
                <Bar dataKey="value" fill="url(#gradMov)" radius={[10, 10, 4, 4]} maxBarSize={48} animationDuration={900} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex flex-col items-center justify-center text-slate-300 dark:text-slate-600 gap-2">
              <Trash2 className="w-10 h-10" />
              <p className="text-sm font-medium text-slate-400">Sin movimientos registrados</p>
            </div>
          )}
        </div>
      </div>

      {/* Distribución por entidad / categoría / sede */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow anim-fade-in-up" style={{ animationDelay: '840ms' }}>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-500/15 flex items-center justify-center">
              <GraduationCap className="w-[18px] h-[18px] text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white leading-tight">Por Entidad</h3>
              <p className="text-[11px] text-slate-400 font-medium">Activos por entidad</p>
            </div>
          </div>
          <DistBars items={d?.porEntidad || []} total={total} gradient="from-blue-500 to-sky-500" empty="Sin datos" />
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow anim-fade-in-up" style={{ animationDelay: '910ms' }}>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-xl bg-cyan-100 dark:bg-cyan-500/15 flex items-center justify-center">
              <Scale className="w-[18px] h-[18px] text-cyan-600 dark:text-cyan-400" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white leading-tight">Por Categoría</h3>
              <p className="text-[11px] text-slate-400 font-medium">Activos por categoría</p>
            </div>
          </div>
          <DistBars items={d?.porCategoria || []} total={total} gradient="from-cyan-500 to-teal-500" empty="Sin datos" />
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow anim-fade-in-up" style={{ animationDelay: '980ms' }}>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-500/15 flex items-center justify-center">
              <MapPin className="w-[18px] h-[18px] text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white leading-tight">Por Sede</h3>
              <p className="text-[11px] text-slate-400 font-medium">Activos por sede</p>
            </div>
          </div>
          <DistBars items={d?.porSede || []} total={total} gradient="from-amber-500 to-orange-500" empty="Sin datos" />
        </div>
      </div>
    </div>
  );
}
