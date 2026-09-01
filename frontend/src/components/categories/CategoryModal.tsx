import React, { useState, useEffect } from 'react';
import { X, Layers, Save, Plus, Trash2 } from 'lucide-react';
import type { Category, Subcategory } from '../../store/categoryStore';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  category: Category | null;
}

export function CategoryModal({ isOpen, onClose, onSubmit, category }: CategoryModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    active: true,
    subcategories: [] as Subcategory[]
  });
  const [loading, setLoading] = useState(false);
  const [newSub, setNewSub] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name,
        description: category.description || '',
        active: category.active,
        subcategories: [...category.subcategories]
      });
    } else {
      setFormData({
        name: '',
        description: '',
        active: true,
        subcategories: []
      });
    }
    setErrors({});
  }, [category, isOpen]);

  if (!isOpen) return null;

  const validateField = (name: string, value: string): string => {
    switch (name) {
      case 'name':
        if (!value.trim()) return 'El nombre es requerido';
        if (value.trim().length < 2) return 'Mínimo 2 caracteres';
        if (value.trim().length > 100) return 'Máximo 100 caracteres';
        return '';
      case 'description':
        if (value.length > 500) return 'Máximo 500 caracteres';
        return '';
      default:
        return '';
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    const nameError = validateField('name', formData.name);
    const descError = validateField('description', formData.description);
    if (nameError) newErrors.name = nameError;
    if (descError) newErrors.description = descError;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFieldChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      const error = validateField(name, value);
      setErrors(prev => {
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
    if (!validateForm()) return;
    setLoading(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubcategory = () => {
    if (newSub.trim()) {
      setFormData({
        ...formData,
        subcategories: [
          ...formData.subcategories,
          { id: Date.now(), name: newSub.trim(), active: true } // Dummy ID para frontend
        ]
      });
      setNewSub('');
    }
  };

  const handleRemoveSubcategory = (index: number) => {
    const newSubs = [...formData.subcategories];
    newSubs.splice(index, 1);
    setFormData({ ...formData, subcategories: newSubs });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-6 bg-slate-900/70 backdrop-blur-md anim-fade-in">
      <div className="my-auto bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden anim-scale-in flex flex-col max-h-[calc(100dvh-1.5rem)] border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-500/20 rounded-lg text-indigo-600 dark:text-indigo-400">
              <Layers className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-semibold">{category ? 'Editar Categoría' : 'Nueva Categoría'}</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4 space-y-3.5">
          <div>
            <label className="block text-sm font-medium mb-1">Nombre de la Categoría</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => handleFieldChange('name', e.target.value)}
              className={`w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
                errors.name ? 'border-red-500' : 'border-slate-200 dark:border-slate-800'
              }`}
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Descripción</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              rows={2}
              className={`w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
                errors.description ? 'border-red-500' : 'border-slate-200 dark:border-slate-800'
              }`}
            />
            {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
          </div>
          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              id="catActive" 
              checked={formData.active}
              onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
            />
            <label htmlFor="catActive" className="text-sm font-medium">Categoría Activa</label>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <label className="block text-sm font-medium mb-2">Subcategorías (Temas de Ayuda)</label>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newSub}
                onChange={(e) => setNewSub(e.target.value)}
                placeholder="Ej. Problema con Impresora"
                className="flex-1 px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-indigo-500"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSubcategory();
                  }
                }}
              />
              <button
                type="button"
                onClick={handleAddSubcategory}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Agregar
              </button>
            </div>
            
            <div className="space-y-2">
              {formData.subcategories.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-2">No hay subcategorías registradas.</p>
              )}
              {formData.subcategories.map((sub, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg">
                  <span className="font-medium">{sub.name}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSubcategory(idx)}
                    className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-medium transition-colors active:scale-95"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-lg font-medium transition-all shadow-md shadow-indigo-500/25 disabled:opacity-50 flex items-center gap-2 active:scale-95"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Guardando...' : 'Guardar Categoría'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
