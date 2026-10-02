import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, Ticket, User as UserIcon, FileX2, X, Package } from 'lucide-react';
import api from '../../lib/axios';

interface TicketResult {
  id: number;
  codigo: string;
  titulo: string;
  estado: string;
}

interface UserResult {
  id: number;
  username: string;
  nombre: string;
  email: string;
  activo: boolean;
}

interface AssetResult {
  id: number;
  codigo: string;
  nombre: string;
  estado: string;
  sede: string | null;
}

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState<TicketResult[]>([]);
  const [usuarios, setUsuarios] = useState<UserResult[]>([]);
  const [activos, setActivos] = useState<AssetResult[]>([]);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const openSearch = () => {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 60);
  };

  const closeSearch = () => {
    setOpen(false);
    setQuery('');
    setTickets([]);
    setUsuarios([]);
    setActivos([]);
  };

  // Atajo de teclado global: Ctrl/Cmd + K abre la búsqueda
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 60);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setTickets([]);
      setUsuarios([]);
      setActivos([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get(`/search?q=${encodeURIComponent(query.trim())}`);
        setTickets(data.tickets || []);
        setUsuarios(data.usuarios || []);
        setActivos(data.activos || []);
        setHighlight(0);
      } catch {
        setTickets([]);
        setUsuarios([]);
        setActivos([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const goTicket = (id: number) => { closeSearch(); navigate(`/tickets/${id}`); };
  const goUsers = () => { closeSearch(); navigate('/users'); };
  const goAssets = () => { closeSearch(); navigate('/inventario/activos'); };

  const totalResults = tickets.length + usuarios.length + activos.length;

  return (
    <>
      <button
        type="button"
        onClick={openSearch}
        title="Buscar (Ctrl+K)"
        aria-label="Abrir búsqueda"
        className="p-2.5 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all active:scale-95"
      >
        <Search className="h-5 w-5" />
      </button>

      {open && createPortal(
        <div
          className="fixed inset-0 z-[200] flex items-start justify-center p-3 sm:p-6 bg-slate-950/60 backdrop-blur-lg anim-fade-in"
          onClick={closeSearch}
        >
          <div
            className="mt-8 sm:mt-16 w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden anim-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800">
              <Search className="w-5 h-5 text-slate-400 shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') closeSearch();
                  if (e.key === 'Enter' && tickets[highlight]) goTicket(tickets[highlight].id);
                }}
                placeholder="Buscar tickets, usuarios, activos..."
                className="flex-1 bg-transparent outline-none text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400"
              />
              {loading ? (
                <Loader2 className="w-4 h-4 text-blue-500 animate-spin shrink-0" />
              ) : (
                <button type="button" onClick={closeSearch} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Resultados */}
            <div className="max-h-[60vh] overflow-y-auto py-1.5">
              {query.trim().length < 2 ? (
                <div className="px-4 py-8 text-center">
                  <Search className="w-7 h-7 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-400">Escribe al menos 2 caracteres para buscar</p>
                  <p className="text-[11px] text-slate-400 mt-1">Tickets, usuarios e inventario · <kbd className="px-1 rounded bg-slate-100 dark:bg-slate-800">Ctrl</kbd>+<kbd className="px-1 rounded bg-slate-100 dark:bg-slate-800">K</kbd></p>
                </div>
              ) : !loading && totalResults === 0 ? (
                <div className="px-4 py-8 text-center">
                  <FileX2 className="w-6 h-6 text-slate-300 dark:text-slate-600 mx-auto mb-1.5" />
                  <p className="text-xs font-semibold text-slate-400">Sin resultados para "{query}"</p>
                </div>
              ) : (
                <>
                  {tickets.length > 0 && (
                    <p className="px-4 pt-1.5 pb-1 text-[10px] font-black uppercase tracking-wider text-slate-400">Tickets</p>
                  )}
                  {tickets.map((t, i) => (
                    <button
                      key={`t-${t.id}`}
                      onClick={() => goTicket(t.id)}
                      className={`w-full text-left px-4 py-2 flex items-center gap-3 transition-colors ${
                        highlight === i ? 'bg-blue-50 dark:bg-blue-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
                        <Ticket className="w-3.5 h-3.5 text-white" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{t.codigo}</span>
                        <span className="block text-[11px] text-slate-400 truncate">{t.titulo}</span>
                      </span>
                    </button>
                  ))}
                  {usuarios.length > 0 && (
                    <p className="px-4 pt-2 pb-1 text-[10px] font-black uppercase tracking-wider text-slate-400">Usuarios</p>
                  )}
                  {usuarios.map((u) => (
                    <button
                      key={`u-${u.id}`}
                      onClick={goUsers}
                      className="w-full text-left px-4 py-2 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                    >
                      <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center shrink-0">
                        <UserIcon className="w-3.5 h-3.5 text-white" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{u.nombre}</span>
                        <span className="block text-[11px] text-slate-400 truncate">{u.email}</span>
                      </span>
                      <span className={`ml-auto shrink-0 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase ${
                        u.activo
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400'
                      }`}>
                        {u.activo ? 'Activo' : 'Pendiente'}
                      </span>
                    </button>
                  ))}
                  {activos.length > 0 && (
                    <p className="px-4 pt-2 pb-1 text-[10px] font-black uppercase tracking-wider text-slate-400">Inventario</p>
                  )}
                  {activos.map((a) => (
                    <button
                      key={`a-${a.id}`}
                      onClick={goAssets}
                      className="w-full text-left px-4 py-2 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                    >
                      <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shrink-0">
                        <Package className="w-3.5 h-3.5 text-white" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{a.codigo}</span>
                        <span className="block text-[11px] text-slate-400 truncate">{a.nombre}{a.sede ? ` · ${a.sede}` : ''}</span>
                      </span>
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
