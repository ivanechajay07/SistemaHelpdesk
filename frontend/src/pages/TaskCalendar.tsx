import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, Plus, Loader2, CalendarRange } from 'lucide-react';
import { useTaskStore, type Task } from '../store/taskStore';
import { useAuthStore } from '../store/authStore';
import { TaskModal, getPrioridadCls } from '../components/tasks/TaskModal';
import TaskStatusDialog from '../components/tasks/TaskStatusDialog';

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const toKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function TaskCalendar() {
  const { tasks, loading, fetchTasks } = useTaskStore();
  const { isAdmin, hasRole } = useAuthStore();
  const [cursor, setCursor] = useState(() => new Date());
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [defaultFecha, setDefaultFecha] = useState<string | undefined>(undefined);
  const [statusTask, setStatusTask] = useState<Task | null>(null);

  // Solo ADMIN y SUPERVISOR gestionan; el técnico solo actualiza el avance
  const canManage = isAdmin() || hasRole('SUPERVISOR');

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Tareas activas por día (fechaInicio <= día <= fechaFin)
  const tasksByDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach((t) => {
      const start = new Date(t.fechaInicio + (t.fechaInicio.length === 10 ? 'T00:00:00' : ''));
      const end = new Date(t.fechaFin + (t.fechaFin.length === 10 ? 'T00:00:00' : ''));
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = toKey(d);
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(t);
      }
    });
    return map;
  }, [tasks]);

  const grid = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const first = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    // Lunes = 0 ... Domingo = 6
    const startOffset = (first.getDay() + 6) % 7;

    const cells: { date: Date | null; key: string }[] = [];
    for (let i = 0; i < startOffset; i++) cells.push({ date: null, key: `pad-${i}` });
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      cells.push({ date, key: toKey(date) });
    }
    while (cells.length % 7 !== 0) cells.push({ date: null, key: `pad-end-${cells.length}` });
    return cells;
  }, [cursor]);

  const todayKey = toKey(new Date());

  const openNewTask = (date: Date) => {
    setEditingTask(null);
    setDefaultFecha(toKey(date));
    setModalOpen(true);
  };

  const openEditTask = (task: Task) => {
    setEditingTask(task);
    setDefaultFecha(undefined);
    setModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-md shadow-teal-500/30">
              <CalendarRange className="w-5 h-5 text-white" />
            </span>
            Calendario de Tareas
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium text-sm">
            {canManage
              ? 'Tareas asignadas por fecha. Haz clic en una tarea para editarla.'
              : 'Tus tareas por fecha. Haz clic en una tarea para actualizar su avance.'}
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => openNewTask(new Date())}
            className="btn-shine flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-teal-500/25 active:scale-95 w-full md:w-auto"
          >
            <Plus className="w-4 h-4" />
            Nueva Tarea
          </button>
        )}
      </div>

      {/* Navegación de mes */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 shadow-sm">
        <button
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          className="p-2 rounded-xl text-slate-500 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-500/10 transition-colors"
          title="Mes anterior"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <p className="font-black text-lg text-slate-800 dark:text-white leading-tight">
            {MESES[cursor.getMonth()]} {cursor.getFullYear()}
          </p>
          <button
            onClick={() => setCursor(new Date())}
            className="text-[11px] font-bold text-teal-600 dark:text-teal-400 hover:underline"
          >
            Ir a hoy
          </button>
        </div>
        <button
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          className="p-2 rounded-xl text-slate-500 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-500/10 transition-colors"
          title="Mes siguiente"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Grid del calendario */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {loading && tasks.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-7 h-7 animate-spin text-teal-500" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
              {DIAS.map((d) => (
                <div key={d} className="py-2.5 text-center text-[11px] font-black uppercase tracking-wider text-slate-400">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {grid.map((cell) => {
                if (!cell.date) {
                  return <div key={cell.key} className="min-h-[96px] sm:min-h-[110px] bg-slate-50/40 dark:bg-slate-900/40 border-b border-r border-slate-100 dark:border-slate-800/60" />;
                }
                const key = cell.key;
                const dayTasks = tasksByDay.get(key) || [];
                const isToday = key === todayKey;
                return (
                  <div
                    key={key}
                    className={`group/day min-h-[96px] sm:min-h-[110px] border-b border-r border-slate-100 dark:border-slate-800/60 p-1.5 flex flex-col gap-1 relative ${
                      isToday ? 'bg-teal-50/60 dark:bg-teal-500/5' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-[11px] font-black tabular-nums ${
                        isToday
                          ? 'bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-sm'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}>
                        {cell.date.getDate()}
                      </span>
                      {canManage && (
                        <button
                          onClick={() => openNewTask(cell.date!)}
                          title="Nueva tarea este día"
                          className="opacity-0 group-hover/day:opacity-100 p-1 rounded-md text-slate-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-500/10 transition-all"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 overflow-y-auto max-h-[72px]">
                      {dayTasks.slice(0, 3).map((t) => (
                        <button
                          key={`${t.id}-${key}`}
                          onClick={() => (canManage ? openEditTask(t) : setStatusTask(t))}
                          title={canManage ? `${t.titulo} (clic para editar)` : `${t.titulo} · ${t.estado === 'COMPLETADA' ? 'completada' : 'clic para actualizar avance'}`}
                          className={`w-full text-left px-1.5 py-1 rounded-md text-[10px] font-bold truncate ring-1 transition-transform hover:scale-[1.03] ${getPrioridadCls(t.prioridad)} ${
                            t.estado === 'COMPLETADA' ? 'line-through opacity-70' : ''
                          }`}
                        >
                          {t.titulo}
                        </button>
                      ))}
                      {dayTasks.length > 3 && (
                        <span className="text-[9px] font-black text-slate-400 pl-1">+{dayTasks.length - 3} más</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5 text-teal-500" /> Colores por prioridad:</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded ring-1 bg-emerald-50 ring-emerald-500/20 dark:bg-emerald-500/10" /> Baja</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded ring-1 bg-yellow-50 ring-yellow-500/20 dark:bg-yellow-500/10" /> Media</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded ring-1 bg-orange-50 ring-orange-500/20 dark:bg-orange-500/10" /> Alta</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded ring-1 bg-red-50 ring-red-500/20 dark:bg-red-500/10" /> Crítica</span>
      </div>

      <TaskModal isOpen={modalOpen} onClose={() => { setModalOpen(false); setEditingTask(null); setDefaultFecha(undefined); }} task={editingTask} defaultFecha={defaultFecha} />
      <TaskStatusDialog isOpen={!!statusTask} onClose={() => setStatusTask(null)} task={statusTask} />
    </div>
  );
}
