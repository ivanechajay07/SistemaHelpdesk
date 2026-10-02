import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Plus, Loader2, CheckCircle, Edit2, Trash2, UserCheck, Filter, X, ThumbsUp, RotateCcw, Building2, MapPin, Clock, Sparkles, Archive, Lock, MessageSquare } from 'lucide-react';
import { useTicketStore, type Ticket } from '../store/ticketStore';
import { useAuthStore } from '../store/authStore';
import NewTicketModal from '../components/tickets/NewTicketModal';
import EditTicketModal from '../components/tickets/EditTicketModal';
import { ResolveTicketModal } from '../components/tickets/ResolveTicketModal';
import AssignTicketModal from '../components/tickets/AssignTicketModal';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useClickOutside, usePagedList } from '../lib/hooks';
import ConfirmDialog, { type DialogVariant } from '../components/ui/ConfirmDialog';
import Pagination from '../components/ui/Pagination';
import { useToast } from '../components/ui/Toast';
import SlaBadge from '../components/ui/SlaBadge';
import CsatModal from '../components/tickets/CsatModal';

const statusOptions = [
  { value: '', label: 'Todos' },
  { value: 'NUEVO', label: 'Nuevo' },
  { value: 'ASIGNADO', label: 'Asignado' },
  { value: 'EN_PROCESO', label: 'En Proceso' },
  { value: 'EN_REVISION', label: 'En Revisión' },
  { value: 'RESUELTO', label: 'Resuelto' },
  { value: 'CERRADO', label: 'Cerrado' },
];

const priorityOptions = [
  { value: '', label: 'Todas' },
  { value: 'CRITICA', label: 'Crítica' },
  { value: 'ALTA', label: 'Alta' },
  { value: 'MEDIA', label: 'Media' },
  { value: 'BAJA', label: 'Baja' },
];

type Vista = '' | 'recientes' | 'resueltos' | 'reactivados' | 'cerrados';

const vistaConfig: Record<string, { label: string; icon: React.ElementType; gradient: string }> = {
  recientes: { label: 'Recientes', icon: Clock, gradient: 'from-blue-500 to-indigo-600' },
  resueltos: { label: 'Resueltos', icon: CheckCircle, gradient: 'from-emerald-500 to-teal-600' },
  reactivados: { label: 'Reactivados', icon: RotateCcw, gradient: 'from-cyan-500 to-sky-600' },
  cerrados: { label: 'Cerrados', icon: Archive, gradient: 'from-slate-500 to-slate-700' },
};

