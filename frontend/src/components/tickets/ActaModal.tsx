import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, Loader2, Camera, Trash2, Download, ClipboardCheck, AlertCircle, CheckCircle2, AlignLeft, MapPin } from 'lucide-react';
import api from '../../lib/axios';
import type { Ticket } from '../../store/ticketStore';
import SignaturePad from '../ui/SignaturePad';
import { generarActaPdf } from '../../lib/actaPdf';
import { useToast } from '../ui/Toast';

interface ActaResponse {
  id: number;
  ticketId: number;
  codigo: string;
  titulo: string;
  fecha: string;
  trabajosRealizados: string;
  observaciones: string | null;
  fotoData: string | null;
  firmaSolicitante: string;
  firmaTecnico: string;
  solicitanteNombre: string;
  tecnicoNombre: string;
  creadoPorNombre: string;
  fechaCreacion: string;
}

interface ActaModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: Ticket | null;
}

const formatDateLabel = (value?: string | null): string => {
  if (!value) return '—';
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = new Date(dateOnly ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

export default function ActaModal({ isOpen, onClose, ticket }: ActaModalProps) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [existing, setExisting] = useState<ActaResponse | null>(null);

  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [trabajosRealizados, setTrabajosRealizados] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [fotoData, setFotoData] = useState<string | null>(null);
  const [firmaSolicitante, setFirmaSolicitante] = useState<string | null>(null);
  const [firmaTecnico, setFirmaTecnico] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!isOpen || !ticket) return;
    let active = true;
    setLoading(true);
    setExisting(null);
    setErrors({});
    setFecha(new Date().toISOString().slice(0, 10));
    setTrabajosRealizados('');
    setObservaciones('');
    setFotoData(null);
    setFirmaSolicitante(null);
    setFirmaTecnico(null);
    api
      .get(`/tickets/${ticket.id}/acta`)
      .then(({ data }) => {
        if (active) setExisting(data);
      })
      .catch(() => {
        // 404: aún no existe acta -> modo formulario
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isOpen, ticket]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 1280;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, width, height);
        setFotoData(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
    if (fileRef.current) fileRef.current.value = '';
  };

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!fecha) next.fecha = 'La fecha es requerida';
    if (!trabajosRealizados.trim()) next.trabajosRealizados = 'Describe los trabajos realizados';
    else if (trabajosRealizados.trim().length < 10) next.trabajosRealizados = 'Mínimo 10 caracteres';
    if (!firmaSolicitante) next.firmaSolicitante = 'El solicitante debe firmar';
    if (!firmaTecnico) next.firmaTecnico = 'El técnico responsable debe firmar';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const downloadActa = useCallback(
    async (acta: ActaResponse) => {
      if (!ticket) return;
      setDownloading(true);
      try {
        const doc = await generarActaPdf({
          ticket,
          fecha: formatDateLabel(acta.fecha),
          trabajosRealizados: acta.trabajosRealizados,
          observaciones: acta.observaciones,
          fotoData: acta.fotoData,
          firmaSolicitante: acta.firmaSolicitante,
          firmaTecnico: acta.firmaTecnico,
        });
        doc.save(`Acta_Conformidad_${ticket.codigo}.pdf`);
      } catch (err) {
        console.error(err);
        toast({ variant: 'error', title: 'Error al generar el PDF', message: 'No se pudo generar el acta en PDF.' });
      } finally {
        setDownloading(false);
      }
    },
    [ticket, toast]
  );

  const handleFinalizar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket || !validate()) return;
    setSubmitting(true);
    try {
      const { data } = await api.post(`/tickets/${ticket.id}/acta`, {
        fecha,
        trabajosRealizados,
        observaciones,
        fotoData,
        firmaSolicitante,
        firmaTecnico,
      });
      setExisting(data);
      toast({
        variant: 'success',
        title: 'Acta registrada',
        message: `El acta de conformidad de ${ticket.codigo} se guardó correctamente.`,
      });
      await downloadActa(data);
    } catch (err: any) {
      console.error(err);
      toast({
        variant: 'error',
        title: 'Error al guardar el acta',
        message: err.response?.data?.message || 'No se pudo registrar el acta.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !ticket) return null;

  const inputCls = (field: string) =>
    `w-full px-4 py-2.5 border rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all placeholder:text-slate-400 ${
      errors[field] ? 'border-red-500' : 'border-slate-200 dark:border-slate-700 focus:border-emerald-500'
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-6 bg-slate-900/70 backdrop-blur-md anim-fade-in">
      <div className="my-auto w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden anim-scale-in flex flex-col max-h-[calc(100dvh-1.5rem)]">
        <div className="flex justify-between items-center px-5 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30 shrink-0">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight">Acta de Conformidad</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{ticket.codigo}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          </div>
        ) : existing ? (
          <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 p-3">
                <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Fecha de conformidad</p>
                <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{formatDateLabel(existing.fecha)}</p>
              </div>
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 p-3">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Generada por</p>
                <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{existing.creadoPorNombre}</p>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1">Trabajos realizados</p>
              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{existing.trabajosRealizados}</p>
            </div>

            {existing.observaciones && (
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1">Observaciones</p>
                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{existing.observaciones}</p>
              </div>
            )}

            {existing.fotoData && (
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1">Evidencia fotográfica</p>
                <img
                  src={existing.fotoData}
                  alt="Evidencia del trabajo"
                  className="w-full max-h-60 object-contain rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50"
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SignaturePad label="Firma del solicitante" defaultValue={existing.firmaSolicitante} disabled />
              <SignaturePad label="Firma del técnico responsable" defaultValue={existing.firmaTecnico} disabled />
            </div>

            <div className="pt-3 flex justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors active:scale-95"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => downloadActa(existing)}
                disabled={downloading}
                className="px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 rounded-xl transition-all shadow-md shadow-emerald-500/25 flex items-center gap-2 active:scale-95"
              >
                {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {downloading ? 'Generando...' : 'Descargar PDF'}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleFinalizar} className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-4">
            {errors.fotoData && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {errors.fotoData}
              </div>
            )}

            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                <Camera className="w-3.5 h-3.5" /> Evidencia fotográfica
              </label>
              {fotoData ? (
                <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                  <img src={fotoData} alt="Evidencia" className="w-full max-h-56 object-contain bg-slate-50" />
                  <button
                    type="button"
                    onClick={() => setFotoData(null)}
                    className="absolute top-2 right-2 p-2 bg-red-500/90 hover:bg-red-600 text-white rounded-lg transition-colors"
                    title="Quitar foto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-full border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-emerald-400 dark:hover:border-emerald-500 rounded-xl py-8 flex flex-col items-center justify-center gap-2 text-slate-500 dark:text-slate-400 transition-colors"
                >
                  <Camera className="w-7 h-7" />
                  <span className="text-sm font-semibold">Tomar foto o subir imagen</span>
                  <span className="text-xs">Opcional · se usará como evidencia en el acta</span>
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handlePhotoChange}
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                <MapPin className="w-3.5 h-3.5" /> Fecha de conformidad *
              </label>
              <input
                type="date"
                className={inputCls('fecha')}
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
              />
              {errors.fecha && <p className="text-red-500 text-xs mt-1">{errors.fecha}</p>}
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                <AlignLeft className="w-3.5 h-3.5" /> Trabajos realizados *
              </label>
              <textarea
                rows={4}
                placeholder="Detalla las actividades ejecutadas para solucionar el inconveniente..."
                className={`${inputCls('trabajosRealizados')} resize-none`}
                value={trabajosRealizados}
                onChange={(e) => setTrabajosRealizados(e.target.value)}
              />
              {errors.trabajosRealizados && <p className="text-red-500 text-xs mt-1">{errors.trabajosRealizados}</p>}
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                <AlignLeft className="w-3.5 h-3.5" /> Observaciones
              </label>
              <textarea
                rows={2}
                placeholder="Observaciones adicionales (opcional)..."
                className={`${inputCls('observaciones')} resize-none`}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
              />
            </div>

            <div className="space-y-4">
              <SignaturePad label="Firma del solicitante" onChange={setFirmaSolicitante} />
              {errors.firmaSolicitante && (
                <p className="text-red-500 text-xs -mt-2">{errors.firmaSolicitante}</p>
              )}
              <SignaturePad label="Firma del técnico responsable" onChange={setFirmaTecnico} />
              {errors.firmaTecnico && <p className="text-red-500 text-xs -mt-2">{errors.firmaTecnico}</p>}
            </div>

            <div className="pt-3 flex justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors active:scale-95"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 rounded-xl transition-all shadow-md shadow-emerald-500/25 flex items-center gap-2 active:scale-95"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {submitting ? 'Guardando...' : 'Finalizar y Generar PDF'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}