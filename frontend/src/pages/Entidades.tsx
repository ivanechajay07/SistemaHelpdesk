import React, { useState, useEffect } from 'react';
import { Building2, MapPin, Plus, Search, Loader2, Edit2, Trash2, AlignLeft, Map, ChevronDown, ExternalLink } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
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
  const [expandedId, setExpandedId] = useState<number | null>(null);
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
      <PageHeader
        icon={Building2}
        eyebrow="Catálogo"
        title="Entidades y Sedes"
        subtitle="Registra cada entidad con una o varias sedes donde se reportan los inconvenientes."
        gradient="from-orange-500 via-amber-600 to-slate-800"
      >
        <button
          onClick={openCreate}
          className="btn-shine inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white text-orange-700 hover:bg-orange-50 rounded-xl text-sm font-black transition-all shadow-lg shadow-orange-900/30 active:scale-95 hover:-translate-y-0.5"
        >
          <Plus className="w-4 h-4" /> Registrar Entidad
        </button>
      </PageHeader>

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
                    <button
                      type="button"
                      onClick={() => {
                        const q = [row.descripcion, nombre].filter((x) => x && x.trim()).join(', ');
                        if (q) window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`, '_blank', 'noopener');
                      }}
                      disabled={!row.descripcion.trim()}
                      className="p-2.5 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Ver ubicación en el mapa"
                    >
                      <Map className="w-4 h-4" />
                    </button>
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
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 p-5">
              {!loading && filteredEntidades.length === 0 ? (
                <div className="col-span-full py-12 text-center text-slate-500 font-medium">
                  <Building2 className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                  {entidades.length === 0 ? 'No hay entidades registradas todavía.' : 'No se encontraron coincidencias.'}
                </div>
              ) : (
                pagedEntidades.map((entidad) => {
                  const expanded = expandedId === entidad.id;
                  const firstAddr = entidad.sedes.find((s) => s.descripcion && s.descripcion.trim())?.descripcion;
                  const mapQuery = [firstAddr, entidad.nombre].filter(Boolean).join(', ');
                  return (
                    <div
                      key={entidad.id}
                      className={`border rounded-2xl overflow-hidden shadow-sm transition-all anim-fade-in-up ${
                        expanded
                          ? 'border-orange-300 dark:border-orange-500/40 shadow-md'
                          : 'border-slate-200 dark:border-slate-700 hover:border-orange-200 dark:hover:border-orange-500/30 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 px-4 py-3 bg-gradient-to-r from-orange-50 to-transparent dark:from-orange-500/10 border-b border-slate-100 dark:border-slate-800">
                        <button
                          onClick={() => setExpandedId(expanded ? null : entidad.id)}
                          className="flex items-center gap-2.5 min-w-0 flex-1 text-left"
                        >
                          <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shrink-0 text-white shadow-sm">
                            <Building2 className="w-4 h-4" />
                          </span>
                          <div className="min-w-0">
                            <h3 className="font-bold text-slate-900 dark:text-white truncate">{entidad.nombre}</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {entidad.sedes.length} sede{entidad.sedes.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                          <ChevronDown className={`w-4 h-4 text-slate-400 ml-auto shrink-0 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} />
                        </button>
                        <div className="flex items-center gap-1.5 shrink-0">
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

                      <div className={`grid transition-all duration-300 ease-out ${expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                        <div className="overflow-hidden">
                          <div className="p-4 space-y-3">
                            {entidad.sedes.length === 0 ? (
                              <p className="text-sm italic text-slate-400">Sin sedes registradas.</p>
                            ) : (
                              <ul className="space-y-2">
                                {entidad.sedes.map((sede) => (
                                  <li key={sede.id} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                                    <MapPin className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
                                    <div className="min-w-0 flex-1">
                                      <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">{sede.nombre}</p>
                                      {sede.descripcion && (
                                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{sede.descripcion}</p>
                                      )}
                                    </div>
                                    {sede.descripcion && (
                                      <a
                                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(sede.descripcion + ', ' + entidad.nombre)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-colors shrink-0"
                                        title="Abrir en Google Maps"
                                      >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                      </a>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            )}

                            {mapQuery && (
                              <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                                <iframe
                                  title={`Mapa de ${entidad.nombre}`}
                                  src={`https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`}
                                  className="w-full h-48 border-0"
                                  loading="lazy"
                                  referrerPolicy="no-referrer-when-downgrade"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
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