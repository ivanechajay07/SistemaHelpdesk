import { useEffect, useState, useMemo } from 'react';
import { Ticket, Clock, CheckCircle, AlertTriangle, Activity, TrendingUp, Users, ArrowUpRight, BarChart3, Award, CalendarDays, Sunrise, Sun, Moon } from 'lucide-react';
import UserAvatar from '../components/ui/UserAvatar';
import MiniCalendar from '../components/ui/MiniCalendar';
import { SkeletonStat, SkeletonList } from '../components/ui/Skeleton';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie, LineChart, Line, Legend } from 'recharts';
import { useDashboardStore } from '../store/dashboardStore';
import { useTicketStore } from '../store/ticketStore';
import { useAuthStore } from '../store/authStore';
import { useProfileImage } from '../lib/hooks';
import NewTicketModal from '../components/tickets/NewTicketModal';
import { useNavigate } from 'react-router-dom';

const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const TECNICO_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6'];

const STATUS_COLORS: Record<string, string> = {
  NUEVO: '#3b82f6',
  ASIGNADO: '#a855f7',
  EN_PROCESO: '#f59e0b',
  RESUELTO: '#10b981',
  CERRADO: '#64748b',
};

const PRIORITY_COLORS: Record<string, string> = {
  CRITICA: '#ef4444',
  ALTA: '#f97316',
  MEDIA: '#eab308',
  BAJA: '#10b981',
};

const PRIORITY_DOT: Record<string, string> = {
  CRITICA: 'text-rose-500',
  ALTA: 'text-orange-500',
  MEDIA: 'text-yellow-500',
  BAJA: 'text-emerald-500',
};



