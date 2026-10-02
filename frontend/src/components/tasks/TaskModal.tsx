import React, { useEffect, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import FormModal, { SectionTitle } from '../ui/FormModal';
import { useTaskStore, type Task, type TaskPriority, type TaskStatus } from '../../store/taskStore';
import { useUserStore } from '../../store/userStore';
import { useToast } from '../ui/Toast';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  defaultFecha?: string;
}

const PRIORIDADES: { value: TaskPriority; label: string; cls: string }[] = [
  { value: 'BAJA', label: 'Baja', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400' },
  { value: 'MEDIA', label: 'Media', cls: 'bg-yellow-50 text-yellow-700 ring-yellow-500/20 dark:bg-yellow-500/10 dark:text-yellow-400' },
  { value: 'ALTA', label: 'Alta', cls: 'bg-orange-50 text-orange-700 ring-orange-500/20 dark:bg-orange-500/10 dark:text-orange-400' },
  { value: 'CRITICA', label: 'Crítica', cls: 'bg-red-50 text-red-700 ring-red-500/20 dark:bg-red-500/10 dark:text-red-400' },
];

const ESTADOS: { value: TaskStatus; label: string }[] = [
  { value: 'PENDIENTE', label: 'Pendiente' },
  { value: 'EN_PROCESO', label: 'En Proceso' },
  { value: 'COMPLETADA', label: 'Completada' },
];

export const getPrioridadCls = (p: string) => PRIORIDADES.find((x) => x.value === p)?.cls || PRIORIDADES[1].cls;
export const getEstadoCls = (e: string) =>
  e === 'COMPLETADA'
    ? 'bg-emerald-50 text-emerald-700 ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400'
    : e === 'EN_PROCESO'
      ? 'bg-blue-50 text-blue-700 ring-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400'
      : 'bg-slate-100 text-slate-600 ring-slate-500/20 dark:bg-slate-500/10 dark:text-slate-400';
export const getEstadoLabel = (e: string) => ESTADOS.find((x) => x.value === e)?.label || e;

export function TaskModal({ isOpen, onClose, task, defaultFecha }: TaskModalProps) {
  const { technicians, fetchTechnicians } = useUserStore();
  const { createTask, updateTask } = useTaskStore();
  const toast = useToast();

  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [prioridad, setPrioridad] = useState<TaskPriority>('MEDIA');
  const [estado, setEstado] = useState<TaskStatus>('PENDIENTE');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [tecnicoId, setTecnicoId] = useState<number | ''>('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchTechnicians();
      setError('');
      if (task) {
        setTitulo(task.titulo);
        setDescripcion(task.descripcion || '');
        setPrioridad(task.prioridad);
        setEstado(task.estado);
        setFechaInicio(task.fechaInicio);
        setFechaFin(task.fechaFin);
        setTecnicoId(task.tecnicoId);
      } else {
        const d = defaultFecha || new Date().toISOString().slice(0, 10);
        setTitulo('');
        setDescripcion('');
        setPrioridad('MEDIA');
        setEstado('PENDIENTE');
        setFechaInicio(d);
        setFechaFin(d);
        setTecnicoId('');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, task, defaultFecha]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!titulo.trim()) return setError('El título es obligatorio.');
    if (!fechaInicio || !fechaFin) return setError('Las fechas son obligatorias.');
    if (new Date(fechaFin) < new Date(fechaInicio)) return setError('La fecha fin no puede ser anterior a la fecha inicio.');
    if (!tecnicoId) return setError('Debes asignar un técnico.');

    setSaving(true);
    try {
      const payload = {
        titulo: titulo.trim(),
        descripcion: descripcion.trim() || undefined,
        prioridad,
        estado,
        fechaInicio,
        fechaFin,
        tecnicoId: Number(tecnicoId),
      };
      if (task) {
        await updateTask(task.id, payload);
        toast({ variant: 'success', title: 'Tarea actualizada', message: `"${payload.titulo}" se guardó correctamente.` });
      } else {
        await createTask(payload);
        toast({ variant: 'success', title: 'Tarea registrada', message: `"${payload.titulo}" fue asignada correctamente.` });
      }
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al guardar la tarea. Intenta nuevamente.');
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    'w-full px-3 py-2.5 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400/40 transition-all';

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      title={task ? 'Editar Tarea' : 'Nueva Tarea'}
      subtitle="Planifica y asigna el trabajo"
      icon={<CalendarDays className="w-5 h-5" />}
      theme="tasks"
      onSubmit={handleSubmit}
      submitLabel={task ? 'Guardar Cambios' : 'Registrar Tarea'}
      loading={saving}
      error={error}
      closeOnBackdrop
      maxWidth="max-w-lg"
    >
      <SectionTitle>Detalle de la tarea</SectionTitle>
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Título *</label>
            <input type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)} className={inputCls} placeholder="Ej. Instalación de red en área contable" maxLength={150} autoFocus />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Descripción</label>
            <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className={`${inputCls} resize-none`} rows={2} placeholder="Detalles de la tarea..." maxLength={2000} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Prioridad</label>
              <select value={prioridad} onChange={(e) => setPrioridad(e.target.value as TaskPriority)} className={inputCls}>
                {PRIORIDADES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Fecha Inicio *</label>
              <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Fecha Fin *</label>
              <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Técnico Asignado *</label>
              <select value={tecnicoId} onChange={(e) => setTecnicoId(e.target.value ? Number(e.target.value) : '')} className={inputCls}>
                <option value="">Seleccionar técnico...</option>
                {technicians.map((t) => (
                  <option key={t.id} value={t.id}>{t.nombre} {t.apellidos}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Estado</label>
              <select value={estado} onChange={(e) => setEstado(e.target.value as TaskStatus)} className={inputCls}>
                {ESTADOS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

    </FormModal>
  );
}
