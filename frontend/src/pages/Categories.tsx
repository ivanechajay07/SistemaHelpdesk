import { useState, useEffect } from 'react';
import { Search, Plus, MoreVertical, Loader2, Edit2, Trash2, Tag } from 'lucide-react';
import { useCategoryStore } from '../store/categoryStore';
import type { Category } from '../store/categoryStore';
import { CategoryModal } from '../components/categories/CategoryModal';
import ConfirmDialog, { type DialogVariant } from '../components/ui/ConfirmDialog';
import Pagination from '../components/ui/Pagination';
import { usePagedList } from '../lib/hooks';
import { useToast } from '../components/ui/Toast';

export default function Categories() {
  const { categories, loading, error, fetchCategories, createCategory, updateCategory, deleteCategory } = useCategoryStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null);
  const [dialog, setDialog] = useState<{
    variant: DialogVariant;
    title: string;
    message: string;
    confirmText?: string;
    action?: () => Promise<void>;
    successTitle?: string;
    successMessage?: string;
  } | null>(null);
  const toast = useToast();

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
        message: 'No se pudo completar la acción. Verifica tu conexión e inténtalo nuevamente.',
      });
    }
  };

  const handleDeleteCategory = (categoryId: number) => {
    setActiveDropdown(null);
    setDialog({
      variant: 'danger',
      title: 'Eliminar categoría',
      message: 'Esta acción es permanente. Se eliminará la categoría junto con sus subcategorías y los tickets asociados. ¿Deseas continuar?',
      confirmText: 'Sí, eliminar',
      action: async () => { await deleteCategory(categoryId); },
      successTitle: 'Categoría eliminada',
      successMessage: 'La categoría y sus datos asociados fueron eliminados.',
    });
  };

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const filteredCategories = categories.filter(c =>
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const { page, setPage, pageSize, setPageSize, paged: pagedCategories, total: totalCategories } = usePagedList(filteredCategories, 10);

  const handleCreateOrUpdate = async (data: any) => {
    if (selectedCategory) {
      await updateCategory(selectedCategory.id, data);
    } else {
      await createCategory(data);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold text-slate-900 dark:text-white tracking-tight">Gestión de Categorías</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Configura los tipos de incidencias y subcategorías.</p>
        </div>
        <button 
          onClick={() => { setSelectedCategory(null); setIsModalOpen(true); }}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-blue-500/20 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Nueva Categoría
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[400px]">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="relative w-full sm:w-[320px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Buscar categoría..."
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto flex-1 relative">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm z-10">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          ) : null}
          
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50/50 dark:bg-slate-800/20 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4 font-semibold text-[13px] tracking-wide">Categoría</th>
                <th className="px-6 py-4 font-semibold text-[13px] tracking-wide">Descripción</th>
                <th className="px-6 py-4 font-semibold text-[13px] tracking-wide">Subcategorías</th>
                <th className="px-6 py-4 font-semibold text-[13px] tracking-wide">Estado</th>
                <th className="px-6 py-4 font-semibold text-[13px] tracking-wide text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredCategories.length === 0 && !loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500 font-medium">
                    No se encontraron categorías.
                  </td>
                </tr>
              ) : (
                pagedCategories.map((cat) => (
                  <tr 
                    key={cat.id} 
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors group"
                  >
                    <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200 flex items-center gap-3">
                      <div className="p-2 bg-blue-50 dark:bg-blue-500/10 text-blue-600 rounded-xl shadow-sm border border-blue-100 dark:border-blue-800">
                        <Tag className="w-4 h-4" />
                      </div>
                      {cat.name}
                    </td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-medium max-w-[200px] truncate">{cat.description}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1.5 flex-wrap max-w-[300px]">
                        {cat.subcategories.map(s => (
                          <span key={s.id} className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 shadow-sm">
                            {s.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase ${cat.active ? 'bg-emerald-50 text-emerald-600 border border-emerald-200/60 dark:border-emerald-800/30 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-red-50 text-red-600 border border-red-200/60 dark:border-red-800/30 dark:bg-red-500/10 dark:text-red-400'}`}>
                        {cat.active ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right relative">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDropdown(activeDropdown === cat.id ? null : cat.id);
                        }}
                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded transition-colors"
                      >
                        <MoreVertical className="w-5 h-5" />
                      </button>

                      {activeDropdown === cat.id && (
                        <>
                          <div className="fixed inset-0 z-20" onClick={() => setActiveDropdown(null)} />
                          <div className="absolute right-6 top-10 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-30 overflow-hidden">
                            <button
                              onClick={() => {
                                setSelectedCategory(cat);
                                setIsModalOpen(true);
                                setActiveDropdown(null);
                              }}
                              className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-500/10 flex items-center gap-2 transition-colors"
                            >
                              <Edit2 className="w-4 h-4 text-blue-500" /> Editar
                            </button>
                            <button
                              onClick={() => handleDeleteCategory(cat.id)}
                              className="w-full text-left px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" /> Eliminar
                            </button>
                          </div>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View */}
        <div className="md:hidden flex flex-col gap-4 p-4">
          {loading ? (
            <div className="p-4 text-center text-slate-500 font-medium">Cargando...</div>
          ) : filteredCategories.length === 0 ? (
            <div className="p-4 text-center text-slate-500 font-medium">No se encontraron categorías.</div>
          ) : (
            pagedCategories.map((cat) => (
              <div key={cat.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-sm relative">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 dark:bg-blue-500/10 text-blue-600 rounded-xl border border-blue-100 dark:border-blue-800">
                      <Tag className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white">{cat.name}</h3>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase mt-1 ${cat.active ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400'}`}>
                        {cat.active ? 'Activa' : 'Inactiva'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="relative">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveDropdown(activeDropdown === cat.id ? null : cat.id);
                      }}
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>
                    {activeDropdown === cat.id && (
                      <>
                        <div className="fixed inset-0 z-20" onClick={() => setActiveDropdown(null)} />
                        <div className="absolute right-0 top-8 mt-1 w-40 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-30 overflow-hidden">
                          <button onClick={() => { setSelectedCategory(cat); setIsModalOpen(true); setActiveDropdown(null); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 dark:hover:bg-blue-500/10 flex items-center gap-2 transition-colors">Editar</button>
                          <button onClick={() => handleDeleteCategory(cat.id)} className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 transition-colors">Eliminar</button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">{cat.description}</p>
                <div className="flex gap-1.5 flex-wrap">
                  {cat.subcategories.map(s => (
                    <span key={s.id} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
                      {s.name}
                    </span>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {!loading && filteredCategories.length > 0 && (
        <Pagination
          page={page}
          pageSize={pageSize}
          total={totalCategories}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          label="categorías"
        />
      )}

      <CategoryModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setSelectedCategory(null); }}
        onSubmit={handleCreateOrUpdate}
        category={selectedCategory}
      />

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
