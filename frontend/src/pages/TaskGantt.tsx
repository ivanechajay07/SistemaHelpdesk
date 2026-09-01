import { useEffect, useMemo, useState } from 'react';
import { Plus, Loader2, ChartGantt, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTaskStore, type Task } from '../store/taskStore';
import { useAuthStore } from '../store/authStore';
import { TaskModal } from '../components/tasks/TaskModal';
import TaskStatusDialog from '../components/tasks/TaskStatusDialog';

const DAY_MS = 24 * 60 * 60 * 1000;

const ESTADO_BAR: Record<string, string> = {
  PENDIENTE: 'bg-gradient-to-r from-slate-400 to-slate-500',
  EN_PROCESO: 'bg-gradient-to-r from-blue-500 to-indigo-500',
  COMPLETADA: 'bg-gradient-to-r from-emerald-500 to-teal-500',
};

export default function TaskGantt() {
  const { tasks, loading, fetchTasks } = useTaskStore();
  const { isAdmin, hasRole } = useAuthStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [statusTask, setStatusTask] = useState<Task | null>(null);
  // Desplazamiento en días del rango visible
  const [offsetWeeks, setOffsetWeeks] = useState(0);

  // Solo ADMIN y SUPERVISOR gestionan; el técnico solo actualiza el avance
  const canManage = isAdmin() || hasRole('SUPERVISOR');

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Rango total de las tareas (con margen)
  const range = useMemo(() => {
    if (tasks.length === 0) return null;
    let min = Infinity;
    let max = -Infinity;
    tasks.forEach((t) => {
      const s = new Date(t.fechaInicio + (t.fechaInicio.length === 10 ? 'T00:00:00' : '')).getTime();
      const e = new Date(t.fechaFin + (t.fechaFin.length === 10 ? 'T00:00:00' : ''))!.getTime();
      if (s < min) min = s;
      if (e > max) max = e;
    });
    return { start: min - 2 * DAY_MS, end: max + 2 * DAY_MS };
  }, [tasks]);

  // Ventana visible: máximo 8 semanas o el rango completo si es menor
  const view = useMemo(() => {
    if (!range) return null;
    const fullDays = Math.ceil((range.end - range.start) / DAY_MS);
    const windowDays = Math.min(Math.max(fullDays, 14), 56);
    const start = range.start + offsetWeeks * 7 * DAY_MS;
    const end = Math.min(start + windowDays * DAY_MS, range.end + 7 * DAY_MS);
    return { start, end, days: Math.ceil((end - start) / DAY_MS) };
  }, [range, offsetWeeks]);

  // Agrupar por técnico
  const grouped = useMemo(() => {
    const map = new Map<string, { nombre: string; tareas: Task[] }>();
    tasks.forEach((t) => {
      const key = String(t.tecnicoId);
      if (!map.has(key)) map.set(key, { nombre: t.tecnicoNombre, tareas: [] });
      map.get(key)!.tareas.push(t);
    });
    return Array.from(map.values());
  }, [tasks]);

  const pct = (ms: number) => {
    if (!view) return 0;
    return ((ms - view.start) / (view.end - view.start)) * 100;
  };

  // Marcas de tiempo (semanales)
  const ticks = useMemo(() => {
    if (!view) return [];
    const list: { label: string; pct: number }[] = [];
    const d = new Date(view.start);
    d.setDate(d.getDate() + (7 - d.getDay()) % 7); // próximo domingo
    while (d.getTime() <= view.end) {
      list.push({
        label: d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
        pct: pct(d.getTime()),
      });
      d.setDate(d.getDate() + 7);
    }
    return list.filter((t) => t.pct > 2 && t.pct < 98);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const todayPct = range ? pct(Date.now()) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-md shadow-teal-500/30">
              <ChartGantt className="w-5 h-5 text-white" />
            </span>
            Diagrama de Gantt
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium text-sm">
            {canManage
              ? 'Línea de tiempo de las tareas por técnico. Haz clic en una barra para editarla.'
              : 'Línea de tiempo de tus tareas. Haz clic en una barra para actualizar su avance.'}
          </p>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="inline-flex bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1 shadow-sm">
            <button
              onClick={() => setOffsetWeeks((w) => Math.max(0, w - 1))}
              disabled={!view || offsetWeeks === 0}
              className="p-1.5 rounded-lg text-slate-500 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-500/10 disabled:opacity-40 transition-colors"
              title="Retroceder"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setOffsetWeeks(0)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                offsetWeeks === 0 ? 'bg-gradient-to-r from-teal-500 to-emerald-600 text-white' : 'text-slate-500 hover:text-teal-600'
              }`}
            >
              Inicio
            </button>
            <button
              onClick={() => setOffsetWeeks((w) => w + 1)}
              disabled={!view}
              className="p-1.5 rounded-lg text-slate-500 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-500/10 disabled:opacity-40 transition-colors"
              title="Avanzar"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          {canManage && (
            <button
              onClick={() => { setEditingTask(null); setModalOpen(true); }}
              className="btn-shine flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-teal-500/25 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Registrar Tarea
            </button>
          )}
        </div>
      </div>

      {/* Diagrama */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden anim-fade-in-up">
        {loading && tasks.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-7 h-7 animate-spin text-teal-500" />
          </div>
        ) : !range || tasks.length === 0 ? (
          <div className="py-16 text-center">
            <ChartGantt className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
            <p className="font-bold text-slate-600 dark:text-slate-300">No hay tareas para graficar</p>
            <p className="text-sm text-slate-400 mt-1">
              {canManage ? 'Registra tareas para verlas en el diagrama de Gantt.' : 'Aún no tienes tareas asignadas.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[720px] p-5">
              {/* Cabecera de tiempos */}
              <div className="relative h-8 ml-[180px] mr-2">
                {ticks.map((t, i) => (
                  <span
                    key={i}
                    className="absolute top-1 -translate-x-1/2 text-[10px] font-black uppercase tracking-wide text-slate-400 whitespace-nowrap"
                    style={{ left: `${t.pct}%` }}
                  >
                    {t.label}
                  </span>
                ))}
                {ticks.map((t, i) => (
                  <span key={`line-${i}`} className="absolute top-6 bottom-0 w-px bg-slate-100 dark:bg-slate-800" style={{ left: `${t.pct}%` }} />
                ))}
              </div>

              {/* Filas por técnico */}
              <div className="space-y-4">
                {grouped.map((group) => (
                  <div key={group.nombre}>
                    <p className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 inline-flex items-center justify-center text-white text-[9px] font-black">
                        {group.nombre.split(' ').map((p) => p.charAt(0)).slice(0, 2).join('')}
                      </span>
                      {group.nombre}
                    </p>
                    <div className="space-y-1.5">
                      {group.tareas.map((task) => {
                        const s = new Date(task.fechaInicio + (task.fechaInicio.length === 10 ? 'T00:00:00' : '')).getTime();
                        const e = new Date(task.fechaFin + (task.fechaFin.length === 10 ? 'T00:00:00' : '')).getTime() + DAY_MS - 1;
                        const left = Math.max(pct(s), 0);
                        const right = Math.min(pct(e), 100);
                        const width = Math.max(right - left, 1.5);
                        const inView = right > 0 && left < 100;
                        if (!inView) return null;
                        return (
                          <div key={task.id} className="relative h-8 ml-[180px] mr-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 overflow-hidden">
                            {/* Líneas guía */}
                            {ticks.map((t, i) => (
                              <span key={i} className="absolute inset-y-0 w-px bg-slate-100 dark:bg-slate-800" style={{ left: `${t.pct}%` }} />
                            ))}
                            <button
                              onClick={() => { if (canManage) { setEditingTask(task); setModalOpen(true); } else { setStatusTask(task); } }}
                              title={`${task.titulo} · ${task.fechaInicio} → ${task.fechaFin}${canManage ? '' : task.estado === 'COMPLETADA' ? ' · completada' : ' · clic para actualizar avance'}`}
                              className={`absolute top-1 bottom-1 ${ESTADO_BAR[task.estado] || ESTADO_BAR.PENDIENTE} rounded-md shadow-sm hover:shadow-lg hover:brightness-110 active:scale-[0.99] transition-all flex items-center px-2 min-w-0`}
                              style={{ left: `${left}%`, width: `${width}%` }}
                            >
                              <span className="text-[10px] font-bold text-white truncate drop-shadow-sm">{task.titulo}</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* Línea de hoy */}
                {todayPct !== null && todayPct > 0 && todayPct < 100 && (
                  <div className="relative ml-[180px] mr-2 h-0">
                    <span className="absolute -top-[calc(100%+0px)] inset-y-0 w-[2px] bg-red-500/70 rounded-full" style={{ left: `${todayPct}%`, height: '100%' }} />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
        <span>Estado:</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-4 h-3 rounded bg-gradient-to-r from-slate-400 to-slate-500" /> Pendiente</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-4 h-3 rounded bg-gradient-to-r from-blue-500 to-indigo-500" /> En Proceso</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-4 h-3 rounded bg-gradient-to-r from-emerald-500 to-teal-500" /> Completada</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-[2px] h-3.5 bg-red-500/70 rounded-full" /> Hoy</span>
      </div>

      <TaskModal isOpen={modalOpen} onClose={() => { setModalOpen(false); setEditingTask(null); }} task={editingTask} />
      <TaskStatusDialog isOpen={!!statusTask} onClose={() => setStatusTask(null)} task={statusTask} />
    </div>
  );
}
