import { useState, useEffect } from 'react';
import { Search, Plus, MoreVertical, Edit2, Trash2, Mail, Clock, Smartphone, Tablet, Monitor } from 'lucide-react';
import { useUserStore } from '../store/userStore';
import type { User } from '../store/userStore';
import { UserModal } from '../components/users/UserModal';
import ConfirmDialog, { type DialogVariant } from '../components/ui/ConfirmDialog';
import Pagination from '../components/ui/Pagination';
import UserAvatar from '../components/ui/UserAvatar';
import { Skeleton } from '../components/ui/Skeleton';
import { usePagedList } from '../lib/hooks';
import { useToast } from '../components/ui/Toast';

const connectionConfig: Record<string, { label: string; dot: string; pill: string; ring: string }> = {
  CONECTADO: {
    label: 'Conectado',
    dot: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]',
    pill: 'bg-emerald-50 text-emerald-600 border-emerald-200/60 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
    ring: 'ring-emerald-400/60',
  },
  AUSENTE: {
    label: 'Ausente',
    dot: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]',
    pill: 'bg-amber-50 text-amber-600 border-amber-200/60 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
    ring: 'ring-amber-400/60',
  },
  DESCONECTADO: {
    label: 'Desconectado',
    dot: 'bg-slate-300 dark:bg-slate-600',
    pill: 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-700/50',
    ring: 'ring-slate-300/50 dark:ring-slate-600/40',
  },
};

