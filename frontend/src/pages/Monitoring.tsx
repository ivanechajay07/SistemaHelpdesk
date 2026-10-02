import React, { useState, useEffect } from 'react';
import {
  Activity, Plus, Loader2, Pencil, Trash2, Zap, Globe, Network,
  AlertTriangle, CheckCircle2, Clock, Link2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import FormModal, { SectionTitle } from '../components/ui/FormModal';
import { useMonitoringStore, type MonitoredTarget, type MonitoredTargetRequest, type TargetType } from '../store/monitoringStore';
import ConfirmDialog, { type DialogVariant } from '../components/ui/ConfirmDialog';
import Pagination from '../components/ui/Pagination';
import { usePagedList } from '../lib/hooks';
import { useToast } from '../components/ui/Toast';

interface TargetForm {
  nombre: string;
  tipo: TargetType;
  host: string;
  puerto: string;
  intervaloSegundos: number;
  umbralFallos: number;
  activo: boolean;
}

const emptyForm: TargetForm = {
  nombre: '', tipo: 'HTTP', host: '', puerto: '',
  intervaloSegundos: 60, umbralFallos: 3, activo: true,
};

export default function Monitoring() {
  const { targets, loading, fetchTargets, createTarget, updateTarget, deleteTarget, checkNow } = useMonitoringStore();
  const toast = useToast();
  const navigate = useNavigate();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<TargetForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [checkingId, setCheckingId] = useState<number | null>(null);
  const { page, setPage, pageSize, setPageSize, paged: pagedTargets, total: totalTargets } = usePagedList(targets, 10);
  const [dialog, setDialog] = useState<{
    variant: DialogVariant;
    title: string;
    message: string;
    confirmText?: string;
    action?: () => Promise<void>;
    successTitle?: string;
  } | null>(null);

  useEffect(() => {
    fetchTargets();
    const interval = setInterval(() => fetchTargets(), 15000);
    return () => clearInterval(interval);
  }, [fetchTargets]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setEditorOpen(true);
  };

  const openEdit = (target: MonitoredTarget) => {
    setEditingId(target.id);
    setForm({
      nombre: target.nombre,
      tipo: target.tipo,
      host: target.host,
      puerto: target.puerto ? String(target.puerto) : '',
      intervaloSegundos: target.intervaloSegundos,
      umbralFallos: target.umbralFallos,
      activo: target.activo,
    });
    setEditorOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim() || !form.host.trim()) return;
    if (form.tipo === 'TCP' && !form.puerto.trim()) return;
    setSaving(true);
    const payload: MonitoredTargetRequest = {
      nombre: form.nombre,
      tipo: form.tipo,
      host: form.host,
      puerto: form.tipo === 'TCP' ? Number(form.puerto) : undefined,
      intervaloSegundos: Number(form.intervaloSegundos),
      umbralFallos: Number(form.umbralFallos),
      activo: form.activo,
    };
    try {
      if (editingId) {
        await updateTarget(editingId, payload);
        toast({ variant: 'success', title: 'Objetivo actualizado', message: `"${form.nombre}" se guardó correctamente.` });
      } else {
        await createTarget(payload);
        toast({ variant: 'success', title: 'Objetivo agregado', message: `Se comenzó a monitorear "${form.nombre}".` });
      }
      setEditorOpen(false);
      await fetchTargets();
    } catch (err) {
      console.error(err);
      toast({ variant: 'error', title: 'Error al guardar', message: 'No se pudo guardar el objetivo. Inténtalo nuevamente.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (target: MonitoredTarget) => {
    setDialog({
      variant: 'danger',
      title: 'Eliminar objetivo',
      message: `¿Dejar de monitorear "${target.nombre}"? Los tickets ya generados no se verán afectados.`,
      confirmText: 'Sí, eliminar',
      action: async () => {
        await deleteTarget(target.id);
        await fetchTargets();
      },
      successTitle: 'Objetivo eliminado',
    });
  };

  const handleCheckNow = async (target: MonitoredTarget) => {
    setCheckingId(target.id);
    try {
      const updated = await checkNow(target.id);
      if (updated.ultimoEstado === 'UP') {
        toast({ variant: 'success', title: `${target.nombre}: EN LÍNEA`, message: `Respuesta en ${updated.ultimaLatenciaMs} ms` });
      } else {
        toast({ variant: 'error', title: `${target.nombre}: SIN RESPUESTA`, message: 'El objetivo no respondió a la verificación.' });
      }
      await fetchTargets();
    } catch (err) {
      console.error(err);
      toast({ variant: 'error', title: 'Error de verificación', message: 'No se pudo completar la verificación manual.' });
    } finally {
      setCheckingId(null);
    }
  };

  const runDialogAction = async () => {
    const action = dialog?.action;
    const successTitle = dialog?.successTitle;
    setDialog(null);
    if (!action) return;
    try {
      await action();
      if (successTitle) toast({ variant: 'success', title: successTitle });
    } catch (err) {
      console.error(err);
      toast({ variant: 'error', title: 'Error en la operación', message: 'No se pudo completar la acción.' });
    }
  };

  const statusConfig = (target: MonitoredTarget) => {
    if (!target.activo) return { label: 'PAUSADO', dot: 'bg-slate-400', text: 'text-slate-500 dark:text-slate-400', bg: 'bg-slate-100 dark:bg-slate-500/10' };
    switch (target.ultimoEstado) {
      case 'UP': return { label: 'EN LÍNEA', dot: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)] animate-pulse', text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10' };
      case 'DOWN': return { label: 'CAÍDO', dot: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.7)] animate-pulse', text: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-500/10' };
      default: return { label: 'PENDIENTE', dot: 'bg-amber-400', text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10' };
    }
  };

  return (
    <div className="space-y-5 anim-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25">
              <Activity className="w-5 h-5" />
            </span>
            Monitoreo de Red
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Vigila servicios y equipos; los tickets se generan automáticamente ante caídas.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-emerald-500/25 active:scale-95"
        >
          <Plus className="w-4 h-4" /> Nuevo objetivo
        </button>
      </div>

      {/* Lista */}
      {loading && targets.length === 0 ? (
        <div className="flex items-center justify-center py-20 gap-3 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" /> <span className="font-medium text-sm">Cargando objetivos...</span>
        </div>
      ) : targets.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
          <Network className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="font-bold text-slate-500 dark:text-slate-400">No hay objetivos en monitoreo</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Agrega un servidor, sitio web o equipo para comenzar la vigilancia.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {pagedTargets.map((target, idx) => {
            const status = statusConfig(target);
            return (
              <div
                key={target.id}
                style={{ animationDelay: `${Math.min(idx * 60, 300)}ms` }}
                className="anim-fade-in-up bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${status.bg} ${status.text}`}>
                      {target.tipo === 'HTTP' ? <Globe className="w-5 h-5" /> : <Network className="w-5 h-5" />}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-extrabold text-slate-900 dark:text-white text-sm truncate">{target.nombre}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {target.tipo === 'TCP' ? `${target.host}:${target.puerto}` : target.host}
                      </p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black shrink-0 ${status.bg} ${status.text}`}>
                    <span className={`w-2 h-2 rounded-full ${status.dot}`} />
                    {status.label}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center mb-3">
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl py-2">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Latencia</p>
                    <p className="text-xs font-extrabold text-slate-700 dark:text-slate-200 mt-0.5">
                      {target.ultimaLatenciaMs != null ? `${target.ultimaLatenciaMs} ms` : '—'}
                    </p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl py-2">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Intervalo</p>
                    <p className="text-xs font-extrabold text-slate-700 dark:text-slate-200 mt-0.5">{target.intervaloSegundos}s</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl py-2">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Umbral</p>
                    <p className="text-xs font-extrabold text-slate-700 dark:text-slate-200 mt-0.5">{target.fallosConsecutivos}/{target.umbralFallos}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 min-w-0">
                    <Clock className="w-3 h-3 shrink-0" />
                    <span className="truncate">
                      {target.ultimoChequeo
                        ? new Date(target.ultimoChequeo).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                        : 'Sin verificaciones'}
                    </span>
                    {target.ticketAbiertoId && (
                      <button
                        onClick={() => navigate(`/tickets/${target.ticketAbiertoId}`)}
                        className="inline-flex items-center gap-1 ml-2 px-2 py-0.5 rounded-full bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 font-bold hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors shrink-0"
                      >
                        <Link2 className="w-3 h-3" /> Ticket auto
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleCheckNow(target)}
                      disabled={checkingId === target.id}
                      className="p-2 text-cyan-600 bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-500/10 dark:hover:bg-cyan-500/20 disabled:opacity-50 rounded-lg transition-colors"
                      title="Verificar ahora"
                    >
                      {checkingId === target.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                    </button>
                    <button onClick={() => openEdit(target)} className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 rounded-lg transition-colors" title="Editar">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(target)} className="p-2 text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 rounded-lg transition-colors" title="Eliminar">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {target.ultimoEstado === 'DOWN' && (
                  <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-500/10 border border-red-200/60 dark:border-red-500/20 rounded-xl text-[11px] font-semibold text-red-600 dark:text-red-400">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    {target.ticketAbiertoId
                      ? 'Caída detectada: ya existe un ticket automático para este objetivo.'
                      : `Acumulando fallos (${target.fallosConsecutivos}/${target.umbralFallos}) antes de generar ticket.`}
                  </div>
                )}
                {target.ultimoEstado === 'UP' && !target.ticketAbiertoId && (
                  <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/60 dark:border-emerald-500/20 rounded-xl text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    Servicio operando con normalidad.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!loading && targets.length > 0 && (
        <Pagination
          page={page}
          pageSize={pageSize}
          total={totalTargets}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          label="objetivos"
        />
      )}

      {/* Modal editor */}
      <FormModal
        isOpen={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={editingId ? 'Editar objetivo' : 'Nuevo objetivo de monitoreo'}
        subtitle="Vigila la disponibilidad de un servicio"
        icon={<Activity className="w-5 h-5" />}
        theme="monitoring"
        onSubmit={handleSave}
        submitLabel={editingId ? 'Guardar cambios' : 'Agregar objetivo'}
        loading={saving}
        maxWidth="max-w-lg"
      >
        <SectionTitle>Configuración del objetivo</SectionTitle>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Nombre *</label>
                <input type="text" required maxLength={120} value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Ej. Servidor de archivos / Router principal"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/50 transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Tipo *</label>
                  <select value={form.tipo}
                    onChange={(e) => setForm({ ...form, tipo: e.target.value as TargetType })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all">
                    <option value="HTTP">HTTP (sitio web / API)</option>
                    <option value="TCP">TCP (puerto / servicio)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Puerto {form.tipo === 'TCP' ? '*' : '(solo TCP)'}
                  </label>
                  <input type="number" min={1} max={65535} value={form.puerto} required={form.tipo === 'TCP'}
                    onChange={(e) => setForm({ ...form, puerto: e.target.value })}
                    placeholder="Ej. 443"
                    disabled={form.tipo !== 'TCP'}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all disabled:opacity-50" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  {form.tipo === 'HTTP' ? 'URL completa *' : 'Host o IP *'}
                </label>
                <input type="text" required maxLength={500} value={form.host}
                  onChange={(e) => setForm({ ...form, host: e.target.value })}
                  placeholder={form.tipo === 'HTTP' ? 'http://192.168.1.10/health' : '192.168.1.1'}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/50 transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Intervalo (segundos)</label>
                  <input type="number" min={30} value={form.intervaloSegundos}
                    onChange={(e) => setForm({ ...form, intervaloSegundos: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Fallos para abrir ticket</label>
                  <input type="number" min={1} value={form.umbralFallos}
                    onChange={(e) => setForm({ ...form, umbralFallos: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all" />
                </div>
              </div>
              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={form.activo}
                  onChange={(e) => setForm({ ...form, activo: e.target.checked })}
                  className="w-4 h-4 accent-emerald-600" />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Monitoreo activo</span>
              </label>
              <p className="text-[11px] text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl p-3">
                Cuando el objetivo acumule <strong>{form.umbralFallos}</strong> fallos consecutivos se generará un
                ticket automático de prioridad CRÍTICA y se notificará por correo a los administradores.
                Solo se abre un ticket por caída; al recuperarse, se registra en el historial del ticket.
              </p>
      </FormModal>

      <ConfirmDialog
        isOpen={!!dialog}
        variant={dialog?.variant || 'info'}
        title={dialog?.title || ''}
        message={dialog?.message || ''}
        confirmText={dialog?.confirmText}
        onConfirm={dialog?.action ? runDialogAction : undefined}
        onClose={() => setDialog(null)}
      />
    </div>
  );
}
