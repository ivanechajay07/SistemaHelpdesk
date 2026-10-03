import { useEffect, useState } from 'react';
import { Eye, Search, Loader2, ClipboardCheck, Calendar, User, Wrench } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import api from '../lib/axios';
import { useToast } from '../components/ui/Toast';
import ActaModal from '../components/tickets/ActaModal';
import Pagination from '../components/ui/Pagination';
import { usePagedList } from '../lib/hooks';
import type { Ticket } from '../store/ticketStore';

interface ActaListItem {
  id: number;
  ticketId: number;
  codigo: string;
  titulo: string;
  estado: string;
  prioridad: string;
  fecha: string;
  solicitanteNombre: string;
  tecnicoNombre: string;
  creadoPorNombre: string;
  fechaCreacion: string;
}

const formatDate = (iso?: string | null): string => {
  if (!iso) return '—';
  try {
    return new Date(`${iso}T00:00:00`).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
};

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'RESUELTO': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400';
    case 'CERRADO': return 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400';
    default: return 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400';
  }
};

export default function ActasConformidad() {
  const toast = useToast();
  const [actas, setActas] = useState<ActaListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [openTicket, setOpenTicket] = useState<Ticket | null>(null);
  const [loadingTicket, setLoadingTicket] = useState<number | null>(null);

  useEffect(() => {
    const fetchActas = async () => {
      setLoading(true);
      setError('');
      try {
        const { data } = await api.get('/actas');
        setActas(data || []);
      } catch (err) {
        console.error(err);
        setError('No se pudieron cargar las actas de conformidad.');
      } finally {
        setLoading(false);
      }
    };
    fetchActas();
  }, []);

  const verActa = async (item: ActaListItem) => {
    setLoadingTicket(item.ticketId);
    try {
      const { data } = await api.get(`/tickets/${item.ticketId}`);
      setOpenTicket(data);
    } catch (err) {
      console.error(err);
      toast({ variant: 'error', title: 'Error', message: 'No se pudo abrir el acta de conformidad.' });
    } finally {
      setLoadingTicket(null);
    }
  };

  const filtered = actas.filter((a) => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    return (
      a.codigo?.toLowerCase().includes(q) ||
      a.titulo?.toLowerCase().includes(q) ||
      a.solicitanteNombre?.toLowerCase().includes(q) ||
      a.tecnicoNombre?.toLowerCase().includes(q)
    );
  });
  const { page, setPage, pageSize, setPageSize, paged, total } = usePagedList(filtered, 10);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ClipboardCheck}
        eyebrow="Tickets"
        title="Actas de Conformidad"
        subtitle="Tickets con acta firmada por el solicitante y el técnico responsable."
        gradient="from-emerald-600 via-teal-600 to-slate-800"
      >
        <div className="relative w-full sm:w-[300px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por código, título, técnico..."
            className="w-full pl-10 pr-4 py-2.5 bg-white/90 border border-white/30 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-white/50 placeholder:text-slate-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </PageHeader>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden anim-fade-in-up">
        {error && (
          <div className="m-5 p-4 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm z-10">
              <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            </div>
          )}

          {/* Tabla desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50/50 dark:bg-slate-800/20 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4 font-semibold text-[13px] tracking-wide">Ticket</th>
                  <th className="px-6 py-4 font-semibold text-[13px] tracking-wide">Solicitante</th>
                  <th className="px-6 py-4 font-semibold text-[13px] tracking-wide">Técnico</th>
                  <th className="px-6 py-4 font-semibold text-[13px] tracking-wide">Fecha acta</th>
                  <th className="px-6 py-4 font-semibold text-[13px] tracking-wide">Estado</th>
                  <th className="px-6 py-4 font-semibold text-[13px] tracking-wide text-right">Ver</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filtered.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-14 text-center text-slate-500 font-medium">
                      <ClipboardCheck className="w-9 h-9 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                      {actas.length === 0
                        ? 'Aún no hay actas de conformidad firmadas.'
                        : 'No se encontraron coincidencias.'}
                    </td>
                  </tr>
                ) : (
                  paged.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">{item.codigo}</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200 max-w-[280px] truncate" title={item.titulo}>
                            {item.titulo}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{item.solicitanteNombre}</td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{item.tecnicoNombre || 'Sin asignar'}</td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{formatDate(item.fecha)}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${getStatusColor(item.estado)}`}>
                          {item.estado?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => verActa(item)}
                          disabled={loadingTicket === item.ticketId}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20 rounded-lg transition-colors font-semibold text-xs disabled:opacity-50"
                          title="Visualizar acta firmada"
                        >
                          {loadingTicket === item.ticketId ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                          Ver acta
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Tarjetas móvil */}
          <div className="md:hidden flex flex-col gap-3 p-4">
            {loading ? (
              <div className="p-4 text-center text-slate-500 font-medium">Cargando...</div>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-center text-slate-500 font-medium">
                <ClipboardCheck className="w-9 h-9 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                {actas.length === 0
                  ? 'Aún no hay actas de conformidad firmadas.'
                  : 'No se encontraron coincidencias.'}
              </div>
            ) : (
              paged.map((item) => (
                <div key={item.id} className="border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-sm">
                  <div className="flex justify-between items-start gap-3 mb-2">
                    <div className="min-w-0">
                      <span className="font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400">{item.codigo}</span>
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm leading-snug">{item.titulo}</h3>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${getStatusColor(item.estado)}`}>
                      {item.estado?.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400 mb-3">
                    <p className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> {item.solicitanteNombre}</p>
                    <p className="flex items-center gap-1.5"><Wrench className="w-3.5 h-3.5" /> {item.tecnicoNombre || 'Sin asignar'}</p>
                    <p className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {formatDate(item.fecha)}</p>
                  </div>
                  <button
                    onClick={() => verActa(item)}
                    disabled={loadingTicket === item.ticketId}
                    className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 rounded-lg transition-colors font-semibold text-sm disabled:opacity-50"
                  >
                    {loadingTicket === item.ticketId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                    Ver acta firmada
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {!loading && filtered.length > 0 && (
        <Pagination
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          label="actas"
        />
      )}

      <ActaModal isOpen={!!openTicket} onClose={() => setOpenTicket(null)} ticket={openTicket} />
    </div>
  );
}