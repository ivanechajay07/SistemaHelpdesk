import { useEffect, useState } from 'react';
import { FileStack, Plus, Loader2, Edit2, Trash2, Search } from 'lucide-react';
import api from '../lib/axios';
import { useCategoryStore } from '../store/categoryStore';
import ConfirmDialog, { type DialogVariant } from '../components/ui/ConfirmDialog';
import FormModal, { SectionTitle } from '../components/ui/FormModal';
import Pagination from '../components/ui/Pagination';
import { usePagedList } from '../lib/hooks';
import { useToast } from '../components/ui/Toast';
import { useAuthStore } from '../store/authStore';

interface TicketTemplate {
  id: number;
  nombre: string;
  titulo: string;
  descripcion: string;
  prioridad: string;
  subcategoriaId: number | null;
  subcategoriaNombre?: string | null;
  categoriaNombre?: string | null;
}

const PRIORIDADES = ['BAJA', 'MEDIA', 'ALTA', 'CRITICA'];

const PRIORIDAD_CLS: Record<string, string> = {
  BAJA: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400',
  MEDIA: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
  ALTA: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  CRITICA: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
};

export default function Templates() {
  const [templates, setTemplates] = useState<TicketTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TicketTemplate | null>(null);
  const [form, setForm] = useState({ nombre: '', titulo: '', descripcion: '', prioridad: 'MEDIA', subcategoriaId: '' });
  const [saving, setSaving] = useState(false);
  const [dialog, setDialog] = useState<{ variant: DialogVariant; title: string; message: string; action?: () => Promise<void> } | null>(null);
  const toast = useToast();
  const { categories, fetchCategories } = useCategoryStore();
  const { hasPermission, isAdmin } = useAuthStore();

  const canManage = isAdmin() || hasPermission('CATEGORY_MANAGE');

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/templates');
      setTemplates(data || []);
    } catch {
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); fetchCategories(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ nombre: '', titulo: '', descripcion: '', prioridad: 'MEDIA', subcategoriaId: '' });
    setModalOpen(true);
  };

  const openEdit = (t: TicketTemplate) => {
    setEditing(t);
    setForm({ nombre: t.nombre, titulo: t.titulo, descripcion: t.descripcion, prioridad: t.prioridad, subcategoriaId: t.subcategoriaId ? String(t.subcategoriaId) : '' });
    setModalOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim() || !form.titulo.trim() || !form.descripcion.trim()) return;
    setSaving(true);
    try {
      const payload = { ...form, subcategoriaId: form.subcategoriaId ? Number(form.subcategoriaId) : null };
      if (editing) await api.put(`/templates/${editing.id}`, payload);
      else await api.post('/templates', payload);
      toast({ variant: 'success', title: editing ? 'Plantilla actualizada' : 'Plantilla creada', message: `"${form.nombre}" se guardó correctamente.` });
      setModalOpen(false);
      load();
    } catch (err: any) {
      toast({ variant: 'error', title: 'Error al guardar', message: err.response?.data?.message || 'Inténtalo nuevamente.' });
    } finally {
      setSaving(false);
    }
  };

  const remove = (t: TicketTemplate) => {
    setDialog({
      variant: 'danger',
      title: 'Eliminar plantilla',
      message: `¿Seguro que deseas eliminar la plantilla "${t.nombre}"? Los tickets ya creados no se afectan.`,
      action: async () => {
        await api.delete(`/templates/${t.id}`);
        toast({ variant: 'success', title: 'Plantilla eliminada', message: `"${t.nombre}" fue eliminada.` });
        load();
      },
    });
  };

  const filtered = templates.filter((t) =>
    !search || `${t.nombre} ${t.titulo}`.toLowerCase().includes(search.toLowerCase())
  );
  const { page, setPage, pageSize, setPageSize, paged: pagedTemplates, total: totalTemplates } = usePagedList(filtered, 10);

  const subcategorias = categories.flatMap((c) => (c.subcategories || []).map((s: any) => ({ ...s, categoryName: c.name })));

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
              <FileStack className="w-5 h-5 text-white" />
            </span>
            Plantillas de Tickets
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
            Casos recurrentes listos para reutilizar al crear tickets
          </p>
        </div>
        {canManage && (
          <button onClick={openCreate} className="btn-shine inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-bold shadow-lg shadow-violet-500/30 hover:-translate-y-0.5 active:scale-95 transition-all">
            <Plus className="w-4 h-4" /> Nueva plantilla
          </button>
        )}
      </div>

      {/* Búsqueda */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar plantilla..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/40 transition-all"
        />
      </div>

      {/* Grid de plantillas */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-violet-500" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <FileStack className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-400">No hay plantillas {search && 'que coincidan con la búsqueda'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {pagedTemplates.map((t) => (
            <div key={t.id} className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300">
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className={`inline-flex px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide ${PRIORIDAD_CLS[t.prioridad] || ''}`}>
                  {t.prioridad}
                </span>
                {canManage && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(t)} title="Editar" className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => remove(t)} title="Eliminar" className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
              <h3 className="font-black text-slate-900 dark:text-white leading-snug">{t.nombre}</h3>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5 truncate">{t.titulo}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 line-clamp-2 leading-relaxed">{t.descripcion}</p>
              {t.subcategoriaNombre && (
                <p className="mt-3 inline-flex px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                  {t.categoriaNombre ? `${t.categoriaNombre} / ${t.subcategoriaNombre}` : t.subcategoriaNombre}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <Pagination
          page={page}
          pageSize={pageSize}
          total={totalTemplates}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          label="plantillas"
        />
      )}

      {/* Modal crear/editar */}
      <FormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar plantilla' : 'Nueva plantilla'}
        subtitle="Respuestas rápidas para casos recurrentes"
        icon={<FileStack className="w-5 h-5" />}
        theme="templates"
        onSubmit={save}
        submitLabel={editing ? 'Guardar cambios' : 'Crear plantilla'}
        loading={saving}
        maxWidth="max-w-lg"
      >
        <SectionTitle>Contenido de la plantilla</SectionTitle>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">Nombre *</label>
                <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required maxLength={100}
                  placeholder="Ej. Impresora no responde"
                  className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500/40 transition-all" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">Título del ticket *</label>
                <input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} required maxLength={150}
                  placeholder="Título prellenado al usar la plantilla"
                  className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500/40 transition-all" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">Descripción *</label>
                <textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} required rows={4}
                  placeholder="Descripción prellenada al usar la plantilla"
                  className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500/40 resize-none transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">Prioridad</label>
                  <select value={form.prioridad} onChange={(e) => setForm({ ...form, prioridad: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500/40 transition-all">
                    {PRIORIDADES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">Subcategoría</label>
                  <select value={form.subcategoriaId} onChange={(e) => setForm({ ...form, subcategoriaId: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500/40 transition-all">
                    <option value="">Sin categoría</option>
                    {subcategorias.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.categoryName} / {s.name}</option>
                    ))}
                  </select>
                </div>
              </div>
      </FormModal>

      <ConfirmDialog
        isOpen={!!dialog}
        variant={dialog?.variant || 'danger'}
        title={dialog?.title || ''}
        message={dialog?.message || ''}
        confirmText="Sí, eliminar"
        onConfirm={async () => { const a = dialog?.action; setDialog(null); if (a) { try { await a(); } catch { toast({ variant: 'error', title: 'Error', message: 'No se pudo eliminar la plantilla.' }); } } }}
        onClose={() => setDialog(null)}
      />
    </div>
  );
}
