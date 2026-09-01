import { useState } from 'react';
import { X, Play, CheckCircle2, Loader2, CalendarDays } from 'lucide-react';
import { useTaskStore, type Task, type TaskStatus } from '../../store/taskStore';
import { getPrioridadCls, getEstadoCls, getEstadoLabel } from './TaskModal';
import { useToast } from '../ui/Toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
}

/**
 * Diálogo de solo estado para técnicos: pueden iniciar el proceso o
 * marcar como completada una tarea asignada a ellos. Sin edición completa.
 */
export default function TaskStatusDialog({ isOpen, onClose, task }: Props) {
  const { updateTaskStatus } = useTaskStore();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  if (!isOpen || !task) return null;

  const change = async (estado: TaskStatus, label: string) => {
    setBusy(true);
    try {
      await updateTaskStatus(task.id, estado);
      toast({
        variant: 'success',
        title: 'Estado actualizado',
        message: `"${task.titulo}" ahora está: ${label}.`,
      });
      onClose();
    } catch {
      toast({ variant: 'error', title: 'Error', message: 'No se pudo actualizar el estado de la tarea.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm anim-fade-in" onClick={onClose}>
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="relative bg-gradient-to-r from-teal-500 to-emerald-600 px-5 py-4">
          <div className="absolute -top-8 -right-8 w-28 h-28 bg-white/15 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-start justify-between gap-3 relative">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-teal-100">Avance de tarea</p>
              <h3 className="text-base font-extrabold text-white leading-snug truncate">{task.titulo}</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition-colors shrink-0"
              title="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Detalle */}
        <div className="px-5 py-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-black uppercase ring-1 ${getPrioridadCls(task.prioridad)}`}>
              {task.prioridad}
            </span>
            <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-black uppercase ring-1 ${getEstadoCls(task.estado)}`}>
              {getEstadoLabel(task.estado)}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400">
              <CalendarDays className="w-3 h-3" />
              {task.fechaInicio} → {task.fechaFin}
            </span>
          </div>
          {task.descripcion && (
            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed">{task.descripcion}</p>
          )}
          <p className="text-xs font-medium text-slate-400">
            Como técnico asignado, solo puedes actualizar el avance de esta tarea.
          </p>

          {/* Acciones */}
          <div className="flex flex-wrap gap-2 pt-1">
            {task.estado === 'PENDIENTE' && (
              <button
                onClick={() => change('EN_PROCESO', 'En Proceso')}
                disabled={busy}
                className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-black uppercase tracking-wide ring-1 ring-blue-200 dark:ring-blue-500/30 hover:bg-blue-100 dark:hover:bg-blue-500/20 active:scale-95 transition-all disabled:opacity-60"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                Iniciar Proceso
              </button>
            )}
            {task.estado !== 'COMPLETADA' && (
              <button
                onClick={() => change('COMPLETADA', 'Completada')}
                disabled={busy}
                className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-black uppercase tracking-wide ring-1 ring-emerald-200 dark:ring-emerald-500/30 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 active:scale-95 transition-all disabled:opacity-60"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Marcar Completada
              </button>
            )}
            {task.estado === 'COMPLETADA' && (
              <p className="w-full text-center text-xs font-bold text-emerald-600 dark:text-emerald-400 py-2">
                ✓ Esta tarea ya fue completada.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