export default function Tickets() {
  const { tickets, loading, error, fetchTickets, deleteTicket, resolveTicket, confirmTicket, reactivateTicket } = useTicketStore();
  const { user, hasPermission, isAdmin, hasRole } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const vista = (searchParams.get('vista') || '') as Vista;
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const navigate = useNavigate();
  const filterRef = useRef<HTMLDivElement>(null);

  const canAssign = hasPermission('TICKET_ASSIGN') || isAdmin();
  // El técnico NO puede editar tickets: solo quien tenga TICKET_EDIT (admin lo administra en Roles y Permisos)
  const canEdit = isAdmin() || hasPermission('TICKET_EDIT');
  const canDelete = isAdmin() || hasPermission('TICKET_DELETE');
  const canViewAll = hasPermission('TICKET_VIEW_ALL') || isAdmin();
  // Personal de soporte: puede editar/resolver tickets. El cliente solo crea y sigue sus tickets.
  const isStaff = canAssign || canViewAll || hasRole('TECNICO') || hasRole('SUPERVISOR');
  // El cliente confirma la solución de sus propios tickets resueltos
  const canConfirmTicket = (ticket: any) =>
    ticket.estado === 'RESUELTO' && (isAdmin() || ticket.usuarioId === user?.id);

  const [dialog, setDialog] = useState<{
    variant: DialogVariant;
    title: string;
    message: string;
    confirmText?: string;
    action?: () => Promise<void>;
    successTitle?: string;
    successMessage?: string;
  } | null>(null);
  const [csatTicket, setCsatTicket] = useState<Ticket | null>(null);
  const toast = useToast();

  // El cliente no puede abrir el detalle hasta que el administrador asigne un técnico
  const isTicketLocked = (ticket: any) => !isStaff && !ticket.tecnicoId;
  const openTicket = (ticket: any) => {
    if (isTicketLocked(ticket)) {
      toast({
        variant: 'info',
        title: 'Ticket pendiente de asignación',
        message: 'Podrás abrir el detalle cuando el administrador asigne un técnico. Te llegará un correo con el nombre del técnico que atenderá tu ticket.',
      });
      return;
    }
    navigate(`/tickets/${ticket.id}`);
  };

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

  const handleConfirmTicket = (ticketId: number) => {
    setDialog({
      variant: 'success',
      title: 'Confirmar solución',
      message: '¿El problema fue resuelto satisfactoriamente? El ticket se cerrará y el chat quedará deshabilitado.',
      confirmText: 'Sí, confirmar y cerrar',
      action: async () => {
        await confirmTicket(ticketId);
        // Al confirmar, mostrar encuesta de satisfacción (CSAT)
        const cerrado = tickets.find((t) => t.id === ticketId);
        if (cerrado) setCsatTicket({ ...cerrado, estado: 'CERRADO' });
      },
      successTitle: 'Solución confirmada',
      successMessage: 'El ticket fue cerrado correctamente. ¡Gracias por tu confirmación!',
    });
  };

  // Un ticket cerrado puede ser reactivado por su creador, el técnico asignado o un admin
  const canReactivateTicket = (ticket: any) =>
    ticket.estado === 'CERRADO' && (isAdmin() || ticket.usuarioId === user?.id || ticket.tecnicoId === user?.id);

  const handleReactivateTicket = (ticketId: number) => {
    setDialog({
      variant: 'info',
      title: 'Reactivar ticket',
      message: 'El estado cambiará a "En Revisión" y el chat se habilitará nuevamente para ambos usuarios.',
      confirmText: 'Sí, reactivar',
      action: async () => { await reactivateTicket(ticketId); },
      successTitle: 'Ticket reactivado',
      successMessage: 'El ticket volvió al estado "En Revisión" y el chat está activo nuevamente.',
    });
  };

  const handleDeleteTicket = (ticketId: number) => {
    setDialog({
      variant: 'danger',
      title: 'Eliminar ticket',
      message: 'Esta acción es permanente. Se eliminarán el ticket, sus mensajes, archivos e historial. ¿Deseas continuar?',
      confirmText: 'Sí, eliminar',
      action: async () => { await deleteTicket(ticketId); },
      successTitle: 'Ticket eliminado',
      successMessage: 'El ticket y sus datos asociados fueron eliminados.',
    });
  };

  const closeFilters = useCallback(() => setShowFilters(false), []);
  useClickOutside(filterRef, closeFilters);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleResolveTicket = async (resolucion: string) => {
    if (selectedTicket) {
      await resolveTicket(selectedTicket.id, resolucion);
    }
  };

  const handleAssignTicket = async (tecnicoId: number) => {
    if (selectedTicket) {
      await useTicketStore.getState().assignTicket(selectedTicket.id, tecnicoId);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'NUEVO': return 'bg-blue-50 text-blue-700 ring-1 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/30';
      case 'EN_PROCESO': return 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/30';
      case 'EN_REVISION': return 'bg-cyan-50 text-cyan-700 ring-1 ring-cyan-600/20 dark:bg-cyan-500/10 dark:text-cyan-400 dark:ring-cyan-500/30';
      case 'ASIGNADO': return 'bg-purple-50 text-purple-700 ring-1 ring-purple-600/20 dark:bg-purple-500/10 dark:text-purple-400 dark:ring-purple-500/30';
      case 'RESUELTO': return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/30';
      case 'CERRADO': return 'bg-slate-100 text-slate-600 ring-1 ring-slate-600/20 dark:bg-slate-500/10 dark:text-slate-400 dark:ring-slate-500/30';
      default: return 'bg-slate-100 text-slate-600 ring-1 ring-slate-600/20 dark:bg-slate-500/10 dark:text-slate-400 dark:ring-slate-500/30';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICA': return 'text-rose-500';
      case 'ALTA': return 'text-orange-500';
      case 'MEDIA': return 'text-yellow-500';
      case 'BAJA': return 'text-emerald-500';
      default: return 'text-slate-500';
    }
  };

  const filteredTickets = tickets.filter(t => {
    const matchesSearch =
      t.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.titulo?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || t.estado === statusFilter;
    const matchesPriority = !priorityFilter || t.prioridad === priorityFilter;
    let matchesVista = true;
    if (vista === 'recientes') {
      matchesVista = ['NUEVO', 'ASIGNADO', 'EN_PROCESO', 'EN_REVISION'].includes(t.estado);
    } else if (vista === 'resueltos') {
      matchesVista = t.estado === 'RESUELTO';
    } else if (vista === 'reactivados') {
      matchesVista = !!t.reactivado;
    } else if (vista === 'cerrados') {
      matchesVista = t.estado === 'CERRADO';
    }
    return matchesSearch && matchesStatus && matchesPriority && matchesVista;
  });

  if (vista === 'recientes') {
    filteredTickets.sort((a, b) => new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime());
  }

  const { page, setPage, pageSize, setPageSize, paged: pagedTickets, total: totalTickets } = usePagedList(filteredTickets, 10);

  const activeFilterCount = [statusFilter, priorityFilter].filter(Boolean).length;

  const setVista = (v: Vista) => {
    if (v) setSearchParams({ vista: v });
    else setSearchParams({});
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Gestión de Tickets
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium text-sm">Administra y resuelve las incidencias reportadas.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-blue-500/20 active:scale-95 w-full md:w-auto"
        >
          <Plus className="w-4 h-4" />
          Nuevo Ticket
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50/80 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      {/* Vistas rápidas: Recientes / Resueltos / Reactivados (admin, supervisor y técnico) */}
      {isStaff && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setVista('')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all duration-300 active:scale-95 ${
              !vista
                ? 'bg-gradient-to-r from-slate-700 to-slate-900 text-white shadow-md shadow-slate-500/30'
                : 'text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Todos
          </button>
          {Object.entries(vistaConfig).map(([key, cfg]) => {
            const count =
              key === 'recientes'
                ? tickets.filter((t) => ['NUEVO', 'ASIGNADO', 'EN_PROCESO', 'EN_REVISION'].includes(t.estado)).length
                : key === 'resueltos'
                  ? tickets.filter((t) => t.estado === 'RESUELTO').length
                  : key === 'cerrados'
                    ? tickets.filter((t) => t.estado === 'CERRADO').length
                    : tickets.filter((t) => t.reactivado).length;
            const Icon = cfg.icon;
            return (
              <button
                key={key}
                onClick={() => setVista(key as Vista)}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all duration-300 active:scale-95 ${
                  vista === key
                    ? `bg-gradient-to-r ${cfg.gradient} text-white shadow-md`
                    : 'text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                Tickets {cfg.label}
                <span className={`min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center text-[10px] font-black rounded-full ${
                  vista === key ? 'bg-white/25 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[400px]">
        {/* Search & Filters Bar */}
        <div className="p-4 border-b border-slate-200/50 dark:border-slate-800/50 bg-slate-50/30 dark:bg-slate-800/20">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
              <input 
                type="text"
                placeholder="Buscar por código o título..."
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-950/50 border border-slate-300/80 dark:border-slate-700/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all placeholder:text-slate-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="relative" ref={filterRef}>
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm font-semibold transition-all w-full sm:w-auto justify-center ${
                  activeFilterCount > 0
                    ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-300 dark:border-blue-500/30 text-blue-600 dark:text-blue-400'
                    : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                <Filter className="w-4 h-4" />
                Filtros
                {activeFilterCount > 0 && (
                  <span className="w-5 h-5 flex items-center justify-center text-[10px] font-bold text-white bg-blue-600 rounded-full">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {showFilters && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-30 p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">Filtros</h3>
                    <button 
                      onClick={() => { setStatusFilter(''); setPriorityFilter(''); }}
                      className="text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline"
                    >
                      Limpiar todo
                    </button>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Estado</label>
                    <div className="flex flex-wrap gap-1.5">
                      {statusOptions.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => setStatusFilter(opt.value)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            statusFilter === opt.value
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Prioridad</label>
                    <div className="flex flex-wrap gap-1.5">
                      {priorityOptions.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => setPriorityFilter(opt.value)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            priorityFilter === opt.value
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Active Filter Tags */}
          {activeFilterCount > 0 && (
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <span className="text-xs text-slate-500 font-medium">Activos:</span>
              {statusFilter && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 rounded-lg text-xs font-medium">
                  {statusOptions.find(o => o.value === statusFilter)?.label}
                  <button onClick={() => setStatusFilter('')} className="hover:text-blue-900 dark:hover:text-blue-200"><X className="w-3 h-3" /></button>
                </span>
              )}
              {priorityFilter && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 rounded-lg text-xs font-medium">
                  {priorityOptions.find(o => o.value === priorityFilter)?.label}
                  <button onClick={() => setPriorityFilter('')} className="hover:text-blue-900 dark:hover:text-blue-200"><X className="w-3 h-3" /></button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="overflow-x-auto flex-1 relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm z-10">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          )}

          {/* Desktop Table (solo en pantallas grandes; en tablet/móvil se usan tarjetas) */}
          <div className="hidden lg:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/50 dark:bg-slate-900/20 text-slate-500 dark:text-slate-400 border-b border-slate-200/60 dark:border-slate-800/60">
                <tr>
                  <th className="px-6 py-3 font-semibold text-xs uppercase tracking-wider">Código</th>
                  <th className="px-6 py-3 font-semibold text-xs uppercase tracking-wider">Asunto</th>
                  <th className="px-6 py-3 font-semibold text-xs uppercase tracking-wider">Categoría</th>
                  <th className="px-6 py-3 font-semibold text-xs uppercase tracking-wider hidden xl:table-cell">Entidad</th>
                  <th className="px-6 py-3 font-semibold text-xs uppercase tracking-wider hidden xl:table-cell">Sede</th>
                  <th className="px-6 py-3 font-semibold text-xs uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 font-semibold text-xs uppercase tracking-wider">Prioridad</th>
                  <th className="px-6 py-3 font-semibold text-xs uppercase tracking-wider hidden xl:table-cell">Fecha</th>
                  <th className="px-6 py-3 font-semibold text-xs uppercase tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {filteredTickets.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center gap-2">
                        <Search className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                        <p className="font-medium">No se encontraron tickets</p>
                        <p className="text-xs text-slate-400">Intenta ajustar los filtros de búsqueda</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pagedTickets.map((ticket) => (
                    <tr 
                      key={ticket.id} 
                      onClick={() => openTicket(ticket)}
                      className={`hover:bg-blue-50/30 dark:hover:bg-slate-800/40 transition-colors group ${
                        isTicketLocked(ticket) ? 'cursor-not-allowed' : 'cursor-pointer'
                      }`}
                    >
                      <td className="px-6 py-3">
                        <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-blue-100/50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400">
                          {ticket.codigo}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <span className="font-semibold text-slate-900 dark:text-slate-100 block truncate max-w-[200px] group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" title={ticket.titulo}>
                          {ticket.titulo}
                        </span>
                        <div className="mt-1 flex items-center gap-2 flex-wrap">
                          <SlaBadge estado={ticket.slaEstado} horasRestantes={ticket.slaHorasRestantes} limiteHoras={ticket.slaLimiteHoras} />
                          {isTicketLocked(ticket) && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                              <Lock className="w-3 h-3" /> Pendiente de asignación
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-3 text-slate-600 dark:text-slate-400 font-medium text-sm">
                        <div className="flex flex-col gap-1">
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {ticket.subcategoriaNombre || <span className="text-slate-400 italic font-normal">Sin categoría</span>}
                          </span>
                          {ticket.tecnicoNombre ? (
                            <div className="flex items-center gap-1.5" title={`Asignado a: ${ticket.tecnicoNombre}`}>
                              <div className="w-4 h-4 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-[9px] font-bold text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 shrink-0">
                                {ticket.tecnicoNombre.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[120px]">
                                {ticket.tecnicoNombre}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 dark:text-slate-500 italic">Sin asignar</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-3 hidden xl:table-cell">
                        {ticket.entidad ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                            <Building2 className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                            <span className="truncate max-w-[130px]" title={ticket.entidad}>{ticket.entidad}</span>
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 dark:text-slate-500 italic">—</span>
                        )}
                      </td>
                      <td className="px-6 py-3 hidden xl:table-cell">
                        {ticket.sede ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                            <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                            <span className="truncate max-w-[130px]" title={ticket.sede}>{ticket.sede}</span>
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 dark:text-slate-500 italic">—</span>
                        )}
                      </td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold shadow-sm ${getStatusBadge(ticket.estado)}`}>
                          {ticket.estado.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full shadow-[0_0_6px_currentColor] ${getPriorityColor(ticket.prioridad)}`} />
                          <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs">{ticket.prioridad}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-slate-500 dark:text-slate-400 font-medium text-xs hidden xl:table-cell">
                        {new Date(ticket.fechaCreacion).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          <button
                            onClick={(e) => { e.stopPropagation(); openTicket(ticket); }}
                            disabled={isTicketLocked(ticket)}
                            className={`p-2 rounded-lg transition-colors ${
                              isTicketLocked(ticket)
                                ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                                : 'text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/20'
                            }`}
                            title={isTicketLocked(ticket) ? 'Disponible cuando se asigne un técnico' : 'Abrir chat / detalle'}
                          >
                            {isTicketLocked(ticket) ? <Lock className="w-3.5 h-3.5" /> : <MessageSquare className="w-3.5 h-3.5" />}
                          </button>
                          {canReactivateTicket(ticket) && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleReactivateTicket(ticket.id); }}
                              className="p-2 text-cyan-600 bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-500/10 dark:hover:bg-cyan-500/20 rounded-lg transition-colors"
                              title="Reactivar ticket"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {canConfirmTicket(ticket) && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleConfirmTicket(ticket.id); }}
                              className="p-2 text-teal-600 bg-teal-50 hover:bg-teal-100 dark:bg-teal-500/10 dark:hover:bg-teal-500/20 rounded-lg transition-colors"
                              title="Confirmar solución"
                            >
                              <ThumbsUp className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {ticket.estado !== 'CERRADO' && ticket.estado !== 'RESUELTO' && canAssign && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setSelectedTicket(ticket); setIsAssignModalOpen(true); }}
                              className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 rounded-lg transition-colors"
                              title="Asignar Técnico"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {ticket.estado !== 'CERRADO' && ticket.estado !== 'RESUELTO' && isStaff && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setSelectedTicket(ticket); setIsResolveModalOpen(true); }}
                              className="p-2 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 rounded-lg transition-colors"
                              title="Resolver"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {canEdit && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setSelectedTicket(ticket); setIsEditModalOpen(true); }}
                              className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                handleDeleteTicket(ticket.id);
                              }}
                              className="p-2 text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 rounded-lg transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Tarjetas para tablet y móvil */}
          <div className="lg:hidden flex flex-col gap-3 p-4">
            {filteredTickets.length === 0 && !loading ? (
              <div className="text-center text-slate-500 py-8 bg-slate-50/50 dark:bg-slate-800/20 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
                <Search className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="font-medium text-sm">No se encontraron tickets</p>
              </div>
            ) : (
              pagedTickets.map((ticket) => (
                <div 
                  key={ticket.id}
                  onClick={() => openTicket(ticket)}
                  className={`bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all ${
                    isTicketLocked(ticket) ? 'cursor-not-allowed' : 'cursor-pointer'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-blue-100/50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400">
                      {ticket.codigo}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${getStatusBadge(ticket.estado)}`}>
                      {ticket.estado.replace('_', ' ')}
                    </span>
                  </div>
                  
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm mb-1 leading-snug">{ticket.titulo}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                    {ticket.subcategoriaNombre || 'Sin categoría'}
                    {ticket.tecnicoNombre && ` · ${ticket.tecnicoNombre}`}
                  </p>
                  {isTicketLocked(ticket) && (
                    <span className="inline-flex items-center gap-1 mb-2 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                      <Lock className="w-3 h-3" /> Pendiente de asignación
                    </span>
                  )}
                  {(ticket.entidad || ticket.sede) && (
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      {ticket.entidad && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400">
                          <Building2 className="w-3 h-3" /> {ticket.entidad}
                        </span>
                      )}
                      {ticket.sede && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400">
                          <MapPin className="w-3 h-3" /> {ticket.sede}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700/50">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full shadow-[0_0_6px_currentColor] ${getPriorityColor(ticket.prioridad)}`} />
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{ticket.prioridad}</span>
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {new Date(ticket.fechaCreacion).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Acceso directo al detalle / chat */}
                  <button
                    onClick={(e) => { e.stopPropagation(); openTicket(ticket); }}
                    disabled={isTicketLocked(ticket)}
                    className={`w-full flex items-center justify-center gap-1.5 mt-3 p-2.5 rounded-xl text-xs font-bold transition-colors ${
                      isTicketLocked(ticket)
                        ? 'text-slate-400 bg-slate-100 dark:bg-slate-800 cursor-not-allowed'
                        : 'text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/20 active:scale-[0.99]'
                    }`}
                  >
                    {isTicketLocked(ticket)
                      ? <><Lock className="w-3.5 h-3.5" /> Pendiente de asignación</>
                      : <><MessageSquare className="w-3.5 h-3.5" /> Abrir chat</>}
                  </button>

                  {(canConfirmTicket(ticket) || canReactivateTicket(ticket) ||
                    (ticket.estado !== 'CERRADO' && ticket.estado !== 'RESUELTO' && isStaff) ||
                    canEdit || canDelete) && (
                    <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/50">
                      {canReactivateTicket(ticket) && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleReactivateTicket(ticket.id); }}
                          className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 p-2 text-cyan-600 bg-cyan-50 dark:bg-cyan-500/10 rounded-xl text-xs font-semibold transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Reactivar
                        </button>
                      )}
                      {canConfirmTicket(ticket) && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleConfirmTicket(ticket.id); }}
                          className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 p-2 text-teal-600 bg-teal-50 dark:bg-teal-500/10 rounded-xl text-xs font-semibold transition-colors"
                        >
                          <ThumbsUp className="w-3.5 h-3.5" /> Confirmar
                        </button>
                      )}
                      {ticket.estado !== 'CERRADO' && ticket.estado !== 'RESUELTO' && canAssign && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedTicket(ticket); setIsAssignModalOpen(true); }}
                          className="flex-1 min-w-[110px] flex items-center justify-center gap-1.5 p-2 text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl text-xs font-semibold transition-colors"
                        >
                          <UserCheck className="w-3.5 h-3.5" /> Asignar
                        </button>
                      )}
                      {ticket.estado !== 'CERRADO' && ticket.estado !== 'RESUELTO' && isStaff && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedTicket(ticket); setIsResolveModalOpen(true); }}
                          className="flex-1 min-w-[110px] flex items-center justify-center gap-1.5 p-2 text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl text-xs font-semibold transition-colors"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Resolver
                        </button>
                      )}
                      {canEdit && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedTicket(ticket); setIsEditModalOpen(true); }}
                          className="p-2 text-blue-600 bg-blue-50 dark:bg-blue-500/10 rounded-xl transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteTicket(ticket.id); }}
                          className="p-2 text-red-600 bg-red-50 dark:bg-red-500/10 rounded-xl transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {!loading && filteredTickets.length > 0 && (
        <Pagination
          page={page}
          pageSize={pageSize}
          total={totalTickets}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          label="tickets"
        />
      )}

      <NewTicketModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <EditTicketModal isOpen={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); setSelectedTicket(null); }} ticket={selectedTicket} />
      <ResolveTicketModal isOpen={isResolveModalOpen} onClose={() => { setIsResolveModalOpen(false); setSelectedTicket(null); }} onSubmit={handleResolveTicket} ticket={selectedTicket} />
      <AssignTicketModal isOpen={isAssignModalOpen} onClose={() => { setIsAssignModalOpen(false); setSelectedTicket(null); }} onAssign={handleAssignTicket} ticketId={selectedTicket?.id || null} currentTecnicoId={selectedTicket?.tecnicoId} />

      <ConfirmDialog
        isOpen={!!dialog}
        variant={dialog?.variant || 'info'}
        title={dialog?.title || ''}
        message={dialog?.message || ''}
        confirmText={dialog?.confirmText}
        onConfirm={runDialogAction}
        onClose={() => setDialog(null)}
      />

      {csatTicket && <CsatModal ticket={csatTicket} onClose={() => setCsatTicket(null)} />}
    </div>
  );
}
