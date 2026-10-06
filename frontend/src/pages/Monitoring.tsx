import React, { useState, useEffect } from 'react';
import {
  Activity, Plus, Loader2, Pencil, Trash2, Zap, Globe, Network,
  AlertTriangle, Clock, Link2, Wifi, WifiOff, Server, Search,
  RefreshCw, Gauge
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import { useNavigate } from 'react-router-dom';
import FormModal, { SectionTitle } from '../components/ui/FormModal';
import { useMonitoringStore, type MonitoredTarget, type MonitoredTargetRequest, type TargetType } from '../store/monitoringStore';
import { useAuthStore } from '../store/authStore';
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
  const { targets, loading, fetchTargets, createTarget, updateTarget, deleteTarget, checkNow, connectRealtime, disconnectRealtime, realtimeConnected } = useMonitoringStore();
  const { token } = useAuthStore();
  const toast = useToast();
  const navigate = useNavigate();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<TargetForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [checkingId, setCheckingId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [q, setQ] = useState('');
  const [filtro, setFiltro] = useState('');
  const [dialog, setDialog] = useState<{
    variant: DialogVariant;
    title: string;
    message: string;
    confirmText?: string;
    action?: () => Promise<void>;
    successTitle?: string;
  } | null>(null);

  const filtered = targets.filter((t) => {
    const matchesQ = !q || `${t.nombre} ${t.host}`.toLowerCase().includes(q.toLowerCase());
    const matchesF = !filtro || (filtro === 'PAUSADO' ? !t.activo : t.activo && t.ultimoEstado === filtro);
    return matchesQ && matchesF;
  });
  const counts = {
    total: targets.length,
    up: targets.filter((t) => t.activo && t.ultimoEstado === 'UP').length,
    down: targets.filter((t) => t.activo && t.ultimoEstado === 'DOWN').length,
    pending: targets.filter((t) => t.activo && t.ultimoEstado === 'PENDING').length,
  };
  const { page, setPage, pageSize, setPageSize, paged: pagedTargets, total: totalTargets } = usePagedList(filtered, 10);

  useEffect(() => {
    fetchTargets();
    // El estado llega por WebSocket en tiempo real; el polling es solo respaldo.
    const interval = setInterval(() => fetchTargets(), 30000);
    return () => clearInterval(interval);
  }, [fetchTargets]);

  useEffect(() => {
    if (token) connectRealtime(token);
    return () => disconnectRealtime();
  }, [token, connectRealtime, disconnectRealtime]);

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

  const handleRefreshAll = async () => {
    setRefreshing(true);
    try { await fetchTargets(); } finally { setRefreshing(false); }
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
      <PageHeader
        icon={Activity}
        eyebrow="Monitoreo de Red"
        title="Estado de la Red"
        subtitle="Vigila servicios y equipos; los tickets se generan automáticamente ante caídas."
        gradient="from-emerald-600 via-teal-600 to-slate-800"
      >
        <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white/15 text-white border border-white/20 backdrop-blur-sm">
          <span className={`w-2 h-2 rounded-full ${realtimeConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`} />
          {realtimeConnected ? 'Tiempo real' : 'Conectando…'}
        </span>
        <button
          onClick={openCreate}
          className="btn-shine inline-flex items-center gap-2 px-5 py-2.5 bg-white text-teal-700 hover:bg-teal-50 rounded-xl text-sm font-black transition-all shadow-lg shadow-teal-900/30 active:scale-95 hover:-translate-y-0.5"
        >
          <Plus className="w-4 h-4" /> Nuevo objetivo
        </button>
      </PageHeader>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Objetivos', value: counts.total, icon: Server, cls: 'from-slate-500 to-slate-700', bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-300' },
          { label: 'En línea', value: counts.up, icon: Wifi, cls: 'from-emerald-500 to-teal-600', bg: 'bg-emerald-100 dark:bg-emerald-500/15', text: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Caídos', value: counts.down, icon: WifiOff, cls: 'from-red-500 to-rose-600', bg: 'bg-red-100 dark:bg-red-500/15', text: 'text-red-600 dark:text-red-400', alert: counts.down > 0 },
          { label: 'Pendientes', value: counts.pending, icon: Clock, cls: 'from-amber-500 to-orange-600', bg: 'bg-amber-100 dark:bg-amber-500/15', text: 'text-amber-600 dark:text-amber-400' },
        ].map((k, i) => (
          <div key={k.label} className="group relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 anim-fade-in-up" style={{ animationDelay: `${i * 60}ms` }}>
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${k.cls}`} />
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{k.label}</p>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${k.bg} transition-transform group-hover:scale-110 ${k.alert ? 'animate-pulse' : ''}`}>
                <k.icon className={`w-[18px] h-[18px] ${k.text}`} />
              </div>
            </div>
            <p className="text-3xl font-black text-slate-800 dark:text-white tabular-nums leading-none">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar: búsqueda + filtro + actualizar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-sm flex flex-col sm:flex-row gap-3 anim-fade-in-up">
        <div className="relative flex-1 group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-teal-500 transition-colors" />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
            placeholder="Buscar objetivo o host..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/40 transition-all"
          />
        </div>
        <div className="inline-flex bg-slate-100 dark:bg-slate-800/70 rounded-xl p-1 gap-1 overflow-x-auto">
          {[
            { value: '', label: 'Todos' },
            { value: 'UP', label: 'En línea' },
            { value: 'DOWN', label: 'Caídos' },
            { value: 'PENDING', label: 'Pendientes' },
            { value: 'PAUSADO', label: 'Pausados' },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => { setFiltro(f.value); setPage(1); }}
              className={`px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all duration-300 active:scale-95 ${
                filtro === f.value
                  ? 'bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-md shadow-teal-500/30'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          onClick={handleRefreshAll}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 text-white text-sm font-bold shadow-md shadow-teal-500/25 hover:-translate-y-0.5 active:scale-95 transition-all disabled:opacity-60 shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Actualizar
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
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
          <Search className="w-9 h-9 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="font-bold text-slate-500 dark:text-slate-400">Sin resultados</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Ajusta la búsqueda o el filtro de estado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {pagedTargets.map((target, idx) => {
            const status = statusConfig(target);
            const latPct = target.ultimaLatenciaMs != null ? Math.min(100, Math.round((target.ultimaLatenciaMs / 500) * 100)) : 0;
            const failPct = target.umbralFallos ? Math.min(100, Math.round((target.fallosConsecutivos / target.umbralFallos) * 100)) : 0;
            const isDown = target.activo && target.ultimoEstado === 'DOWN';
            const accent = isDown ? 'bg-red-500' : target.activo && target.ultimoEstado === 'UP' ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600';
            return (
              <div
                key={target.id}
                style={{ animationDelay: `${Math.min(idx * 60, 300)}ms` }}
                className={`anim-fade-in-up group relative overflow-hidden bg-white dark:bg-slate-900 border rounded-2xl p-5 pl-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ${isDown ? 'border-red-300/70 dark:border-red-500/30' : 'border-slate-200 dark:border-slate-800'}`}
              >
                <span className={`absolute left-0 top-0 bottom-0 w-1.5 ${accent}`} />
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`relative w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${status.bg} ${status.text} transition-transform group-hover:scale-110`}>
                      {target.tipo === 'HTTP' ? <Globe className="w-5 h-5" /> : <Network className="w-5 h-5" />}
                      {target.activo && (target.ultimoEstado === 'UP' || target.ultimoEstado === 'DOWN') && (
                        <span className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${target.ultimoEstado === 'UP' ? 'bg-emerald-500' : 'bg-red-500'} ${isDown ? 'animate-ping' : ''}`} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-extrabold text-slate-900 dark:text-white text-sm truncate">{target.nombre}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate font-mono">
                        {target.tipo === 'TCP' ? `${target.host}:${target.puerto}` : target.host}
                      </p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black shrink-0 ${status.bg} ${status.text}`}>
                    <span className={`w-2 h-2 rounded-full ${status.dot}`} />
                    {status.label}
                  </span>
                </div>

                <div className="space-y-2.5 mb-3">
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 mb-1">
                      <span className="inline-flex items-center gap-1"><Gauge className="w-3 h-3" /> Latencia</span>
                      <span className="tabular-nums text-slate-600 dark:text-slate-300">{target.ultimaLatenciaMs != null ? `${target.ultimaLatenciaMs} ms` : '—'}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-[width] duration-700 ${
                          target.ultimaLatenciaMs == null ? '' : target.ultimaLatenciaMs < 200 ? 'bg-gradient-to-r from-emerald-400 to-teal-500' : target.ultimaLatenciaMs < 500 ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 'bg-gradient-to-r from-red-400 to-rose-500'
                        }`}
                        style={{ width: `${latPct}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 mb-1">
                      <span className="inline-flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Fallos</span>
                      <span className="tabular-nums text-slate-600 dark:text-slate-300">{target.fallosConsecutivos}/{target.umbralFallos}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-[width] duration-700 ${failPct >= 100 ? 'bg-gradient-to-r from-red-500 to-rose-600' : 'bg-gradient-to-r from-amber-400 to-orange-500'}`} style={{ width: `${failPct}%` }} />
                    </div>
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
                      className="p-2 text-cyan-600 bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-500/10 dark:hover:bg-cyan-500/20 disabled:opacity-50 rounded-lg transition-colors active:scale-90"
                      title="Verificar ahora"
                    >
                      {checkingId === target.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                    </button>
                    <button onClick={() => openEdit(target)} className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 rounded-lg transition-colors active:scale-90" title="Editar">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(target)} className="p-2 text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 rounded-lg transition-colors active:scale-90" title="Eliminar">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && filtered.length > 0 && (
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
