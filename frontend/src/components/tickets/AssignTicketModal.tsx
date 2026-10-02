import React, { useEffect, useState } from 'react';
import { UserCheck } from 'lucide-react';
import { useUserStore } from '../../store/userStore';
import FormModal from '../ui/FormModal';

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
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      title="Asignar Técnico"
      subtitle="Selecciona el técnico responsable"
      icon={<UserCheck className="w-5 h-5" />}
      theme="tickets"
      onSubmit={handleSubmit}
      submitLabel="Asignar"
      loading={isSubmitting}
      error={error || undefined}
      maxWidth="max-w-md"
    >
      <div className="mb-2">
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

    </FormModal>
  );
}
