import React, { useState, useEffect } from 'react';
import { BookOpen, Search, Plus, Loader2, Eye, Pencil, Trash2, ArrowLeft, X, Save, FileText } from 'lucide-react';
import { useKnowledgeStore, type KnowledgeArticle } from '../store/knowledgeStore';
import { useAuthStore } from '../store/authStore';
import ConfirmDialog, { type DialogVariant } from '../components/ui/ConfirmDialog';
import Pagination from '../components/ui/Pagination';
import { usePagedList } from '../lib/hooks';
import { useToast } from '../components/ui/Toast';

interface ArticleForm {
  titulo: string;
  categoria: string;
  contenido: string;
  publicado: boolean;
}

const emptyForm: ArticleForm = { titulo: '', categoria: '', contenido: '', publicado: true };

export default function Knowledge() {
  const { articles, loading, fetchArticles, createArticle, updateArticle, deleteArticle } = useKnowledgeStore();
  const { isAdmin, hasRole } = useAuthStore();
  const toast = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selected, setSelected] = useState<KnowledgeArticle | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ArticleForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [dialog, setDialog] = useState<{
    variant: DialogVariant;
    title: string;
    message: string;
    confirmText?: string;
    action?: () => Promise<void>;
    successTitle?: string;
  } | null>(null);
  const { page, setPage, pageSize, setPageSize, paged: pagedArticles, total: totalArticles } = usePagedList(articles, 10);

  const isStaff = isAdmin() || hasRole('TECNICO') || hasRole('SUPERVISOR');

  useEffect(() => {
    fetchArticles(undefined, isStaff);
  }, [fetchArticles, isStaff]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSelected(null);
    fetchArticles(searchTerm, false);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setEditorOpen(true);
  };

  const openEdit = (article: KnowledgeArticle) => {
    setEditingId(article.id);
    setForm({
      titulo: article.titulo,
      categoria: article.categoria || '',
      contenido: article.contenido,
      publicado: article.publicado,
    });
    setEditorOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.titulo.trim() || !form.contenido.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        await updateArticle(editingId, form);
        toast({ variant: 'success', title: 'Artículo actualizado', message: `"${form.titulo}" se guardó correctamente.` });
      } else {
        await createArticle(form);
        toast({ variant: 'success', title: 'Artículo creado', message: `"${form.titulo}" fue publicado en la base de conocimiento.` });
      }
      setEditorOpen(false);
      await fetchArticles(undefined, isStaff);
    } catch (err) {
      console.error(err);
      toast({ variant: 'error', title: 'Error al guardar', message: 'No se pudo guardar el artículo. Inténtalo nuevamente.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (article: KnowledgeArticle) => {
    setDialog({
      variant: 'danger',
      title: 'Eliminar artículo',
      message: `¿Eliminar "${article.titulo}"? Esta acción no se puede deshacer.`,
      confirmText: 'Sí, eliminar',
      action: async () => {
        await deleteArticle(article.id);
        if (selected?.id === article.id) setSelected(null);
        await fetchArticles(undefined, isStaff);
      },
      successTitle: 'Artículo eliminado',
    });
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

  // Render básico de markdown (encabezados, negritas, listas y código)
  const renderContent = (text: string) => {
    return text.split('\n').map((line, i) => {
      const trimmed = line.trim();
      if (!trimmed) return <div key={i} className="h-2" />;
      if (trimmed.startsWith('### ')) return <h4 key={i} className="font-extrabold text-slate-900 dark:text-white mt-3">{trimmed.slice(4)}</h4>;
      if (trimmed.startsWith('## ')) return <h3 key={i} className="font-extrabold text-slate-900 dark:text-white mt-4 text-base">{trimmed.slice(3)}</h3>;
      if (trimmed.startsWith('# ')) return <h2 key={i} className="font-black text-slate-900 dark:text-white mt-4 text-lg">{trimmed.slice(2)}</h2>;
      if (/^[-*] /.test(trimmed)) {
        return (
          <div key={i} className="flex gap-2 ml-1">
            <span className="text-blue-500 font-bold">•</span>
            <span>{formatInline(trimmed.slice(2))}</span>
          </div>
        );
      }
      if (/^\d+\. /.test(trimmed)) {
        const num = trimmed.match(/^(\d+)\. /)?.[1];
        return (
          <div key={i} className="flex gap-2 ml-1">
            <span className="text-blue-500 font-bold">{num}.</span>
            <span>{formatInline(trimmed.replace(/^\d+\. /, ''))}</span>
          </div>
        );
      }
      return <p key={i}>{formatInline(trimmed)}</p>;
    });
  };

  const formatInline = (text: string): React.ReactNode => {
    const parts: React.ReactNode[] = [];
    const regex = /\*\*(.+?)\*\*|`([^`]+)`/g;
    let lastIndex = 0;
    let match;
    let key = 0;
    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) parts.push(<span key={key++}>{text.slice(lastIndex, match.index)}</span>);
      if (match[1]) parts.push(<strong key={key++} className="font-bold text-slate-900 dark:text-white">{match[1]}</strong>);
      else if (match[2]) parts.push(<code key={key++} className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-xs font-mono text-blue-600 dark:text-blue-400">{match[2]}</code>);
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) parts.push(<span key={key++}>{text.slice(lastIndex)}</span>);
    return parts;
  };

  const excerpt = (text: string, max = 140) =>
    text.replace(/[#*`>-]/g, '').trim().slice(0, max) + (text.length > max ? '...' : '');

  return (
    <div className="space-y-5 anim-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-violet-500/25">
              <BookOpen className="w-5 h-5" />
            </span>
            Base de Conocimiento
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Guías, soluciones frecuentes y documentación de soporte.</p>
        </div>
        {isStaff && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-violet-500/25 active:scale-95"
          >
            <Plus className="w-4 h-4" /> Nuevo artículo
          </button>
        )}
      </div>

      {/* Búsqueda */}
      {!selected && (
        <form onSubmit={handleSearch} className="relative max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar guías y soluciones... (ej. impresora, correo, VPN)"
            className="w-full pl-11 pr-24 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/50 transition-all"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl transition-colors"
          >
            Buscar
          </button>
        </form>
      )}

      {/* Detalle del artículo */}
      {selected ? (
        <div className="anim-fade-in-up">
          <button
            onClick={() => setSelected(null)}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-violet-600 dark:text-slate-400 dark:hover:text-violet-400 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Volver a los artículos
          </button>
          <article className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                {selected.categoria && (
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400 mb-2">
                    {selected.categoria}
                  </span>
                )}
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-snug">{selected.titulo}</h2>
                <p className="text-xs text-slate-400 mt-2">
                  Por {selected.autorNombre} · {new Date(selected.fechaCreacion).toLocaleDateString()} · {selected.vistas} vistas
                  {!selected.publicado && <span className="ml-2 px-2 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 font-bold">BORRADOR</span>}
                </p>
              </div>
              {isStaff && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => openEdit(selected)} className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 rounded-lg transition-colors" title="Editar">
                    <Pencil className="w-4 h-4" />
                  </button>
                  {isAdmin() && (
                    <button onClick={() => handleDelete(selected)} className="p-2 text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 rounded-lg transition-colors" title="Eliminar">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="prose-sm text-slate-600 dark:text-slate-300 leading-relaxed space-y-0.5 border-t border-slate-100 dark:border-slate-800 pt-5">
              {renderContent(selected.contenido)}
            </div>
          </article>
        </div>
      ) : (
        /* Grid de artículos */
        <>
          {loading ? (
            <div className="flex items-center justify-center py-20 gap-3 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin" /> <span className="font-medium text-sm">Cargando artículos...</span>
            </div>
          ) : articles.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
              <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="font-bold text-slate-500 dark:text-slate-400">No se encontraron artículos</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                {searchTerm ? 'Intenta con otros términos de búsqueda.' : 'Aún no hay publicaciones en la base de conocimiento.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {pagedArticles.map((article, idx) => (
                <button
                  key={article.id}
                  onClick={() => setSelected(article)}
                  style={{ animationDelay: `${Math.min(idx * 60, 360)}ms` }}
                  className="anim-fade-in-up text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-violet-300 dark:hover:border-violet-500/40 transition-all duration-300 group"
                >
                  <div className="flex items-center justify-between mb-3">
                    {article.categoria ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400">
                        {article.categoria}
                      </span>
                    ) : <span />}
                    {!article.publicado && (
                      <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 text-[9px] font-black uppercase">Borrador</span>
                    )}
                  </div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-sm leading-snug group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors line-clamp-2">
                    {article.titulo}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed line-clamp-3">
                    {excerpt(article.contenido)}
                  </p>
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
                    <span className="truncate">{article.autorNombre}</span>
                    <span className="inline-flex items-center gap-1 shrink-0"><Eye className="w-3 h-3" /> {article.vistas}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {!loading && articles.length > 0 && (
            <Pagination
              page={page}
              pageSize={pageSize}
              total={totalArticles}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              label="artículos"
            />
          )}
        </>
      )}

      {/* Modal editor */}
      {editorOpen && (
        <div className="fixed inset-0 z-[90] flex items-start sm:items-center justify-center bg-slate-900/70 backdrop-blur-md p-3 sm:p-6 anim-fade-in">
          <form onSubmit={handleSave} className="anim-scale-in my-auto w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[calc(100dvh-1.5rem)]">
            <div className="h-1.5 bg-gradient-to-r from-violet-500 to-purple-600 shrink-0" />
            <div className="flex items-center justify-between px-4 sm:px-6 pt-4 pb-3 shrink-0">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                {editingId ? 'Editar artículo' : 'Nuevo artículo'}
              </h3>
              <button type="button" onClick={() => setEditorOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-4 sm:px-6 pb-4 space-y-3.5 overflow-y-auto flex-1 min-h-0">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Título *</label>
                <input
                  type="text"
                  required
                  maxLength={200}
                  value={form.titulo}
                  onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                  placeholder="Ej. Cómo configurar el correo corporativo en Outlook"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/50 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Categoría</label>
                <input
                  type="text"
                  maxLength={100}
                  value={form.categoria}
                  onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                  placeholder="Ej. Correo, Hardware, Red, Software"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/50 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Contenido * <span className="font-medium text-slate-400">(soporta ## encabezados, **negritas**, - listas y `código`)</span>
                </label>
                <textarea
                  required
                  rows={10}
                  value={form.contenido}
                  onChange={(e) => setForm({ ...form, contenido: e.target.value })}
                  placeholder={'# Título\n\nPasos:\n- Primer paso\n- Segundo paso\n\n**Nota:** texto importante'}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/50 transition-all resize-y min-h-[180px]"
                />
              </div>
              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.publicado}
                  onChange={(e) => setForm({ ...form, publicado: e.target.checked })}
                  className="w-4 h-4 accent-violet-600"
                />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Publicado (visible para todos los usuarios)</span>
              </label>
            </div>
            <div className="flex justify-end gap-3 px-4 sm:px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 shrink-0">
              <button type="button" onClick={() => setEditorOpen(false)} className="px-4 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors">
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving || !form.titulo.trim() || !form.contenido.trim()}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-md shadow-violet-500/25 active:scale-95"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editingId ? 'Guardar cambios' : 'Publicar artículo'}
              </button>
            </div>
          </form>
        </div>
      )}

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
