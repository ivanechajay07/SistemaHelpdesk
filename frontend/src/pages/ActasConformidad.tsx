import { useEffect, useState } from 'react';
import { Eye, Search, Loader2, ClipboardCheck, Calendar, User, Wrench } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import { actaService } from '../services/actaService';
import { useToast } from '../components/ui/Toast';
import ActaModal from '../components/tickets/ActaModal';
import Pagination from '../components/ui/Pagination';
import DataTable from '../components/ui/DataTable';
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
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const fetchActas = async () => {
      setLoading(true);
      setError('');
      try {
        const { data } = await actaService.list();
        setActas(data || []);
      } catch (err) {
        console.error(err);
        setError('No se pudieron cargar las actas de conformidad.');
      } finally {
        setLoading(false);
      }
    };
    fetchActas();
  }, [reloadKey]);

  const verActa = async (item: ActaListItem) => {
    setLoadingTicket(item.ticketId);
    try {
      const { data } = await actaService.getTicket(item.ticketId);
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

      <DataTable
        className="anim-fade-in-up"
        columns={[
          {
            key: 'ticket',
            header: 'Ticket',
            mobilePrimary: true,
            sortValue: (item) => item.codigo || '',
            render: (item) => (
              <div className="flex flex-col">
                <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">{item.codigo}</span>
                <span className="max-w-[280px] truncate font-semibold text-slate-800 dark:text-slate-200" title={item.titulo}>
                  {item.titulo}
                </span>
              </div>
            ),
          },
          {
            key: 'solicitante',
            header: 'Solicitante',
            sortValue: (item) => item.solicitanteNombre || '',
            render: (item) => <span className="text-slate-600 dark:text-slate-300">{item.solicitanteNombre}</span>,
          },
          {
            key: 'tecnico',
            header: 'Técnico',
            sortValue: (item) => item.tecnicoNombre || '',
            render: (item) => <span className="text-slate-600 dark:text-slate-300">{item.tecnicoNombre || 'Sin asignar'}</span>,
          },
          {
            key: 'fecha',
            header: 'Fecha acta',
            sortValue: (item) => new Date(item.fecha).getTime(),
            render: (item) => <span className="text-slate-500 dark:text-slate-400">{formatDate(item.fecha)}</span>,
          },
          {
            key: 'estado',
            header: 'Estado',
            sortValue: (item) => item.estado || '',
            render: (item) => (
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${getStatusColor(item.estado)}`}>
                {item.estado?.replace('_', ' ')}
              </span>
            ),
          },
          {
            key: 'ver',
            header: 'Ver',
            align: 'right',
            mobile: false,
            render: (item) => (
              <button
                onClick={() => verActa(item)}
                disabled={loadingTicket === item.ticketId}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20"
                title="Visualizar acta firmada"
              >
                {loadingTicket === item.ticketId ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
                Ver acta
              </button>
            ),
          },
        ]}
        data={paged}
        rowKey={(item) => item.id}
        loading={loading}
        error={error || null}
        onRetry={() => setReloadKey((key) => key + 1)}
        emptyIcon={ClipboardCheck}
        emptyTitle="Sin actas de conformidad"
        emptyDescription={
          actas.length === 0
            ? 'Aún no hay actas firmadas. Se generan al cerrar tickets resueltos.'
            : 'No hay actas que coincidan con la búsqueda.'
        }
        caption="Actas de conformidad firmadas"
        minWidth="900px"
        renderMobileCard={(item) => (
          <div className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400">{item.codigo}</span>
                <h3 className="text-sm font-bold leading-snug text-slate-900 dark:text-white">{item.titulo}</h3>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${getStatusColor(item.estado)}`}>
                {item.estado?.replace('_', ' ')}
              </span>
            </div>
            <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
              <p className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> {item.solicitanteNombre}</p>
              <p className="flex items-center gap-1.5"><Wrench className="h-3.5 w-3.5" /> {item.tecnicoNombre || 'Sin asignar'}</p>
              <p className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> {formatDate(item.fecha)}</p>
            </div>
            <button
              onClick={() => verActa(item)}
              disabled={loadingTicket === item.ticketId}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50 dark:bg-emerald-500/10 dark:text-emerald-400"
            >
              {loadingTicket === item.ticketId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
              Ver acta firmada
            </button>
          </div>
        )}
      />

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
