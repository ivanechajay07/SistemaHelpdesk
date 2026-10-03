import { useState } from 'react';
import { Star, Loader2, PartyPopper, X } from 'lucide-react';
import api from '../../lib/axios';
import type { Ticket } from '../../store/ticketStore';

const LABELS = ['', 'Muy insatisfecho', 'Insatisfecho', 'Neutral', 'Satisfecho', '¡Muy satisfecho!'];

export default function CsatModal({
  ticket,
  onClose,
}: {
  ticket: Ticket;
  onClose: () => void;
}) {
  const [puntaje, setPuntaje] = useState(0);
  const [hover, setHover] = useState(0);
  const [comentario, setComentario] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (puntaje === 0) {
      setError('Selecciona una calificación de 1 a 5 estrellas.');
      return;
    }
    setSending(true);
    setError('');
    try {
      await api.post(`/tickets/${ticket.id}/rating`, { puntaje, comentario: comentario || null });
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'No se pudo enviar tu calificación.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm anim-overlay-in">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden anim-scale-in">
        {/* Encabezado degradado */}
        <div className="relative px-6 pt-7 pb-5 text-center bg-gradient-to-br from-blue-600 via-cyan-600 to-pink-600">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/15 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/25 flex items-center justify-center">
            <PartyPopper className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-xl font-black text-white">¡Ticket resuelto!</h2>
          <p className="text-sm text-blue-100 font-medium mt-1">
            ¿Cómo fue tu experiencia con <span className="font-bold">{ticket.codigo}</span>?
          </p>
        </div>

        {/* Estrellas */}
        <div className="px-6 py-6 space-y-5">
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => { setPuntaje(n); setError(''); }}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                className="p-1 transition-transform duration-150 hover:scale-125 active:scale-110"
              >
                <Star
                  className={`w-10 h-10 transition-colors ${
                    n <= (hover || puntaje)
                      ? 'fill-amber-400 text-amber-400 drop-shadow-[0_2px_6px_rgba(251,191,36,0.45)]'
                      : 'text-slate-200 dark:text-slate-700'
                  }`}
                />
              </button>
            ))}
          </div>
          <p className={`text-center text-sm font-bold h-5 ${
            puntaje >= 4 ? 'text-emerald-600 dark:text-emerald-400' : puntaje > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-transparent'
          }`}>
            {LABELS[hover || puntaje] || '.'}
          </p>

          <textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Cuéntanos más sobre tu experiencia (opcional)"
            className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 resize-none transition-all"
          />

          {error && (
            <p className="text-xs font-semibold text-red-500 text-center">{error}</p>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={sending}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Omitir
            </button>
            <button
              onClick={submit}
              disabled={sending || puntaje === 0}
              className="btn-shine flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-sm font-black shadow-lg shadow-blue-500/30 hover:-translate-y-px active:scale-95 transition-all disabled:opacity-50 disabled:translate-y-0"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4 fill-white" />}
              Enviar calificación
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
