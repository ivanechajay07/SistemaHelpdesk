import { useEffect, useRef, useState } from 'react';
import {
  X, Play, CheckCircle2, Loader2, CalendarDays, ImagePlus, Trash2, FileDown, Images, Save,
} from 'lucide-react';
import {
  useTaskStore, type Task, type TaskStatus, type TaskEvidence, type TaskEvidenceTipo,
} from '../../store/taskStore';
import { useAuthStore } from '../../store/authStore';
import { getPrioridadCls, getEstadoCls, getEstadoLabel } from './TaskModal';
import { useToast } from '../ui/Toast';
import { generarTareaPdf } from '../../lib/taskPdf';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
}

const MAX_PENDING = 6;
const MAX_DIM = 1280;

/** Comprime una imagen a JPEG en base64 para enviarla como evidencia. */
const compressImage = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > MAX_DIM || height > MAX_DIM) {
          const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas no soportado'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = () => reject(new Error('Imagen inválida'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
    reader.readAsDataURL(file);
  });

/**
 * Diálogo para el técnico asignado: registra evidencia fotográfica del avance
 * y del trabajo realizado, actualiza el estado y exporta el informe en PDF.
 */
export default function TaskStatusDialog({ isOpen, onClose, task }: Props) {
  const { updateTaskStatus, fetchTaskEvidence, addTaskEvidence, deleteTaskEvidence } = useTaskStore();
  const { user, isAdmin, hasRole } = useAuthStore();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [evidencias, setEvidencias] = useState<TaskEvidence[]>([]);
  const [pending, setPending] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [loadingEv, setLoadingEv] = useState(false);
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const canManage = isAdmin() || hasRole('SUPERVISOR');
  const isAssignee = !!task && user?.id === task.tecnicoId;
  const canWrite = canManage || isAssignee;

  const loadEvidence = async (taskId: number) => {
    setLoadingEv(true);
    try {
      const list = await fetchTaskEvidence(taskId);
      setEvidencias(list);
    } catch {
      /* silencioso */
    } finally {
      setLoadingEv(false);
    }
  };

  useEffect(() => {
    if (isOpen && task) {
      setPending([]);
      setComment('');
      loadEvidence(task.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, task?.id]);

  if (!isOpen || !task) return null;

  const handleAddFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (fileRef.current) fileRef.current.value = '';
    if (files.length === 0) return;
    const space = MAX_PENDING - pending.length;
    if (space <= 0) {
      toast({ variant: 'error', title: 'Límite alcanzado', message: `Puedes adjuntar hasta ${MAX_PENDING} imágenes a la vez.` });
      return;
    }
    try {
      const comprimidas = await Promise.all(files.slice(0, space).map(compressImage));
      setPending((prev) => [...prev, ...comprimidas]);
    } catch {
      toast({ variant: 'error', title: 'Error', message: 'No se pudieron procesar las imágenes seleccionadas.' });
    }
  };

  const uploadPending = async (tipo: TaskEvidenceTipo) => {
    for (const imagenData of pending) {
      await addTaskEvidence(task.id, { tipo, imagenData, comentario: comment.trim() || undefined });
    }
    setPending([]);
    setComment('');
  };

  const refresh = async () => {
    const list = await fetchTaskEvidence(task.id);
    setEvidencias(list);
    return list;
  };

  const changeWithEvidence = async (estado: TaskStatus) => {
    const tipo: TaskEvidenceTipo = estado === 'COMPLETADA' ? 'COMPLETADA' : 'PROCESO';
    setBusy(true);
    try {
      if (pending.length > 0) {
        await uploadPending(tipo);
      }
      const list = await refresh();
      if (!list.some((ev) => ev.tipo === tipo)) {
        toast({
          variant: 'error',
          title: 'Falta evidencia',
          message:
            tipo === 'PROCESO'
              ? 'Adjunta al menos una imagen que muestre cómo vas resolviendo la tarea.'
              : 'Adjunta al menos una imagen del trabajo realizado para completar la tarea.',
        });
        return;
      }
      await updateTaskStatus(task.id, estado);
      toast({
        variant: 'success',
        title: 'Estado actualizado',
        message: `"${task.titulo}" ahora está: ${getEstadoLabel(estado)}.`,
      });
      onClose();
    } catch (err: any) {
      toast({
        variant: 'error',
        title: 'Error',
        message: err?.response?.data?.message || 'No se pudo actualizar el estado de la tarea.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleSaveEvidence = async () => {
    if (pending.length === 0) {
      toast({ variant: 'error', title: 'Sin imágenes', message: 'Selecciona al menos una imagen para guardar la evidencia.' });
      return;
    }
    setBusy(true);
    try {
      await uploadPending(task.estado === 'COMPLETADA' ? 'COMPLETADA' : 'PROCESO');
      await refresh();
      toast({ variant: 'success', title: 'Evidencia guardada', message: 'Las imágenes se registraron correctamente.' });
    } catch (err: any) {
      toast({
        variant: 'error',
        title: 'Error',
        message: err?.response?.data?.message || 'No se pudo guardar la evidencia.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteEvidence = async (ev: TaskEvidence) => {
    try {
      await deleteTaskEvidence(task.id, ev.id);
      setEvidencias((prev) => prev.filter((x) => x.id !== ev.id));
    } catch (err: any) {
      toast({ variant: 'error', title: 'Error', message: err?.response?.data?.message || 'No se pudo eliminar la evidencia.' });
    }
  };

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      const list = evidencias.length ? evidencias : await fetchTaskEvidence(task.id);
      const doc = await generarTareaPdf({ task, evidencias: list });
      doc.save(`Informe_Tarea_${task.id}.pdf`);
    } catch {
      toast({ variant: 'error', title: 'Error', message: 'No se pudo generar el informe en PDF.' });
    } finally {
      setDownloading(false);
    }
  };

  const procesoEv = evidencias.filter((e) => e.tipo === 'PROCESO');
  const completadaEv = evidencias.filter((e) => e.tipo === 'COMPLETADA');

  const EvidenceGrid = ({ items }: { items: TaskEvidence[] }) =>
    items.length === 0 ? null : (
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {items.map((ev) => (
          <div key={ev.id} className="relative group rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
            <img src={ev.imagenData} alt={ev.comentario || 'Evidencia'} className="w-full h-20 object-cover" />
            {canWrite && (
              <button
                type="button"
                onClick={() => handleDeleteEvidence(ev)}
                className="absolute top-1 right-1 p-1 rounded-md bg-red-500/90 hover:bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                title="Eliminar evidencia"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
            {ev.comentario && (
              <p className="px-1.5 py-1 text-[9px] text-slate-500 dark:text-slate-400 line-clamp-2">{ev.comentario}</p>
            )}
          </div>
        ))}
      </div>
    );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm anim-fade-in" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[calc(100dvh-2rem)] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="relative bg-gradient-to-r from-teal-500 to-emerald-600 px-5 py-4 shrink-0">
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

        {/* Contenido */}
        <div className="px-5 py-4 space-y-4 overflow-y-auto">
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
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{task.descripcion}</p>
          )}

          {/* Evidencia existente */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Images className="w-3.5 h-3.5" /> Evidencia registrada
              </p>
              {loadingEv && <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-500" />}
            </div>

            {procesoEv.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase text-blue-600 dark:text-blue-400 mb-1">Avance / En proceso</p>
                <EvidenceGrid items={procesoEv} />
              </div>
            )}
            {completadaEv.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400 mb-1">Trabajo realizado / Completada</p>
                <EvidenceGrid items={completadaEv} />
              </div>
            )}
            {!loadingEv && evidencias.length === 0 && (
              <p className="text-xs text-slate-400 italic">Aún no hay imágenes de evidencia.</p>
            )}
          </div>

          {/* Añadir evidencia */}
          {canWrite && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 space-y-3 bg-slate-50/50 dark:bg-slate-800/30">
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Añadir imágenes</p>
              {pending.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {pending.map((img, i) => (
                    <div key={i} className="relative rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                      <img src={img} alt={`Pendiente ${i + 1}`} className="w-full h-20 object-cover" />
                      <button
                        type="button"
                        onClick={() => setPending((prev) => prev.filter((_, idx) => idx !== i))}
                        className="absolute top-1 right-1 p-1 rounded-md bg-slate-900/70 hover:bg-red-600 text-white"
                        title="Quitar"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:border-teal-400 transition-colors disabled:opacity-60"
                >
                  <ImagePlus className="w-4 h-4" /> Seleccionar imágenes
                </button>
                <span className="text-[10px] text-slate-400">{pending.length}/{MAX_PENDING} seleccionadas</span>
              </div>
              <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleAddFiles} />
              <textarea
                rows={2}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Comentario de la evidencia (opcional)..."
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-200 resize-none focus:outline-none focus:ring-2 focus:ring-teal-500/40"
              />
              <button
                type="button"
                onClick={handleSaveEvidence}
                disabled={busy || pending.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400 text-xs font-black uppercase tracking-wide ring-1 ring-teal-200 dark:ring-teal-500/30 hover:bg-teal-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Guardar evidencia
              </button>
            </div>
          )}

          {/* Acciones de estado */}
          {(canWrite || canManage) && (
            <div className="flex flex-wrap gap-2 pt-1">
              {task.estado === 'PENDIENTE' && (
                <button
                  onClick={() => changeWithEvidence('EN_PROCESO')}
                  disabled={busy}
                  className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-black uppercase tracking-wide ring-1 ring-blue-200 dark:ring-blue-500/30 hover:bg-blue-100 dark:hover:bg-blue-500/20 active:scale-95 transition-all disabled:opacity-60"
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  Iniciar Proceso
                </button>
              )}
              {task.estado !== 'COMPLETADA' && (
                <button
                  onClick={() => changeWithEvidence('COMPLETADA')}
                  disabled={busy}
                  className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-black uppercase tracking-wide ring-1 ring-emerald-200 dark:ring-emerald-500/30 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 active:scale-95 transition-all disabled:opacity-60"
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Marcar Completada
                </button>
              )}
              {task.estado === 'COMPLETADA' && (
                <p className="w-full text-center text-xs font-bold text-emerald-600 dark:text-emerald-400 py-2">
                  ✓ Esta tarea ya fue completada. Puedes seguir añadiendo evidencia.
                </p>
              )}
            </div>
          )}

          {/* Informe PDF */}
          <button
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-slate-700 to-slate-900 hover:from-slate-800 hover:to-black text-white text-xs font-black uppercase tracking-wide transition-all shadow-md active:scale-95 disabled:opacity-60"
          >
            {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
            Exportar informe en PDF
          </button>
        </div>
      </div>
    </div>
  );
}
