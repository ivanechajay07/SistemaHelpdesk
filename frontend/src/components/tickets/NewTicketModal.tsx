import React, { useState, useEffect } from 'react';
import { AlertCircle, Building2, MapPin, FileStack, Ticket } from 'lucide-react';
import FormModal, { SectionTitle } from '../ui/FormModal';
import { useTicketStore } from '../../store/ticketStore';
import { useCategoryStore } from '../../store/categoryStore';
import { useCatalogStore } from '../../store/catalogStore';
import SearchableSelect from '../ui/SearchableSelect';
import api from '../../lib/axios';

interface TicketTemplate {
  id: number;
  nombre: string;
  titulo: string;
  descripcion: string;
  prioridad: string;
  subcategoriaId: number | null;
}

interface NewTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NewTicketModal({ isOpen, onClose }: NewTicketModalProps) {
  const { createTicket, loading } = useTicketStore();
  const { categories, fetchCategories } = useCategoryStore();
  const { sedes, fetchSedes } = useCatalogStore();
  const [templates, setTemplates] = useState<TicketTemplate[]>([]);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    prioridad: 'MEDIA',
    subcategoriaId: '',
    entidad: '',
    sede: ''
  });

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      fetchSedes();
      api.get('/templates').then(({ data }) => setTemplates(data || [])).catch(() => setTemplates([]));
      setError('');
      setFieldErrors({});
      setFormData({ titulo: '', descripcion: '', prioridad: 'MEDIA', subcategoriaId: '', entidad: '', sede: '' });
    }
  }, [isOpen, fetchCategories, fetchSedes]);

  // Aplicar una plantilla al formulario
  const applyTemplate = (id: string) => {
    const t = templates.find((tpl) => tpl.id === Number(id));
    if (!t) return;
    setFormData((prev) => ({
      ...prev,
      titulo: t.titulo,
      descripcion: t.descripcion,
      prioridad: t.prioridad,
      subcategoriaId: t.subcategoriaId ? String(t.subcategoriaId) : prev.subcategoriaId,
    }));
    setFieldErrors({});
  };

  if (!isOpen) return null;

  const entidadesDisponibles = Array.from(new Set(sedes.map((s) => s.entidadNombre)));
  const sedesFiltradas = formData.entidad
    ? sedes.filter((s) => s.entidadNombre === formData.entidad)
    : sedes;

  const validateField = (name: string, value: string): string => {
    switch (name) {
      case 'titulo':
        if (!value.trim()) return 'El título es requerido';
        if (value.trim().length < 3) return 'Mínimo 3 caracteres';
        if (value.trim().length > 200) return 'Máximo 200 caracteres';
        return '';
      case 'descripcion':
        if (!value.trim()) return 'La descripción es requerida';
        if (value.trim().length < 10) return 'Mínimo 10 caracteres';
        if (value.trim().length > 2000) return 'Máximo 2000 caracteres';
        return '';
      case 'subcategoriaId':
        if (!value) return 'Selecciona una subcategoría';
        return '';
      case 'entidad':
        if (!value) return 'Selecciona una entidad';
        return '';
      case 'sede':
        if (!value) return 'Selecciona una sede';
        return '';
      default:
        return '';
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    ['titulo', 'descripcion', 'subcategoriaId', 'entidad', 'sede'].forEach(key => {
      const error = validateField(key, (formData as any)[key]);
      if (error) newErrors[key] = error;
    });
    setFieldErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFieldChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      const error = validateField(name, value);
      setFieldErrors(prev => {
        const next = { ...prev };
        if (error) {
          next[name] = error;
        } else {
          delete next[name];
        }
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!validateForm()) return;
    try {
      await createTicket({
        ...formData,
        subcategoriaId: Number(formData.subcategoriaId)
      });
      onClose();
    } catch (err: any) {      setError(err.response?.data?.message || 'Error al crear el ticket');
    }
  };

  const groupedCategories = categories.filter(c => c.active).reduce<{ id: number; name: string; subcategories: { id: number; name: string; active: boolean }[] }[]>((acc, cat) => {
    const activeSubs = cat.subcategories.filter(s => s.active);
    if (activeSubs.length > 0) {
      acc.push({ ...cat, subcategories: activeSubs });
    }
    return acc;
  }, []);

  const PRIORITY_STYLES: Record<string, string> = {
    BAJA: 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    MEDIA: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
    ALTA: 'border-orange-500 bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400',
    CRITICA: 'border-red-500 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400',
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      title="Crear Nuevo Ticket"
      subtitle="Registra una incidencia o solicitud"
      icon={<Ticket className="w-5 h-5" />}
      theme="tickets"
      onSubmit={handleSubmit}
      submitLabel="Crear Ticket"
      loadingLabel="Creando..."
      loading={loading}
      error={error}
      maxWidth="max-w-lg"
    >
      <SectionTitle>Detalle del ticket</SectionTitle>
      {templates.length > 0 && (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-500/10 dark:to-cyan-500/10 border border-blue-200/60 dark:border-blue-500/20">
              <FileStack className="w-4 h-4 text-blue-500 shrink-0" />
              <select
                onChange={(e) => applyTemplate(e.target.value)}
                defaultValue=""
                className="flex-1 bg-transparent text-sm font-semibold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="">Usar plantilla (opcional)...</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.nombre}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Título / Asunto</label>
            <input 
              type="text" 
              required
              placeholder="Ej. No puedo imprimir en el piso 3"
              className={`w-full px-4 py-2.5 border rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-400 ${
                fieldErrors.titulo ? 'border-red-500' : 'border-slate-200 dark:border-slate-700 focus:border-blue-500'
              }`}
              value={formData.titulo}
              onChange={(e) => handleFieldChange('titulo', e.target.value)}
            />
            {fieldErrors.titulo && <p className="text-red-500 text-xs mt-1">{fieldErrors.titulo}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Categoría del Problema</label>
            <select 
              required
              className={`w-full px-4 py-2.5 border rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all ${
                fieldErrors.subcategoriaId ? 'border-red-500' : 'border-slate-200 dark:border-slate-700 focus:border-blue-500'
              }`}
              value={formData.subcategoriaId}
              onChange={(e) => handleFieldChange('subcategoriaId', e.target.value)}
            >
              <option value="" disabled>Selecciona una opción...</option>
              {groupedCategories.map((cat) => (
                <optgroup key={cat.id} label={cat.name}>
                  {cat.subcategories.map((sub) => (
                    <option key={sub.id} value={sub.id}>{sub.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            {fieldErrors.subcategoriaId && <p className="text-red-500 text-xs mt-1">{fieldErrors.subcategoriaId}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Ubicación del inconveniente</label>
            {sedes.length === 0 ? (
              <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400 rounded-xl text-xs font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                No hay sedes registradas. Un administrador debe registrarlas en el módulo Entidad.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <SearchableSelect
                    options={entidadesDisponibles.map((ent) => ({ value: ent, label: ent }))}
                    value={formData.entidad}
                    onChange={(value) => {
                      setFormData((prev) => ({ ...prev, entidad: value, sede: '' }));
                      if (fieldErrors.entidad) {
                        const next = { ...fieldErrors };
                        delete next.entidad;
                        setFieldErrors(next);
                      }
                    }}
                    placeholder="Entidad..."
                    searchPlaceholder="Buscar entidad..."
                    invalid={!!fieldErrors.entidad}
                    icon={<Building2 className="w-4 h-4" />}
                  />
                  {fieldErrors.entidad && <p className="text-red-500 text-xs mt-1">{fieldErrors.entidad}</p>}
                </div>
                <div>
                  <SearchableSelect
                    options={sedesFiltradas.map((s) => ({ value: s.nombre, label: s.nombre }))}
                    value={formData.sede}
                    onChange={(value) => handleFieldChange('sede', value)}
                    placeholder="Sede..."
                    searchPlaceholder="Buscar sede..."
                    invalid={!!fieldErrors.sede}
                    icon={<MapPin className="w-4 h-4" />}
                  />
                  {fieldErrors.sede && <p className="text-red-500 text-xs mt-1">{fieldErrors.sede}</p>}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Nivel de Prioridad</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'BAJA', label: 'Baja', time: '72h' },
                { value: 'MEDIA', label: 'Media', time: '24h' },
                { value: 'ALTA', label: 'Alta', time: '8h' },
                { value: 'CRITICA', label: 'Crítica', time: 'Inmediato' },
              ].map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setFormData({...formData, prioridad: p.value})}
                  className={`px-3 py-2 rounded-xl text-sm font-medium border-2 transition-all active:scale-95 ${
                    formData.prioridad === p.value
                      ? PRIORITY_STYLES[p.value]
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  {p.label}
                  <span className="block text-[11px] opacity-70 mt-0.5">Hasta {p.time}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Descripción detallada</label>
            <textarea 
              required
              rows={4}
              placeholder="Describe el problema paso a paso..."
              className={`w-full px-4 py-2.5 border rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all resize-none placeholder:text-slate-400 ${
                fieldErrors.descripcion ? 'border-red-500' : 'border-slate-200 dark:border-slate-700 focus:border-blue-500'
              }`}
              value={formData.descripcion}
              onChange={(e) => handleFieldChange('descripcion', e.target.value)}
            />
            {fieldErrors.descripcion && <p className="text-red-500 text-xs mt-1">{fieldErrors.descripcion}</p>}
          </div>

    </FormModal>
  );
}
