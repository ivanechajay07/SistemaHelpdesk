import React, { useState, useEffect } from 'react';
import { Building2, MapPin, Plus, Search, Loader2, Edit2, Trash2, AlignLeft } from 'lucide-react';
import { useCatalogStore, type Entidad } from '../store/catalogStore';
import SearchableSelect from '../components/ui/SearchableSelect';
import FormModal, { SectionTitle } from '../components/ui/FormModal';
import ConfirmDialog, { type DialogVariant } from '../components/ui/ConfirmDialog';
import Pagination from '../components/ui/Pagination';
import { usePagedList } from '../lib/hooks';
import { useToast } from '../components/ui/Toast';

const NUEVA_ENTIDAD = '__nueva__';

interface SedeRow {
  nombre: string;
  descripcion: string;
}

const emptySedeRow = (): SedeRow => ({ nombre: '', descripcion: '' });

export default function Entidades() {
  const { entidades, loading, error, fetchEntidades, createEntidad, updateEntidad, deleteEntidad } = useCatalogStore();
  const toast = useToast();
  const [searchTerm, setSearchTerm] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Entidad | null>(null);
  const [pickValue, setPickValue] = useState('');
  const [nombre, setNombre] = useState('');
  const [sedes, setSedes] = useState<SedeRow[]>([emptySedeRow()]);
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
    fetchEntidades();
  }, [fetchEntidades]);

  const resetForm = () => {
    setEditing(null);
    setPickValue('');
    setNombre('');
    setSedes([emptySedeRow()]);
    setFieldErrors({});
  };

  const openCreate = () => {
    resetForm();
    setFormOpen(true);
  };

  const startEdit = (entidad: Entidad) => {
    setEditing(entidad);
    setPickValue(String(entidad.id));
    setNombre(entidad.nombre);
    setSedes(
      entidad.sedes.length
        ? entidad.sedes.map((s) => ({ nombre: s.nombre, descripcion: s.descripcion || '' }))
        : [emptySedeRow()]
    );
    setFieldErrors({});
    setFormOpen(true);
  };

  const handlePick = (value: string) => {
    setPickValue(value);
    setFieldErrors({});
    if (value === NUEVA_ENTIDAD) {
      setEditing(null);
      setNombre('');
      setSedes([emptySedeRow()]);
      return;
    }
    const found = entidades.find((e) => String(e.id) === value);
    if (found) startEdit(found);
  };

  const updateSedeRow = (index: number, field: 'nombre' | 'descripcion', value: string) => {
    setSedes((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
    const key = field === 'nombre' ? `sede_${index}` : `sede_desc_${index}`;
    if (fieldErrors[key]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const addSedeRow = () => setSedes((prev) => [...prev, emptySedeRow()]);

  const removeSedeRow = (index: number) => {
    setSedes((prev) => prev.filter((_, i) => i !== index));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[`sede_${index}`];
      delete next[`sede_desc_${index}`];
      return next;
    });
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    const name = nombre.trim();
    if (!name) errors.nombre = 'El nombre de la entidad es requerido';
    else if (name.length > 150) errors.nombre = 'Máximo 150 caracteres';

    const cleanSedes = sedes.map((s) => ({ nombre: s.nombre.trim(), descripcion: s.descripcion.trim() }));
    const seen = new Set<string>();
    cleanSedes.forEach((s, i) => {
      if (!s.nombre) {
        errors[`sede_${i}`] = 'El nombre de la sede es requerido';
      } else if (s.nombre.length > 150) {
        errors[`sede_${i}`] = 'Máximo 150 caracteres';
      } else {
        const key = s.nombre.toLowerCase();
        if (seen.has(key)) errors[`sede_${i}`] = 'Nombre de sede duplicado';
        seen.add(key);
      }
      if (s.descripcion.length > 500) errors[`sede_desc_${i}`] = 'Máximo 500 caracteres';
    });
    if (cleanSedes.length === 0) errors.sedes = 'Agrega al menos una sede';

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    const payload = {
      nombre: nombre.trim(),
      sedes: sedes.map((s) => ({ nombre: s.nombre.trim(), descripcion: s.descripcion.trim() })),
    };
    try {
      if (editing) {
        await updateEntidad(editing.id, payload);
        toast({ variant: 'success', title: 'Entidad actualizada', message: `"${payload.nombre}" y sus sedes se actualizaron correctamente.` });
      } else {
        await createEntidad(payload);
        toast({
          variant: 'success',
          title: 'Entidad registrada',
          message: `"${payload.nombre}" se registró con ${payload.sedes.length} sede${payload.sedes.length !== 1 ? 's' : ''}.`,
        });
      }
      resetForm();
      setFormOpen(false);
    } catch (err: any) {
      toast({
        variant: 'error',
        title: editing ? 'Error al actualizar' : 'Error al registrar',
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
    } catch (err: any) {
      console.error(err);
      setDialog({
        variant: 'error',
        title: 'Error en la operación',
        message: err.response?.data?.message || 'No se pudo completar la acción. Inténtalo nuevamente.',
      });
    }
  };

  const handleDelete = (entidad: Entidad) => {
    setDialog({
      variant: 'danger',
      title: 'Eliminar entidad',
      message: `Se eliminará "${entidad.nombre}" y sus ${entidad.sedes.length} sede${entidad.sedes.length !== 1 ? 's' : ''}. Esta acción es permanente. ¿Deseas continuar?`,
      confirmText: 'Sí, eliminar',
      action: async () => { await deleteEntidad(entidad.id); },
      successTitle: 'Entidad eliminada',
      successMessage: `"${entidad.nombre}" fue eliminada del catálogo.`,
    });
  };

  const filteredEntidades = entidades.filter((e) => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    return (
      e.nombre.toLowerCase().includes(q) ||
      e.sedes.some(
        (s) =>
          s.nombre.toLowerCase().includes(q) ||
          (s.descripcion || '').toLowerCase().includes(q)
      )
    );
  });
  const { page, setPage, pageSize, setPageSize, paged: pagedEntidades, total: totalEntidades } = usePagedList(filteredEntidades, 8);

  const inputCls = (field: string) =>
    `w-full px-4 py-2.5 border rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 transition-all placeholder:text-slate-400 ${
      fieldErrors[field] ? 'border-red-500' : 'border-slate-200 dark:border-slate-700 focus:border-orange-500'
    }`;

  const entidadOptions = [
    ...entidades.map((e) => ({ value: String(e.id), label: e.nombre })),
    { value: NUEVA_ENTIDAD, label: '➕ Registrar nueva entidad...' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-extrabold text-slate-900 dark:text-white tracking-tight">Entidades y Sedes</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Registra cada entidad con una o varias sedes donde se reportan los inconvenientes.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-orange-500/25 active:scale-95 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Registrar Entidad
        </button>
      </div>

      <FormModal
        isOpen={formOpen}
        onClose={() => { setFormOpen(false); resetForm(); }}
        title={editing ? 'Editar Entidad' : 'Registrar Entidad'}
        subtitle="Entidad y sus sedes"
        icon={<Building2 className="w-5 h-5" />}
        theme="categories"
        onSubmit={handleSubmit}
        submitLabel={editing ? 'Guardar Cambios' : 'Registrar Entidad'}
        loading={submitting}
        maxWidth="max-w-lg"
      >
        <SectionTitle>Datos de la entidad</SectionTitle>
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              <Building2 className="w-3.5 h-3.5" /> Entidad *
            </label>
            {editing ? (
              <input
                type="text"
                placeholder="Nombre de la entidad"
                className={inputCls('nombre')}
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            ) : (
              <SearchableSelect
                options={entidadOptions}
                value={pickValue}
                onChange={handlePick}
                placeholder={pickValue === NUEVA_ENTIDAD ? 'Escribe el nombre...' : 'Buscar o seleccionar entidad...'}
                searchPlaceholder="Buscar entidad..."
                invalid={!!fieldErrors.nombre}
                icon={<Building2 className="w-4 h-4" />}
              />
            )}
            {!editing && pickValue === NUEVA_ENTIDAD && (
              <input
                type="text"
                placeholder="Ej. Municipalidad, Hospital Central..."
                className={`${inputCls('nombre')} mt-2`}
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            )}
            {fieldErrors.nombre && <p className="text-red-500 text-xs mt-1">{fieldErrors.nombre}</p>}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <MapPin className="w-3.5 h-3.5" /> Sedes *
              </label>
              <button
                type="button"
                onClick={addSedeRow}
                className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Agregar sede
              </button>
            </div>

            <div className="space-y-2.5">
              {sedes.map((row, i) => (
                <div key={i} className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 space-y-2">
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder={`Nombre de la sede ${sedes.length > 1 ? i + 1 : ''}`}
                      className={`w-full pl-9 pr-3 py-2.5 border rounded-lg bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 transition-all placeholder:text-slate-400 ${
                        fieldErrors[`sede_${i}`] ? 'border-red-500' : 'border-slate-200 dark:border-slate-700 focus:border-orange-500'
                      }`}
                      value={row.nombre}
                      onChange={(e) => updateSedeRow(i, 'nombre', e.target.value)}
                    />
                    {fieldErrors[`sede_${i}`] && (
                      <p className="text-red-500 text-xs mt-1">{fieldErrors[`sede_${i}`]}</p>
                    )}
                  </div>
                  <div className="flex items-end gap-2">
                    <div className="flex-1 relative">
                      <AlignLeft className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Descripción (dirección, referencia...)"
                        className={`w-full pl-9 pr-3 py-2.5 border rounded-lg bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 transition-all placeholder:text-slate-400 ${
                          fieldErrors[`sede_desc_${i}`] ? 'border-red-500' : 'border-slate-200 dark:border-slate-700 focus:border-orange-500'
                        }`}
                        value={row.descripcion}
                        onChange={(e) => updateSedeRow(i, 'descripcion', e.target.value)}
                      />
                      {fieldErrors[`sede_desc_${i}`] && (
                        <p className="text-red-500 text-xs mt-1">{fieldErrors[`sede_desc_${i}`]}</p>
                      )}
                    </div>
                    {sedes.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSedeRow(i)}
                        className="p-2.5 text-red-500 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 rounded-lg transition-colors"
                        title="Quitar sede"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {fieldErrors.sedes && <p className="text-red-500 text-xs">{fieldErrors.sedes}</p>}
            </div>
          </div>

      </FormModal>

        {/* ===== Listado de entidades ===== */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden anim-fade-in-up" style={{ animationDelay: '80ms' }}>
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white">Entidades Registradas</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {entidades.length} entidad{entidades.length !== 1 ? 'es' : ''} · {entidades.reduce((acc, e) => acc + e.sedes.length, 0)} sedes
              </p>
            </div>
            <div className="relative w-full sm:w-[280px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar entidad o sede..."
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

          <div className="relative">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm z-10">
                <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
              </div>
            )}
            <div className="flex flex-col gap-4 p-5">
              {!loading && filteredEntidades.length === 0 ? (
                <div className="py-12 text-center text-slate-500 font-medium">
                  <Building2 className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                  {entidades.length === 0 ? 'No hay entidades registradas todavía.' : 'No se encontraron coincidencias.'}
                </div>
              ) : (
                pagedEntidades.map((entidad) => (
                  <div
                    key={entidad.id}
                    className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm group"
                  >
                    <div className="flex items-center justify-between gap-3 px-4 py-3 bg-gradient-to-r from-violet-50 to-transparent dark:from-violet-500/10 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-500/15 flex items-center justify-center shrink-0">
                          <Building2 className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                        </span>
                        <div className="min-w-0">
                          <h3 className="font-bold text-slate-900 dark:text-white truncate">{entidad.nombre}</h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {entidad.sedes.length} sede{entidad.sedes.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => startEdit(entidad)}
                          className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 rounded-lg transition-colors"
                          title="Editar entidad"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(entidad)}
                          className="p-2 text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 rounded-lg transition-colors"
                          title="Eliminar entidad"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {entidad.sedes.length === 0 ? (
                      <p className="px-4 py-3 text-sm italic text-slate-400">Sin sedes registradas.</p>
                    ) : (
                      <ul className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {entidad.sedes.map((sede) => (
                          <li key={sede.id} className="flex items-start gap-3 px-4 py-2.5">
                            <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">{sede.nombre}</p>
                              {sede.descripcion && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{sede.descripcion}</p>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      {!loading && filteredEntidades.length > 0 && (
        <Pagination
          page={page}
          pageSize={pageSize}
          total={totalEntidades}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          label="entidades"
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