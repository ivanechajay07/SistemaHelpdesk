import { useEffect, useMemo, useState } from 'react';
import {
  Plus, Search, Loader2, Edit2, Trash2, ListTodo, UserCheck, CalendarDays,
  Inbox, Play, CheckCircle2, TrendingUp, Flame,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { useTaskStore, type Task, type TaskStatus } from '../store/taskStore';
import { useAuthStore } from '../store/authStore';
import { TaskModal, getPrioridadCls, getEstadoCls, getEstadoLabel } from '../components/tasks/TaskModal';
import ConfirmDialog, { type DialogVariant } from '../components/ui/ConfirmDialog';
import Pagination from '../components/ui/Pagination';
import { usePagedList } from '../lib/hooks';
import { useToast } from '../components/ui/Toast';

const ESTADO_FILTERS = [
  { value: '', label: 'Todos' },
  { value: 'PENDIENTE', label: 'Pendientes' },
  { value: 'EN_PROCESO', label: 'En Proceso' },
  { value: 'COMPLETADA', label: 'Completadas' },
];

/* ===== Línea de tiempo del proceso de la tarea ===== */
function TaskTimeline({ task }: { task: Task }) {
  const fmt = (d?: string | null) =>
    d ? new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : '';

  const currentState: TaskStatus = task.estado;
  const steps: { label: string; date: string | null; done: boolean; current: boolean }[] = [
    { label: 'Registrada', date: task.fechaCreacion, done: true, current: false },
    { label: 'En Proceso', date: task.fechaInicioProceso, done: !!task.fechaInicioProceso, current: currentState === 'EN_PROCESO' },
    {
      label: 'Completada',
      date: task.fechaCompletada,
      done: currentState === 'COMPLETADA',
      current: currentState === 'COMPLETADA',
    },
  ];

  return (
    <div className="flex items-start gap-0 mt-3 select-none">
      {steps.map((s, i) => (
        <div key={s.label} className={`flex items-start ${i === 0 ? 'flex-1' : 'flex-1'}`}>
          {/* Punto + etiqueta */}
          <div className="flex flex-col items-center gap-1 shrink-0 w-16 sm:w-20">
            <span className="relative flex items-center justify-center">
              {s.current && (
                <span className={`absolute inline-flex h-4 w-4 rounded-full opacity-40 ${s.done ? 'animate-ping bg-emerald-400' : 'animate-ping bg-teal-400'}`} />
              )}
              <span
                className={`relative inline-flex items-center justify-center w-3.5 h-3.5 rounded-full ring-2 transition-all duration-500 ${
                  s.done
                    ? 'bg-gradient-to-br from-emerald-400 to-teal-600 ring-emerald-300/60 shadow-sm shadow-emerald-500/40'
                    : 'bg-slate-200 dark:bg-slate-700 ring-slate-200 dark:ring-slate-700'
                }`}
              >
                {s.done && <CheckCircle2 className="w-2 h-2 text-white" strokeWidth={4} />}
              </span>
            </span>
            <span className={`text-[9px] font-black uppercase tracking-wide leading-none ${s.done ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
              {s.label}
            </span>
            <span className="text-[9px] font-semibold text-slate-400 leading-none">{s.date ? fmt(s.date) : '—'}</span>
          </div>
          {/* Conector */}
          {i < steps.length - 1 && (
            <div className="flex-1 h-[3px] mt-[7px] rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 min-w-[14px]">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  steps[i + 1].done ? 'w-full bg-gradient-to-r from-teal-400 to-emerald-500' : 'w-0'
                }`}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function Tasks() {
  const { tasks, loading, fetchTasks, deleteTask, updateTaskStatus } = useTaskStore();
  const { user, isAdmin, hasRole } = useAuthStore();
  const toast = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [dialog, setDialog] = useState<{ variant: DialogVariant; title: string; message: string; action?: () => Promise<void> } | null>(null);
  const [statusUpdating, setStatusUpdating] = useState<number | null>(null);

  // Solo ADMIN y SUPERVISOR gestionan tareas; el técnico solo actualiza el estado de las suyas
  const canManage = isAdmin() || hasRole('SUPERVISOR');

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const filteredTasks = useMemo(
    () =>
      tasks.filter((t) => {
        const matchesSearch =
          t.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.tecnicoNombre?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesEstado = !estadoFilter || t.estado === estadoFilter;
        return matchesSearch && matchesEstado;
      }),
    [tasks, searchTerm, estadoFilter]
  );

  const { page, setPage, pageSize, setPageSize, paged: pagedTasks, total: totalTasks } = usePagedList(filteredTasks, 10);

  // Agrupar tareas por técnico (solo la página actual)
  const grouped = useMemo(() => {
    const map = new Map<string, { tecnicoId: number; nombre: string; tareas: Task[] }>();
    pagedTasks.forEach((t) => {
      const key = String(t.tecnicoId);
      if (!map.has(key)) map.set(key, { tecnicoId: t.tecnicoId, nombre: t.tecnicoNombre, tareas: [] });
      map.get(key)!.tareas.push(t);
    });
    return Array.from(map.values()).sort((a, b) => b.tareas.length - a.tareas.length);
  }, [pagedTasks]);

  // ===== Estadística lineal: tareas completadas por día del mes actual =====
  const monthlyStats = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const counts = Array<number>(daysInMonth).fill(0);

    tasks.forEach((t) => {
      if (t.estado !== 'COMPLETADA' || !t.fechaCompletada) return;
      const d = new Date(t.fechaCompletada);
      if (d.getFullYear() === year && d.getMonth() === month) {
        counts[d.getDate() - 1]++;
      }
    });

    const data = counts.map((c, i) => ({ dia: String(i + 1), completadas: c }));
    const totalMes = counts.reduce((a, b) => a + b, 0);
    let mejorDia = 0;
    let mejorValor = 0;
    counts.forEach((c, i) => {
      if (c > mejorValor) {
        mejorValor = c;
        mejorDia = i + 1;
      }
    });
    const nombreMes = now.toLocaleDateString('es-ES', { month: 'long' });
    return { data, totalMes, mejorDia, mejorValor, nombreMes: nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1) };
  }, [tasks]);

  // Acumulado para línea de tendencia más suave visualmente
  const chartData = useMemo(() => {
    let acc = 0;
    return monthlyStats.data.map((d) => ({ ...d, acumuladas: (acc += d.completadas) }));
  }, [monthlyStats]);

  const counts = {
    total: tasks.length,
    pendientes: tasks.filter((t) => t.estado === 'PENDIENTE').length,
    proceso: tasks.filter((t) => t.estado === 'EN_PROCESO').length,
    completadas: tasks.filter((t) => t.estado === 'COMPLETADA').length,
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setModalOpen(true);
  };

  const handleDelete = (task: Task) => {
    setDialog({
      variant: 'danger',
      title: 'Eliminar tarea',
      message: `¿Seguro que deseas eliminar "${task.titulo}"? Esta acción no se puede deshacer.`,
      action: async () => {
        await deleteTask(task.id);
        toast({ variant: 'success', title: 'Tarea eliminada', message: `"${task.titulo}" fue eliminada.` });
      },
    });
  };

  const handleStatusChange = async (task: Task, estado: TaskStatus) => {
    setStatusUpdating(task.id);
    try {
      await updateTaskStatus(task.id, estado);
      toast({
        variant: 'success',
        title: 'Estado actualizado',
        message: `"${task.titulo}" ahora está: ${getEstadoLabel(estado)}.`,
      });
    } catch {
      toast({ variant: 'error', title: 'Error', message: 'No se pudo actualizar el estado de la tarea.' });
    } finally {
      setStatusUpdating(null);
    }
  };

  const runDialogAction = async () => {
    const action = dialog?.action;
    setDialog(null);
    if (!action) return;
    try {
      await action();
    } catch (err) {
      console.error(err);
      toast({ variant: 'error', title: 'Error', message: 'No se pudo completar la acción.' });
    }
  };

  const fmtDate = (d: string) =>
    new Date(d + (d.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-md shadow-teal-500/30">
              <ListTodo className="w-5 h-5 text-white" />
            </span>
            Gestor de Tareas
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium text-sm">
            {canManage ? 'Crea, edita y da seguimiento a las tareas del equipo.' : 'Avance de tus tareas asignadas.'}
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => { setEditingTask(null); setModalOpen(true); }}
            className="btn-shine flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-teal-500/25 active:scale-95 w-full md:w-auto"
          >
            <Plus className="w-4 h-4" />
            Nueva Tarea
          </button>
        )}
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: counts.total, cls: 'from-slate-500 to-slate-700' },
          { label: 'Pendientes', value: counts.pendientes, cls: 'from-slate-400 to-slate-600' },
          { label: 'En Proceso', value: counts.proceso, cls: 'from-blue-500 to-indigo-600' },
          { label: 'Completadas', value: counts.completadas, cls: 'from-emerald-500 to-teal-600' },
        ].map((s) => (
          <div key={s.label} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm relative overflow-hidden">
            <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${s.cls} opacity-10 rounded-full blur-2xl -mr-4 -mt-4`} />
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{s.label}</p>
            <p className="text-2xl font-black text-slate-800 dark:text-white mt-1 tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>

      {/* ===== Estadística lineal mensual ===== */}
      <div className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden anim-fade-in-up">
        <div className="absolute -top-16 -right-16 w-56 h-56 bg-gradient-to-br from-teal-400/20 to-emerald-500/10 rounded-full blur-3xl pointer-events-none group-hover:scale-125 transition-transform duration-700" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 relative">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-md shadow-teal-500/30">
              <TrendingUp className="w-[18px] h-[18px] text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white leading-tight">Rendimiento del Mes</h3>
              <p className="text-xs text-slate-400 font-medium">Tareas completadas · {monthlyStats.nombreMes}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 text-white text-xs font-black shadow-md shadow-teal-500/30 tabular-nums">
              {monthlyStats.totalMes} completada{monthlyStats.totalMes !== 1 ? 's' : ''} este mes
            </span>
            {monthlyStats.mejorValor > 0 && (
              <span className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold ring-1 ring-amber-200 dark:ring-amber-500/30 tabular-nums">
                <Flame className="w-3.5 h-3.5" /> Mejor día: {monthlyStats.mejorDia} ({monthlyStats.mejorValor})
              </span>
            )}
          </div>
        </div>
        <div className="relative h-[210px] -ml-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradTareasMes" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.45} />
                  <stop offset="50%" stopColor="#10b981" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradStrokeTareas" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#0d9488" />
                  <stop offset="100%" stopColor="#34d399" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="currentColor" className="text-slate-200 dark:text-slate-800" />
              <XAxis
                dataKey="dia"
                tick={{ fontSize: 10, fontWeight: 700 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                minTickGap={12}
                tickMargin={6}
                className="fill-slate-400"
              />
              <YAxis allowDecimals={false} width={26} tick={{ fontSize: 10, fontWeight: 700 }} tickLine={false} axisLine={false} className="fill-slate-400" />
              <Tooltip
                cursor={{ stroke: '#14b8a6', strokeWidth: 1.5, strokeDasharray: '4 4' }}
                contentStyle={{
                  borderRadius: 12,
                  border: 'none',
                  boxShadow: '0 10px 30px -10px rgba(13,148,136,.35)',
                  fontSize: 12,
                  fontWeight: 700,
                  background: 'rgba(255,255,255,.96)',
                  color: '#0f172a',
                }}
                labelStyle={{ color: '#0d9488', fontWeight: 900 }}
                formatter={(value, name) => [
                  name === 'completadas'
                    ? `${Number(value)} tarea${Number(value) !== 1 ? 's' : ''}`
                    : `${Number(value)} acumuladas`,
                  name === 'completadas' ? 'Día' : 'Total mes',
                ] as [string, string]}
                labelFormatter={(label) => `Día ${label} de ${monthlyStats.nombreMes}`}
              />
              <Area
                type="monotone"
                dataKey="acumuladas"
                stroke="url(#gradStrokeTareas)"
                strokeWidth={1.5}
                strokeDasharray="5 4"
                fill="transparent"
                dot={false}
                activeDot={false}
                isAnimationActive
                animationDuration={1600}
                name="acumuladas"
              />
              <Area
                type="monotone"
                dataKey="completadas"
                stroke="url(#gradStrokeTareas)"
                strokeWidth={3}
                fill="url(#gradTareasMes)"
                dot={{ r: 2.5, fill: '#10b981', strokeWidth: 0 }}
                activeDot={{
                  r: 6,
                  fill: '#0d9488',
                  stroke: '#ffffff',
                  strokeWidth: 2.5,
                  style: { filter: 'drop-shadow(0 0 6px rgba(13,148,136,.7))' },
                }}
                isAnimationActive
                animationDuration={1400}
                name="completadas"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[11px] font-semibold text-slate-400 mt-2 relative">
          Línea sólida: tareas completadas por día · Línea punteada: acumulado del mes ({chartData.length > 0 ? chartData[chartData.length - 1].acumuladas : 0})
        </p>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-teal-500 transition-colors" />
          <input
            type="text"
            placeholder="Buscar por título o técnico..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/40 transition-all"
          />
        </div>
        <div className="inline-flex bg-slate-100 dark:bg-slate-800/70 rounded-xl p-1 gap-1 self-start overflow-x-auto">
          {ESTADO_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setEstadoFilter(f.value)}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all duration-300 active:scale-95 ${
                estadoFilter === f.value
                  ? 'bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-md shadow-teal-500/30'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Listado agrupado por técnico */}
      {loading && tasks.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-7 h-7 animate-spin text-teal-500" />
        </div>
      ) : grouped.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-14 text-center shadow-sm">
          <Inbox className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <p className="font-bold text-slate-600 dark:text-slate-300">No hay tareas registradas</p>
          <p className="text-sm text-slate-400 mt-1">
            {canManage ? 'Crea una tarea con el botón "Nueva Tarea" para asignarla a un técnico.' : 'Aún no tienes tareas asignadas. Cuando un supervisor te asigne una, aparecerá aquí y recibirás una notificación.'}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {grouped.map((group) => (
            <div key={group.tecnicoId} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden anim-fade-in-up">
              <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-teal-500/10 to-emerald-500/5 flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white text-xs font-black shadow-sm">
                    {group.nombre.split(' ').map((p) => p.charAt(0)).slice(0, 2).join('')}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{group.nombre}</p>
                    <p className="text-[11px] text-slate-400 font-medium">{group.tareas.length} tarea{group.tareas.length !== 1 ? 's' : ''} asignada{group.tareas.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <UserCheck className="w-4 h-4 text-teal-500 shrink-0" />
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {group.tareas.map((task) => (
                  <div key={task.id} className="px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <p className="font-bold text-sm text-slate-800 dark:text-slate-100">{task.titulo}</p>
                          <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-black uppercase ring-1 ${getPrioridadCls(task.prioridad)}`}>
                            {task.prioridad}
                          </span>
                          <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-black uppercase ring-1 ${getEstadoCls(task.estado)}`}>
                            {getEstadoLabel(task.estado)}
                          </span>
                        </div>
                        {task.descripcion && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">{task.descripcion}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[11px] font-semibold text-slate-400">
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays className="w-3 h-3" />
                            {fmtDate(task.fechaInicio)} → {fmtDate(task.fechaFin)}
                          </span>
                          {task.creadorNombre && <span>Creada por: {task.creadorNombre}</span>}
                        </div>

                        {/* Línea de tiempo del proceso */}
                        <TaskTimeline task={task} />

                        {/* Acciones de estado: solo el técnico asignado */}
                        {user?.id === task.tecnicoId && task.estado !== 'COMPLETADA' && (
                          <div className="flex flex-wrap items-center gap-2 mt-3">
                            {task.estado === 'PENDIENTE' && (
                              <button
                                onClick={() => handleStatusChange(task, 'EN_PROCESO')}
                                disabled={statusUpdating === task.id}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[11px] font-black uppercase tracking-wide ring-1 ring-blue-200 dark:ring-blue-500/30 hover:bg-blue-100 dark:hover:bg-blue-500/20 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                                {statusUpdating === task.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                                Iniciar Proceso
                              </button>
                            )}
                            <button
                              onClick={() => handleStatusChange(task, 'COMPLETADA')}
                              disabled={statusUpdating === task.id}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-black uppercase tracking-wide ring-1 ring-emerald-200 dark:ring-emerald-500/30 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              {statusUpdating === task.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                              Marcar Completada
                            </button>
                          </div>
                        )}
                      </div>
                      {canManage && (
                        <div className="flex items-center gap-1 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleEdit(task)}
                            title="Editar tarea"
                            className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(task)}
                            title="Eliminar tarea"
                            className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && filteredTasks.length > 0 && (
        <Pagination
          page={page}
          pageSize={pageSize}
          total={totalTasks}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          label="tareas"
        />
      )}

      <TaskModal isOpen={modalOpen} onClose={() => { setModalOpen(false); setEditingTask(null); }} task={editingTask} />
      <ConfirmDialog
        isOpen={!!dialog}
        variant={dialog?.variant || 'danger'}
        title={dialog?.title || ''}
        message={dialog?.message || ''}
        confirmText="Sí, eliminar"
        onConfirm={runDialogAction}
        onClose={() => setDialog(null)}
      />
    </div>
  );
}
