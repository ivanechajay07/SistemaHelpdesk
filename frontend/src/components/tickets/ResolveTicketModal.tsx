import React, { useState } from 'react';
import { CheckCircle } from 'lucide-react';
import FormModal from '../ui/FormModal';
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
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Resolver Ticket ${ticket.codigo}`}
      subtitle="Describe la solución aplicada"
      icon={<CheckCircle className="w-5 h-5" />}
      theme="tickets"
      onSubmit={handleSubmit}
      submitLabel="Resolver y Cerrar"
      loading={loading}
      maxWidth="max-w-lg"
    >
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

    </FormModal>
  );
}