export default function Users() {
  const { users, loading, error, fetchUsers, createUser, updateUser, deleteUser } = useUserStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null);
  const [dialog, setDialog] = useState<{
    variant: DialogVariant;
    title: string;
    message: string;
    confirmText?: string;
    action?: () => Promise<void>;
    successTitle?: string;
    successMessage?: string;
  } | null>(null);
  const toast = useToast();

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

  const handleDeleteUser = (userId: number) => {
    setActiveDropdown(null);
    setDialog({
      variant: 'danger',
      title: 'Eliminar usuario',
      message: 'Esta acción es permanente. El usuario perderá el acceso al sistema y se eliminarán sus datos asociados. ¿Deseas continuar?',
      confirmText: 'Sí, eliminar',
      action: async () => { await deleteUser(userId); },
      successTitle: 'Usuario eliminado',
      successMessage: 'El usuario fue eliminado del sistema.',
    });
  };

  useEffect(() => {
    fetchUsers();
    // Refrescar periódicamente para mantener el estado de conexión al día
    const interval = setInterval(fetchUsers, 30000);
    return () => clearInterval(interval);
  }, [fetchUsers]);

  useEffect(() => {
    if (!activeDropdown) return;
    const close = () => setActiveDropdown(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [activeDropdown]);

  const filteredUsers = users.filter(u =>
    u.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.apellidos?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const { page, setPage, pageSize, setPageSize, paged: pagedUsers, total: totalUsers } = usePagedList(filteredUsers, 10);

  const handleCreateOrUpdate = async (data: any) => {
    if (selectedUser) {
      await updateUser(selectedUser.id, data);
    } else {
      await createUser(data);
    }
  };

  const timeAgo = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'Sin registro';
    const diff = Date.now() - new Date(dateStr).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'hace un momento';
    if (min < 60) return `hace ${min} min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `hace ${h} h`;
    const d = Math.floor(h / 24);
    return `hace ${d} día${d !== 1 ? 's' : ''}`;
  };

  const getConnection = (u: User) =>
    connectionConfig[u.estadoConexion || 'DESCONECTADO'] || connectionConfig.DESCONECTADO;

  const deviceIcon = (tipo?: string | null) => {
    switch ((tipo || '').toUpperCase()) {
      case 'MOVIL': return Smartphone;
      case 'TABLET': return Tablet;
      default: return Monitor;
    }
  };
  const deviceLabel = (tipo?: string | null) => {
    switch ((tipo || '').toUpperCase()) {
      case 'MOVIL': return 'Móvil';
      case 'TABLET': return 'Tablet';
      case 'PC': return 'PC';
      default: return 'Sin registrar';
    }
  };

  const connectedCount = users.filter((u) => u.estadoConexion === 'CONECTADO').length;
  const absentCount = users.filter((u) => u.estadoConexion === 'AUSENTE').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold text-slate-900 dark:text-white tracking-tight">Gestión de Usuarios</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Administra los usuarios y técnicos del sistema.</p>
        </div>
        <button
          onClick={() => { setSelectedUser(null); setIsModalOpen(true); }}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-blue-500/20 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Nuevo Usuario
        </button>
      </div>

      {/* Resumen de presencia */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4 anim-fade-in-up">
        {[
          { label: 'Conectados', count: connectedCount, dot: connectionConfig.CONECTADO.dot, text: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Ausentes', count: absentCount, dot: connectionConfig.AUSENTE.dot, text: 'text-amber-600 dark:text-amber-400' },
          { label: 'Total', count: users.length, dot: 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.7)]', text: 'text-blue-600 dark:text-blue-400' },
        ].map((s, i) => (
          <div
            key={s.label}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center gap-3 anim-fade-in-up"
            style={{ animationDelay: `${i * 70}ms` }}
          >
            <span className={`w-3 h-3 rounded-full shrink-0 ${s.dot}`} />
            <div>
              <p className={`text-xl font-black leading-none ${s.text}`}>{s.count}</p>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Buscador */}
      <div className="relative w-full sm:max-w-md anim-fade-in-up" style={{ animationDelay: '120ms' }}>
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por nombre, correo o usuario..."
          className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Grid de tarjetas */}
      {loading && users.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
              <Skeleton className="h-3 w-full mb-2" />
              <Skeleton className="h-3 w-3/4 mb-4" />
              <Skeleton className="h-8 w-full rounded-xl" />
            </div>
          ))}
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-16 text-center">
          <Search className="w-10 h-10 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
          <p className="font-medium text-slate-500">No se encontraron usuarios.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {pagedUsers.map((user, idx) => {
            const conn = getConnection(user);
            const DevIcon = deviceIcon(user.dispositivoTipo);
            return (
              <div
                key={user.id}
                className="group relative bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-xl hover:-translate-y-0.5 hover:border-blue-200 dark:hover:border-blue-500/30 transition-all duration-300 anim-fade-in-up"
                style={{ animationDelay: `${Math.min(idx * 50, 400)}ms` }}
              >
                {/* Menú de acciones */}
                <div className="absolute top-4 right-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveDropdown(activeDropdown === user.id ? null : user.id);
                    }}
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {activeDropdown === user.id && (
                    <div className="absolute right-0 top-9 mt-1 w-44 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-30 overflow-hidden anim-scale-in origin-top-right">
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setIsModalOpen(true);
                          setActiveDropdown(null);
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-500/10 flex items-center gap-2 transition-colors"
                      >
                        <Edit2 className="w-4 h-4 text-blue-500" /> Editar
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="w-full text-left px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" /> Eliminar
                      </button>
                    </div>
                  )}
                </div>

                {/* Cabecera de tarjeta */}
                <div className="flex items-center gap-3 mb-4 pr-8">
                  <div className="relative shrink-0">
                    <UserAvatar userId={user.id} name={`${user.nombre || ''} ${user.apellidos || ''}`} size={48} />
                    <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 ${conn.dot}`}>
                      {user.estadoConexion === 'CONECTADO' && (
                        <span className={`absolute inset-0 rounded-full ${conn.dot} animate-ping opacity-60`} />
                      )}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm truncate">{user.nombre} {user.apellidos}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">@{user.username}</p>
                  </div>
                </div>

                {/* Estado de conexión */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black tracking-wide uppercase border ${conn.pill}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${conn.dot}`} />
                    {conn.label}
                  </span>
                  {!user.activo && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-red-50 text-red-500 border border-red-200/60 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400">
                      Inactivo
                    </span>
                  )}
                </div>

                {/* Última conexión */}
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-3">
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span>Últ. conexión: <strong className="font-semibold text-slate-600 dark:text-slate-300">{timeAgo(user.ultimaConexion)}</strong></span>
                </div>

                {/* Dispositivo conectado */}
                <div className="flex items-start gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-3">
                  <DevIcon className="w-3.5 h-3.5 shrink-0 mt-0.5 text-indigo-500 dark:text-indigo-400" />
                  <span className="min-w-0">
                    <strong className="font-semibold text-slate-600 dark:text-slate-300">{deviceLabel(user.dispositivoTipo)}</strong>
                    {user.dispositivoModelo ? ` · ${user.dispositivoModelo}` : ''}
                    {(user.dispositivoSo || user.navegador || user.ipUltima) && (
                      <span className="block text-[11px] text-slate-400 dark:text-slate-500 truncate">
                        {[user.dispositivoSo, user.navegador].filter(Boolean).join(' · ')}
                        {user.ipUltima ? `${user.dispositivoSo || user.navegador ? ' · ' : ''}${user.ipUltima}` : ''}
                      </span>
                    )}
                  </span>
                </div>

                {/* Email */}
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-4">
                  <Mail className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{user.email}</span>
                </div>

                {/* Roles */}
                <div className="flex gap-1.5 flex-wrap pt-3 border-t border-slate-100 dark:border-slate-800/60">
                  {user.roles.map(r => (
                    <span key={r} className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide uppercase bg-blue-50 text-blue-600 border border-blue-100 dark:border-blue-800/30 dark:bg-blue-500/10 dark:text-blue-400">
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filteredUsers.length > 0 && (
        <Pagination
          page={page}
          pageSize={pageSize}
          total={totalUsers}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          label="usuarios"
        />
      )}

      <UserModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setSelectedUser(null); }}
        onSubmit={handleCreateOrUpdate}
        user={selectedUser}
      />

      <ConfirmDialog
        isOpen={!!dialog}
        variant={dialog?.variant || 'info'}
        title={dialog?.title || ''}
        message={dialog?.message || ''}
        confirmText={dialog?.confirmText}
        onConfirm={dialog?.action ? runDialogAction : undefined}
        onClose={() => setDialog(null)}
      />
    </div>
  );
}
