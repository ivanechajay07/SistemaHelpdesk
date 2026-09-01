import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, Ticket, User as UserIcon, FileX2 } from 'lucide-react';
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

export default function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState<TicketResult[]>([]);
  const [usuarios, setUsuarios] = useState<UserResult[]>([]);
  const [highlight, setHighlight] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setTickets([]);
      setUsuarios([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get(`/search?q=${encodeURIComponent(query.trim())}`);
        setTickets(data.tickets || []);
        setUsuarios(data.usuarios || []);
        setHighlight(0);
      } catch {
        setTickets([]);
        setUsuarios([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const goTicket = (id: number) => { setOpen(false); setQuery(''); navigate(`/tickets/${id}`); };
  const goUsers = () => { setOpen(false); setQuery(''); navigate('/users'); };

  const totalResults = tickets.length + usuarios.length;

  return (
    <div className="relative hidden sm:block w-56 lg:w-80" ref={boxRef}>
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setOpen(false);
            if (e.key === 'Enter' && tickets[highlight]) goTicket(tickets[highlight].id);
          }}
          placeholder="Buscar tickets, usuarios..."
          className="w-full pl-10 pr-9 py-2 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 border border-transparent focus:bg-white dark:focus:bg-slate-900 focus:border-blue-400/50 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-blue-500 animate-spin" />
        )}
      </div>

      {open && query.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden anim-scale-in origin-top">
          {!loading && totalResults === 0 ? (
            <div className="px-4 py-6 text-center">
              <FileX2 className="w-6 h-6 text-slate-300 dark:text-slate-600 mx-auto mb-1.5" />
              <p className="text-xs font-semibold text-slate-400">Sin resultados para "{query}"</p>
            </div>
          ) : (
            <div className="max-h-[360px] overflow-y-auto py-1.5">
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
            </div>
          )}
        </div>
      )}
    </div>
  );
}