export default function Dashboard() {
  const { stats: dbStats, volume, technicianStats, technicianYear, fetchDashboardData, fetchTechnicianStats } = useDashboardStore();
  const { tickets, fetchTickets } = useTicketStore();
  const { user } = useAuthStore();
  const profileImage = useProfileImage(user?.id);
  const [isNewTicketModalOpen, setIsNewTicketModalOpen] = useState(false);
  const navigate = useNavigate();

  // Saludo dinamico segun la hora del dia + reloj en vivo
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';
  const GreetingIcon = hour < 12 ? Sunrise : hour < 19 ? Sun : Moon;
  const heroGradient = hour < 12
    ? 'from-sky-500 via-blue-600 to-indigo-700'
    : hour < 19
      ? 'from-indigo-600 via-violet-600 to-purple-700'
      : 'from-slate-800 via-indigo-900 to-violet-950';

  const currentYear = new Date().getFullYear();
  const yearOptions = useMemo(
    () => Array.from({ length: 5 }, (_, i) => currentYear - i),
    [currentYear]
  );

  useEffect(() => {
    fetchDashboardData();
    fetchTickets();
    fetchTechnicianStats(technicianYear);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchDashboardData, fetchTickets]);

  // Datos del gráfico: un punto por mes con una serie apilada por técnico (top 6)
  const technicianChartData = useMemo(() => {
    const top = technicianStats.slice(0, 6);
    return MESES_CORTOS.map((mes, idx) => {
      const row: Record<string, string | number> = { mes };
      top.forEach((t) => {
        row[t.tecnicoNombre] = t.meses[idx] || 0;
      });
      return row;
    });
  }, [technicianStats]);

  const recentTickets = tickets.slice(0, 5);

  // Eventos para el calendario: cantidad de tickets creados por día
  const ticketEvents = useMemo(() => {
    const map: Record<string, number> = {};
    tickets.forEach((t) => {
      const day = t.fechaCreacion?.slice(0, 10);
      if (day) map[day] = (map[day] || 0) + 1;
    });
    return map;
  }, [tickets]);

  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    tickets.forEach(t => { counts[t.estado] = (counts[t.estado] || 0) + 1; });
    return Object.entries(counts)
      .map(([name, value]) => ({ name: name.replace('_', ' '), value, color: STATUS_COLORS[name] || '#64748b' }))
      .filter(d => d.value > 0);
  }, [tickets]);

  const priorityData = useMemo(() => {
    const counts: Record<string, number> = {};
    tickets.forEach(t => { counts[t.prioridad] = (counts[t.prioridad] || 0) + 1; });
    const order = ['CRITICA', 'ALTA', 'MEDIA', 'BAJA'];
    return order
      .filter(p => counts[p])
      .map(p => ({ name: p.charAt(0) + p.slice(1).toLowerCase(), value: counts[p], color: PRIORITY_COLORS[p] }));
  }, [tickets]);

  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    tickets.forEach(t => {
      const cat = t.subcategoriaNombre || 'Sin categoría';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value]) => ({ name: name.length > 18 ? name.slice(0, 16) + '...' : name, fullName: name, value }));
  }, [tickets]);

  const resolutionRate = useMemo(() => {
    if (tickets.length === 0) return 0;
    const resolved = tickets.filter(t => t.estado === 'RESUELTO' || t.estado === 'CERRADO').length;
    return Math.round((resolved / tickets.length) * 100);
  }, [tickets]);

  const totalCount = dbStats?.totalTickets ?? tickets.length;
  const openCount = tickets.filter((t) => t.estado !== 'CERRADO' && t.estado !== 'RESUELTO').length;
  const overdueCount = dbStats?.overdueTickets || 0;

  const stats = [
    {
      title: 'Total Tickets', value: totalCount, icon: Ticket,
      color: 'text-blue-500', bg: 'bg-blue-500/10', gradient: 'from-blue-500/20 to-blue-600/5',
      bar: 'from-blue-500 to-indigo-500', pct: 100, subtitle: `${openCount} abiertos`,
    },
    {
      title: 'En Proceso', value: dbStats?.inProgressTickets || 0, icon: Clock,
      color: 'text-amber-500', bg: 'bg-amber-500/10', gradient: 'from-amber-500/20 to-amber-600/5',
      bar: 'from-amber-400 to-orange-500',
      pct: totalCount ? Math.round(((dbStats?.inProgressTickets || 0) / totalCount) * 100) : 0,
      subtitle: 'En gestión',
    },
    {
      title: 'Resueltos', value: dbStats?.resolvedTickets || 0, icon: CheckCircle,
      color: 'text-emerald-500', bg: 'bg-emerald-500/10', gradient: 'from-emerald-500/20 to-emerald-600/5',
      bar: 'from-emerald-400 to-teal-500', pct: resolutionRate, subtitle: `Tasa ${resolutionRate}%`,
    },
    {
      title: 'Vencidos', value: overdueCount, icon: AlertTriangle,
      color: 'text-rose-500', bg: 'bg-rose-500/10', gradient: 'from-rose-500/20 to-rose-600/5',
      bar: 'from-rose-500 to-red-500',
      pct: totalCount ? Math.round((overdueCount / totalCount) * 100) : 0,
      subtitle: overdueCount > 0 ? 'Requieren atención' : 'Todo al día',
      alert: overdueCount > 0,
    },
  ];

  return (
    <div className="space-y-6">
      {/* ===== HERO: Bienvenida dinamica segun la hora ===== */}
      <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${heroGradient} px-6 py-7 sm:px-8 sm:py-9 shadow-xl shadow-indigo-500/25 anim-fade-in-up transition-colors duration-700`}>
        <div className="absolute -top-16 -right-16 w-56 h-56 bg-white/10 rounded-full blur-2xl pointer-events-none anim-float-slow" />
        <div className="absolute -bottom-20 -left-10 w-64 h-64 bg-fuchsia-400/20 rounded-full blur-3xl pointer-events-none anim-float-slower" />
        <div className="absolute top-6 right-1/3 w-24 h-24 border border-white/15 rounded-full pointer-events-none" />
        <div className="absolute top-14 right-1/4 w-16 h-16 border border-white/10 rounded-full pointer-events-none hidden sm:block" />

        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-5">
            {profileImage ? (
              <img
                src={profileImage}
                alt="Foto de perfil"
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover border-2 border-white/40 shadow-lg shadow-black/20"
              />
            ) : (
              <div className="w-14 h-14 sm:w-16 sm:h-16 shrink-0 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/25 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-black/20">
                {user?.nombre?.charAt(0) || 'U'}{user?.apellidos?.charAt(0) || ''}
              </div>
            )}
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-[11px] font-black tracking-widest uppercase text-white/90 mb-2">
                <GreetingIcon className="w-3.5 h-3.5" />
                {greeting}
              </span>
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white leading-tight">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-orange-200 to-yellow-200">
                  {user?.nombre} {user?.apellidos}
                </span>
              </h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-blue-100/90 font-medium text-xs sm:text-sm">
                <span className="flex items-center gap-1.5 capitalize">
                  <CalendarDays className="w-3.5 h-3.5" />
                  {now.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
                <span className="flex items-center gap-1.5 tabular-nums">
                  <Clock className="w-3.5 h-3.5" />
                  {now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center gap-3 self-start lg:self-auto">
            <div className="flex items-center gap-2">
              {[
                { label: 'Total', value: totalCount },
                { label: 'Abiertos', value: openCount },
                { label: 'Vencidos', value: overdueCount },
              ].map((c) => (
                <div key={c.label} className="px-3 py-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[74px]">
                  <p className="text-lg font-black text-white leading-none tabular-nums">{c.value}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/70 mt-1">{c.label}</p>
                </div>
              ))}
            </div>
            <button
              onClick={() => setIsNewTicketModalOpen(true)}
              className="btn-shine inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-blue-700 hover:bg-blue-50 rounded-xl text-sm font-black transition-all shadow-lg shadow-blue-900/30 active:scale-95 hover:-translate-y-0.5"
            >
              <Ticket className="w-4 h-4" />
              Nuevo Ticket
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {!dbStats && tickets.length === 0
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonStat key={i} />)
          : stats.map((stat, index) => (
          <div
            key={index}
            className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden anim-fade-in-up"
            style={{ animationDelay: `${index * 60}ms` }}
          >
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${stat.gradient} to-transparent rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150`}></div>
            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{stat.title}</p>
                <p className="text-3xl font-black mt-1.5 text-slate-800 dark:text-white tracking-tight tabular-nums">{stat.value}</p>
                <p className={`text-[11px] font-semibold mt-1 ${stat.alert ? 'text-rose-500' : 'text-slate-400 dark:text-slate-500'}`}>{stat.subtitle}</p>
              </div>
              <div className={`relative p-3 rounded-2xl ${stat.bg} shadow-inner transition-transform group-hover:scale-110 group-hover:rotate-3 ${stat.alert ? 'animate-pulse' : ''}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
                {stat.alert && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />}
              </div>
            </div>
            <div className="relative mt-4 h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className={`h-full rounded-full bg-gradient-to-r ${stat.bar} transition-all duration-700`} style={{ width: `${Math.min(100, stat.pct)}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* Secondary Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="p-3 rounded-2xl bg-indigo-500/10">
            <TrendingUp className="w-6 h-6 text-indigo-500" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tasa de Resolución</p>
            <p className="text-2xl font-black text-slate-800 dark:text-white">{resolutionRate}%</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="p-3 rounded-2xl bg-cyan-500/10">
            <BarChart3 className="w-6 h-6 text-cyan-500" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Activos Abiertos</p>
            <p className="text-2xl font-black text-slate-800 dark:text-white">{tickets.filter(t => t.estado !== 'CERRADO' && t.estado !== 'RESUELTO').length}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="p-3 rounded-2xl bg-violet-500/10">
            <Users className="w-6 h-6 text-violet-500" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Técnicos Activos</p>
            <p className="text-2xl font-black text-slate-800 dark:text-white">{new Set(tickets.filter(t => t.tecnicoId).map(t => t.tecnicoId)).size}</p>
          </div>
        </div>
      </div>

      {/* ===== Rendimiento de Técnicos: resueltos por mes con filtro por año ===== */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow anim-fade-in-up">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center">
              <Award className="w-[18px] h-[18px] text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">Rendimiento de Técnicos</h2>
              <p className="text-xs text-slate-400 font-medium">Tickets resueltos por cada técnico, mes a mes</p>
            </div>
          </div>
          <div className="inline-flex bg-slate-100 dark:bg-slate-800/70 rounded-xl p-1 gap-1 self-start">
            {yearOptions.map((y) => (
              <button
                key={y}
                onClick={() => fetchTechnicianStats(y)}
                className={`px-3 py-1.5 rounded-lg text-xs font-black tabular-nums transition-all duration-300 active:scale-95 ${
                  technicianYear === y
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/30'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {y}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Gráfico apilado por mes */}
          <div className="lg:col-span-2 h-[260px] w-full">
            {technicianStats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={technicianChartData} margin={{ top: 5, right: 12, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                  <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={8} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dx={-6} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.92)', border: '1px solid #334155', borderRadius: '12px', color: '#f8fafc', fontSize: '12px' }}
                    cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '4 4' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="circle" />
                  {technicianStats.slice(0, 6).map((t, i) => (
                    <Line
                      key={t.tecnicoId}
                      type="monotone"
                      dataKey={t.tecnicoNombre}
                      stroke={TECNICO_COLORS[i % TECNICO_COLORS.length]}
                      strokeWidth={2.5}
                      dot={{ r: 3, strokeWidth: 0, fill: TECNICO_COLORS[i % TECNICO_COLORS.length] }}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                      isAnimationActive
                      animationDuration={900}
                      animationBegin={i * 120}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <Award className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-500">Sin resoluciones en {technicianYear}</p>
                <p className="text-xs text-slate-400 mt-1">Prueba con otro año usando los filtros de arriba</p>
              </div>
            )}
          </div>

          {/* Ranking de técnicos */}
          <div className="space-y-2.5 lg:max-h-[260px] lg:overflow-y-auto pr-1">
            {technicianStats.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-6">Aún no hay datos para este año</p>
            )}
            {technicianStats.map((t, i) => {
              const max = Math.max(...technicianStats.map((x) => x.total), 1);
              return (
                <div key={t.tecnicoId} className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors">
                  <div className="relative shrink-0">
                    <UserAvatar userId={t.tecnicoId} name={t.tecnicoNombre} size={34} />
                    <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black ring-2 ring-white dark:ring-slate-900 ${
                      i === 0 ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}>
                      {i + 1}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{t.tecnicoNombre}</p>
                      <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 tabular-nums shrink-0">{t.total}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full bg-slate-200/70 dark:bg-slate-700/60 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-700"
                        style={{ width: `${Math.round((t.total / max) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Volume Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-bold flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-500" />
              Volumen de Tickets
            </h2>
            <span className="text-xs font-medium bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full text-slate-600 dark:text-slate-300">Últimos 7 días</span>
          </div>
          <div className="h-[280px] w-full mt-auto">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={volume} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTickets" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dx={-10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(8px)', border: '1px solid #1e293b', borderRadius: '12px', color: '#f8fafc', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                  itemStyle={{ color: '#60a5fa', fontWeight: 'bold' }}
                  cursor={{ stroke: '#3b82f6', strokeWidth: 1, strokeDasharray: '5 5' }}
                />
                <Area type="monotone" dataKey="tickets" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorTickets)" activeDot={{ r: 6, strokeWidth: 0, fill: '#3b82f6' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution (Pie) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col hover:shadow-md transition-shadow">
          <h2 className="text-base font-bold mb-4">Distribución por Estado</h2>
          <div className="flex-1 flex items-center justify-center">
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid #1e293b', borderRadius: '12px', color: '#f8fafc', fontSize: '13px' }}
                    formatter={(value: any, name: any) => [`${value} tickets`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-slate-400 text-sm">Sin datos</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {statusData.map((d) => (
              <div key={d.name} className="flex items-center gap-2 text-xs">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                <span className="text-slate-600 dark:text-slate-400 truncate">{d.name}</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 ml-auto">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Priority Bar Chart */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <h2 className="text-base font-bold mb-4">Tickets por Prioridad</h2>
          <div className="h-[220px] w-full">
            {priorityData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={priorityData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid #1e293b', borderRadius: '12px', color: '#f8fafc', fontSize: '13px' }}
                    formatter={(value: any) => [`${value} tickets`, 'Cantidad']}
                    cursor={{ fill: 'rgba(59, 130, 246, 0.08)' }}
                  />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={50}>
                    {priorityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-slate-400 text-sm text-center mt-10">Sin datos</p>
            )}
          </div>
        </div>

        {/* Category Bar Chart */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <h2 className="text-base font-bold mb-4">Top Categorías</h2>
          <div className="h-[220px] w-full">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} layout="vertical" margin={{ top: 5, right: 10, left: 5, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" opacity={0.15} />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} width={110} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid #1e293b', borderRadius: '12px', color: '#f8fafc', fontSize: '13px' }}
                    formatter={(value: any, _name: any, props: any) => [`${value} tickets`, props.payload.fullName]}
                    cursor={{ fill: 'rgba(59, 130, 246, 0.08)' }}
                  />
                  <Bar dataKey="value" radius={[0, 8, 8, 0]} maxBarSize={28} fill="#6366f1" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-slate-400 text-sm text-center mt-10">Sin datos</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Tickets + Calendario */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold flex items-center gap-2">
            <Ticket className="w-5 h-5 text-indigo-500" />
            Tickets Recientes
          </h2>
          <button
            onClick={() => navigate('/tickets')}
            className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            Ver todos <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentTickets.length === 0 ? (
          tickets.length === 0 ? (
            <SkeletonList rows={5} />
          ) : (
            <div className="py-10 text-center text-slate-500 text-sm">
              <Ticket className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
              No hay tickets recientes
            </div>
          )
        ) : (
          <div className="space-y-2.5">
            {recentTickets.map((ticket, i) => (
              <button
                key={ticket.id}
                onClick={() => navigate(`/tickets/${ticket.id}`)}
                className="group w-full text-left flex items-center gap-3 sm:gap-4 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20 hover:bg-white dark:hover:bg-slate-800/60 hover:border-blue-200 dark:hover:border-blue-500/30 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 anim-fade-in-up"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                {/* Código + prioridad */}
                <div className="flex flex-col items-start gap-1.5 shrink-0">
                  <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-lg bg-blue-100/60 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400">
                    {ticket.codigo}
                  </span>
                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${PRIORITY_DOT[ticket.prioridad] || 'text-slate-400'}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current shadow-[0_0_6px_currentColor]" />
                    {ticket.prioridad}
                  </span>
                </div>

                {/* Asunto + meta */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {ticket.titulo}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {ticket.subcategoriaNombre || 'Sin categoría'}
                    {ticket.entidad ? ` · ${ticket.entidad}` : ''}
                    <span className="hidden sm:inline"> · {new Date(ticket.fechaCreacion).toLocaleDateString()}</span>
                  </p>
                </div>

                {/* Estado */}
                <span className={`hidden md:inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase shrink-0 ${
                  ticket.estado === 'NUEVO' ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400' :
                  ticket.estado === 'EN_PROCESO' ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' :
                  ticket.estado === 'RESUELTO' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' :
                  'bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400'
                }`}>
                  {ticket.estado.replace('_', ' ')}
                </span>

                {/* Técnico asignado con avatar */}
                <div className="flex items-center gap-2.5 shrink-0 pl-2 border-l border-slate-100 dark:border-slate-800">
                  <UserAvatar userId={ticket.tecnicoId} name={ticket.tecnicoNombre} />
                  <div className="hidden sm:block min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Técnico</p>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[120px]">
                      {ticket.tecnicoNombre || 'Sin asignar'}
                    </p>
                  </div>
                </div>

                <ArrowUpRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-blue-500 shrink-0 transition-colors" />
              </button>
            ))}
          </div>
        )}
      </div>

      <MiniCalendar events={ticketEvents} />
      </div>

      <NewTicketModal 
        isOpen={isNewTicketModalOpen} 
        onClose={() => {
          setIsNewTicketModalOpen(false);
          fetchDashboardData();
        }} 
      />
    </div>
  );
}
