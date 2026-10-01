import React, { useEffect, useState } from 'react';
import { X, UserCheck } from 'lucide-react';
import { useUserStore } from '../../store/userStore';

interface AssignTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (tecnicoId: number) => Promise<void>;
  ticketId: number | null;
  currentTecnicoId?: number | null;
}

export default function AssignTicketModal({ isOpen, onClose, onAssign, currentTecnicoId }: AssignTicketModalProps) {
  const { technicians, fetchTechnicians, loading } = useUserStore();
  const [selectedTecnicoId, setSelectedTecnicoId] = useState<number | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchTechnicians();
      setSelectedTecnicoId(currentTecnicoId || '');
      setError(null);
    }
  }, [isOpen, currentTecnicoId, fetchTechnicians]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTecnicoId) {
      setError('Por favor, selecciona un técnico.');
      return;
    }
    
    try {
      setIsSubmitting(true);
      setError(null);
      await onAssign(Number(selectedTecnicoId));
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al asignar el ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-6 bg-slate-900/70 backdrop-blur-md anim-fade-in">
      <div className="my-auto bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700 anim-scale-in">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <h3 className="text-xl font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
            <UserCheck className="w-5 h-5 text-blue-500" />
            Asignar Técnico
          </h3>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-4 sm:px-6 py-4">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm rounded-lg border border-red-200 dark:border-red-500/20">
              {error}
            </div>
          )}
          
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
              Seleccionar Técnico
            </label>
            <select
              value={selectedTecnicoId}
              onChange={(e) => setSelectedTecnicoId(Number(e.target.value) || '')}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all dark:text-slate-200 outline-none"
              disabled={loading}
            >
              <option value="">Seleccione un técnico...</option>
              {technicians.map((tecnico) => (
                <option key={tecnico.id} value={tecnico.id}>
                  {tecnico.nombre} {tecnico.apellidos}
                </option>
              ))}
            </select>
            {loading && <p className="text-sm text-slate-500 mt-2">Cargando técnicos...</p>}
            {technicians.length === 0 && !loading && <p className="text-sm text-amber-500 mt-2">No hay técnicos disponibles.</p>}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedTecnicoId}
              className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Guardando...
                </>
              ) : (
                'Asignar'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
