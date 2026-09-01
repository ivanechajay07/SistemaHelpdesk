import React, { useState } from 'react';
import { X, CheckCircle } from 'lucide-react';
import type { Ticket } from '../../store/ticketStore';

interface ResolveTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (resolucion: string) => Promise<void>;
  ticket: Ticket;
}

export function ResolveTicketModal({ isOpen, onClose, onSubmit, ticket }: ResolveTicketModalProps) {
  const [resolucion, setResolucion] = useState('');
  const [loading, setLoading] = useState(false);
  const [fieldError, setFieldError] = useState('');

  if (!isOpen) return null;

  const validateResolucion = (value: string): string => {
    if (!value.trim()) return 'La resolución es requerida';
    if (value.trim().length < 10) return 'Mínimo 10 caracteres';
    if (value.trim().length > 2000) return 'Máximo 2000 caracteres';
    return '';
  };

  const handleChange = (value: string) => {
    setResolucion(value);
    if (fieldError) {
      const error = validateResolucion(value);
      setFieldError(error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const error = validateResolucion(resolucion);
    if (error) {
      setFieldError(error);
      return;
    }
    setLoading(true);
    try {
      await onSubmit(resolucion);
      setResolucion('');
      onClose();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-6 bg-slate-900/70 backdrop-blur-md anim-fade-in">
      <div className="my-auto bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden anim-scale-in border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-500/20 rounded-lg text-emerald-600 dark:text-emerald-400">
              <CheckCircle className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-semibold">Resolver Ticket {ticket.codigo}</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-4 sm:px-6 py-4 space-y-3.5">
          <div>
            <label htmlFor="resolucion" className="block text-sm font-medium mb-2">
              Mensaje de Resolución (Evidencia)
            </label>
            <textarea
              id="resolucion"
              required
              rows={4}
              value={resolucion}
              onChange={(e) => handleChange(e.target.value)}
              className={`w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all resize-none ${
                fieldError ? 'border-red-500' : 'border-slate-200 dark:border-slate-800'
              }`}
              placeholder="Describe cómo se solucionó el incidente..."
            />
            {fieldError && <p className="text-red-500 text-xs mt-1">{fieldError}</p>}
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
              disabled={loading || !resolucion.trim() || !!fieldError}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg font-medium transition-all shadow-md shadow-emerald-500/25 disabled:opacity-50 flex items-center gap-2 active:scale-95"
            >
              {loading ? 'Guardando...' : 'Resolver y Cerrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
