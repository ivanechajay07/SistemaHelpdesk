import React, { useState, useEffect } from 'react';
import { Building2, MapPin, Plus, Search, Loader2, Edit2, Trash2, Save, X, AlignLeft } from 'lucide-react';
import { useCatalogStore, type Sede } from '../store/catalogStore';
import ConfirmDialog, { type DialogVariant } from '../components/ui/ConfirmDialog';
import Pagination from '../components/ui/Pagination';
import { usePagedList } from '../lib/hooks';
import { useToast } from '../components/ui/Toast';

export default function Entidades() {
  const { sedes, loading, error, fetchSedes, createSede, updateSede, deleteSede } = useCatalogStore();
  const toast = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [editingSede, setEditingSede] = useState<Sede | null>(null);
  const [formData, setFormData] = useState({ entidad: '', nombre: '', descripcion: '' });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [dialog, setDialog] = useState<{
    variant: DialogVariant;
    title: string;
    message: string;
    confirmText?: string;
    action?: () => Promise<void>;
    successTitle?: string;
    successMessage?: string;
  } | null>(null);

  useEffect(() => {
    fetchSedes();
  }, [fetchSedes]);

  useEffect(() => {
    if (editingSede) {
      setFormData({
        entidad: editingSede.entidadNombre,
        nombre: editingSede.nombre,
        descripcion: editingSede.descripcion || '',
      });
      setFieldErrors({});
    }
  }, [editingSede]);

  const entidadesExistentes = Array.from(new Set(sedes.map((s) => s.entidadNombre)));

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.entidad.trim()) errors.entidad = 'La entidad es requerida';
    else if (formData.entidad.trim().length > 150) errors.entidad = 'Máximo 150 caracteres';
    if (!formData.nombre.trim()) errors.nombre = 'La sede es requerida';
    else if (formData.nombre.trim().length > 150) errors.nombre = 'Máximo 150 caracteres';
    if (formData.descripcion.trim().length > 500) errors.descripcion = 'Máximo 500 caracteres';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const resetForm = () => {
    setEditingSede(null);
    setFormData({ entidad: '', nombre: '', descripcion: '' });
    setFieldErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload = {
        entidadNombre: formData.entidad.trim(),
        nombre: formData.nombre.trim(),
        descripcion: formData.descripcion.trim(),
      };
      if (editingSede) {
        await updateSede(editingSede.id, payload);
        toast({ variant: 'success', title: 'Sede actualizada', message: `"${payload.nombre}" se actualizó correctamente.` });
      } else {
        await createSede(payload);
        toast({ variant: 'success', title: 'Registro exitoso', message: `La sede "${payload.nombre}" fue registrada bajo la entidad "${payload.entidadNombre}".` });
      }
      resetForm();
    } catch (err: any) {
      toast({
        variant: 'error',
        title: editingSede ? 'Error al actualizar' : 'Error al registrar',
        message: err.response?.data?.message || 'No se pudo completar la operación.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const runDialogAction = async () => {
    const action = dialog?.action;
    const successTitle = dialog?.successTitle;
    const successMessage = dialog?.successMessage;
    setDialog(null);
    if (!action) return;
    try {
      await action();
      if (successTitle) toast({ variant: 'success', title: successTitle, message: successMessage });
    } catch (err) {
      console.error(err);
      setDialog({
        variant: 'error',
        title: 'Error en la operación',
        message: 'No se pudo completar la acción. Inténtalo nuevamente.',
      });
    }
  };

  const handleDelete = (sede: Sede) => {
    setDialog({
      variant: 'danger',
      title: 'Eliminar sede',
      message: `Se eliminará la sede "${sede.nombre}" de la entidad "${sede.entidadNombre}". Esta acción es permanente. ¿Deseas continuar?`,
      confirmText: 'Sí, eliminar',
      action: async () => { await deleteSede(sede.id); },
      successTitle: 'Sede eliminada',
      successMessage: 'La sede fue eliminada del catálogo.',
    });
  };

  const filteredSedes = sedes.filter((s) =>
    s.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.entidadNombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.descripcion?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const { page, setPage, pageSize, setPageSize, paged: pagedSedes, total: totalSedes } = usePagedList(filteredSedes, 10);

  const inputCls = (field: string) =>
    `w-full px-4 py-2.5 border rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 transition-all placeholder:text-slate-400 ${
      fieldErrors[field] ? 'border-red-500' : 'border-slate-200 dark:border-slate-700 focus:border-orange-500'
    }`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] font-extrabold text-slate-900 dark:text-white tracking-tight">Entidades y Sedes</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Registra las entidades y sedes donde se reportan los inconvenientes.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-6 items-start">

        {/* ===== Formulario de registro ===== */}
        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-5 space-y-4 anim-fade-in-up"
        >
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/30">
              {editingSede ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white leading-tight">
                {editingSede ? 'Editar Sede' : 'Registrar Ubicación'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Entidad, sede y descripción</p>
            </div>
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              <Building2 className="w-3.5 h-3.5" /> Entidad *
            </label>
            <input
              type="text"
              list="entidades-list"
              placeholder="Ej. Municipalidad, Hospital Central..."
              className={inputCls('entidad')}
              value={formData.entidad}
              onChange={(e) => setFormData((prev) => ({ ...prev, entidad: e.target.value }))}
            />
            <datalist id="entidades-list">
              {entidadesExistentes.map((ent) => (
                <option key={ent} value={ent} />
              ))}
            </datalist>
            {fieldErrors.entidad && <p className="text-red-500 text-xs mt-1">{fieldErrors.entidad}</p>}
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              <MapPin className="w-3.5 h-3.5" /> Sede *
            </label>
            <input
              type="text"
              placeholder="Ej. Sede Central, Local Norte..."
              className={inputCls('nombre')}
              value={formData.nombre}
              onChange={(e) => setFormData((prev) => ({ ...prev, nombre: e.target.value }))}
            />
            {fieldErrors.nombre && <p className="text-red-500 text-xs mt-1">{fieldErrors.nombre}</p>}
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              <AlignLeft className="w-3.5 h-3.5" /> Descripción
            </label>
            <textarea
              rows={3}
              placeholder="Detalles adicionales de la ubicación (dirección, referencia...)"
              className={`${inputCls('descripcion')} resize-none`}
              value={formData.descripcion}
              onChange={(e) => setFormData((prev) => ({ ...prev, descripcion: e.target.value }))}
            />
            {fieldErrors.descripcion && <p className="text-red-500 text-xs mt-1">{fieldErrors.descripcion}</p>}
          </div>

          <div className="flex gap-2 pt-1">
            {editingSede && (
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors active:scale-95 flex items-center gap-1.5"
              >
                <X className="w-4 h-4" /> Cancelar
              </button>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="btn-shine flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-orange-500/25 active:scale-95"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {submitting ? 'Guardando...' : editingSede ? 'Guardar Cambios' : 'Registrar'}
            </button>
          </div>
        </form>

        {/* ===== Listado de sedes ===== */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden anim-fade-in-up" style={{ animationDelay: '80ms' }}>
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white">Sedes Registradas</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{sedes.length} sede{sedes.length !== 1 ? 's' : ''} en total</p>
            </div>
            <div className="relative w-full sm:w-[280px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar sede o entidad..."
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all placeholder:text-slate-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="m-5 p-4 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Tabla desktop */}
          <div className="hidden md:block overflow-x-auto relative">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm z-10">
                <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
              </div>
            )}
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50/50 dark:bg-slate-800/20 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4 font-semibold text-[13px] tracking-wide">Entidad</th>
                  <th className="px-6 py-4 font-semibold text-[13px] tracking-wide">Sede</th>
                  <th className="px-6 py-4 font-semibold text-[13px] tracking-wide">Descripción</th>
                  <th className="px-6 py-4 font-semibold text-[13px] tracking-wide text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredSedes.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500 font-medium">
                      <Building2 className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                      No hay sedes registradas todavía.
                    </td>
                  </tr>
                ) : (
                  pagedSedes.map((sede) => (
                    <tr key={sede.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors group">
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                          <span className="w-7 h-7 rounded-lg bg-violet-100 dark:bg-violet-500/15 flex items-center justify-center shrink-0">
                            <Building2 className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                          </span>
                          {sede.entidadNombre}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">{sede.nombre}</td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400 max-w-[280px] truncate" title={sede.descripcion || ''}>
                        {sede.descripcion || <span className="italic text-slate-400">Sin descripción</span>}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setEditingSede(sede)}
                            className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(sede)}
                            className="p-2 text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Tarjetas móvil */}
          <div className="md:hidden flex flex-col gap-3 p-4">
            {loading ? (
              <div className="p-4 text-center text-slate-500 font-medium">Cargando...</div>
            ) : filteredSedes.length === 0 ? (
              <div className="p-4 text-center text-slate-500 font-medium">No hay sedes registradas.</div>
            ) : (
              pagedSedes.map((sede) => (
                <div key={sede.id} className="border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-violet-600 dark:text-violet-400">
                        <Building2 className="w-3 h-3" /> {sede.entidadNombre}
                      </span>
                      <h3 className="font-bold text-slate-900 dark:text-white text-base mt-0.5">{sede.nombre}</h3>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => setEditingSede(sede)} className="p-2 text-blue-600 bg-blue-50 dark:bg-blue-500/10 rounded-lg">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(sede)} className="p-2 text-red-600 bg-red-50 dark:bg-red-500/10 rounded-lg">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {sede.descripcion && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{sede.descripcion}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {!loading && filteredSedes.length > 0 && (
        <Pagination
          page={page}
          pageSize={pageSize}
          total={totalSedes}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          label="sedes"
        />
      )}

      <ConfirmDialog
        isOpen={!!dialog}
        variant={dialog?.variant || 'info'}
        title={dialog?.title || ''}
        message={dialog?.message || ''}
        confirmText={dialog?.confirmText}
        onConfirm={runDialogAction}
        onClose={() => setDialog(null)}
      />
    </div>
  );
}
