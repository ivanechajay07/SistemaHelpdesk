import React, { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useTicketStore } from '../store/ticketStore';
import {
  LayoutDashboard,
  Ticket,
  Users,
  Settings,
  LogOut,
  Bell,
  MessageCircle,
  Mail,
  Layers,
  Shield,
  Sun,
  Moon,
  Menu,
  X,
  FileText,
  BookOpen,
  Activity,
  TicketPlus,
  KeyRound,
  UserPlus,
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  RotateCcw,
  Archive,
  ListTodo,
  ListChecks,
  CalendarRange,
  ChartGantt,
  Check,
  ClipboardCheck,
  Loader2,
  FileStack,
  ScrollText,
  Boxes,
  Package,
  ArrowLeftRight,
  Wrench,
  PackagePlus,
  History,
  BarChart3,
  LayoutDashboard as InvDashboard,
  ClipboardList
} from 'lucide-react';
import { useThemeStore } from '../store/themeStore';
import { useNotificationsStore, type AppNotification } from '../store/notificationsStore';
import { useChatNotificationsStore } from '../store/chatNotificationsStore';
import { playNotificationTone } from '../lib/notificationSound';
import api from '../lib/axios';
import { useProfileImage } from '../lib/hooks';
import { useToast } from '../components/ui/Toast';
import GlobalSearch from '../components/ui/GlobalSearch';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Panel de Control',
  '/tickets': 'Gestión de Tickets',
  '/tickets/actas': 'Actas de Conformidad',
  '/knowledge': 'Base de Conocimiento',
  '/knowledge/correos': 'Directorio de Correo Corporativo',
  '/monitoring': 'Monitoreo de Red',
  '/users': 'Gestión de Usuarios',
  '/roles': 'Roles y Permisos',
  '/categories': 'Gestión de Categorías',
  '/plantillas': 'Plantillas de Tickets',
  '/auditoria': 'Auditoría del Sistema',
  '/entidades': 'Entidades y Sedes',
  '/tareas': 'Gestor de Tareas',
  '/tareas/calendario': 'Calendario de Tareas',
  '/tareas/gantt': 'Diagrama de Gantt',
  '/reports': 'Reportes',
  '/settings': 'Configuración',
  '/inventario': 'Dashboard de Inventario',
  '/inventario/activos': 'Gestión de Activos',
  '/inventario/movimientos': 'Movimientos',
  '/inventario/transferencias': 'Transferencias',
  '/inventario/mantenimientos': 'Mantenimientos',
  '/inventario/prestamos': 'Préstamos',
  '/inventario/historial': 'Historial de Activos',
  '/inventario/reportes': 'Reportes de Inventario',
};

const moduleDescriptions: Record<string, string> = {
  'Dashboard': 'Métricas y resumen general',
  'Tickets': 'Soporte técnico e incidentes',
  'Tareas': 'Gestor de actividades y proyectos',
  'Conocimiento': 'Base de conocimiento y correos',
  'Monitoreo': 'Estado de servidores y red',
  'Usuarios': 'Administración de cuentas',
  'Roles': 'Permisos y control de acceso',
  'Entidad': 'Entidades, sedes y dependencias',
  'Categorías': 'Clasificación de incidentes',
  'Plantillas': 'Modelos rápidos de tickets',
  'Reportes': 'Informes y estadísticas',
  'Auditoría': 'Registro de eventos y accesos',
  'Inventario': 'Control de activos y traslados',
  'Configuración': 'Ajustes de la plataforma',
};

interface NavItem {
  name: string;
  icon: React.ElementType;
  path: string;
  show: boolean;
  gradient: string;
  shadow: string;
  chipGradient?: string;
  badge?: number;
}

interface TicketSubItem {
  key: string;
  label: string;
  icon: React.ElementType;
  query?: string;
  path?: string;
  count?: number;
}

interface TaskSubItem {
  key: string;
  label: string;
  icon: React.ElementType;
  path: string;
}

interface InvSubItem {
  key: string;
  label: string;
  icon: React.ElementType;
  path: string;
}

export default function DashboardLayout() {
  const { user, logout, hasPermission, isAdmin, hasRole, token } = useAuthStore();
  const { tickets, fetchTickets } = useTicketStore();
  const { items: notifications, fetchNotifications } = useNotificationsStore();
  const {
    totalUnread,
    unreadByTicket,
    recentMessages,
    lastEvent,
    lastAppNotification,
    connect,
    disconnect,
    fetchUnreadCounts: fetchChatUnread,
    clearTicketUnread,
  } = useChatNotificationsStore();
  const { isDark, toggleTheme } = useThemeStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [ticketsSubOpen, setTicketsSubOpen] = useState(false);
  const [tasksSubOpen, setTasksSubOpen] = useState(false);
  const [invSubOpen, setInvSubOpen] = useState(false);
  const [knowledgeSubOpen, setKnowledgeSubOpen] = useState(false);
  const [notifFilter, setNotifFilter] = useState<'todos' | 'tickets' | 'tareas' | 'seguridad' | 'usuarios'>('todos');
  const notifRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const profileImage = useProfileImage(user?.id);

  // Estado para el diseño interactivo flotante al pasar el puntero en modo colapsado
  const [hoveredModule, setHoveredModule] = useState<{
    item: NavItem;
    rect: DOMRect;
    subItems?: Array<{ key: string; label: string; icon: React.ElementType; path?: string; query?: string; count?: number }>;
  } | null>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [hoveredAction, setHoveredAction] = useState<{
    title: string;
    subtitle?: string;
    rect: DOMRect;
    isDanger?: boolean;
  } | null>(null);

  // Limpiar popovers flotantes al navegar o cambiar el estado del sidebar
  useEffect(() => {
    setHoveredModule(null);
    setHoveredAction(null);
  }, [location.pathname, collapsed]);

  useEffect(() => {
    const onScrollOrResize = () => {
      setHoveredModule(null);
      setHoveredAction(null);
    };
    window.addEventListener('resize', onScrollOrResize);
    window.addEventListener('scroll', onScrollOrResize, true);
    return () => {
      window.removeEventListener('resize', onScrollOrResize);
      window.removeEventListener('scroll', onScrollOrResize, true);
    };
  }, []);

  const getTooltipPosition = (rect: DOMRect, isMenuWithSubItems: boolean) => {
    const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 900;
    const estimatedHeight = isMenuWithSubItems ? 280 : 80;
    const centerY = rect.top + rect.height / 2;
    
    let top = centerY - 38;
    if (top + estimatedHeight > windowHeight - 16) {
      top = Math.max(16, windowHeight - estimatedHeight - 16);
    }
    if (top < 16) {
      top = 16;
    }
    
    const arrowTop = Math.max(16, Math.min(estimatedHeight - 16, centerY - top));

    return {
      left: rect.right + 12,
      top,
      arrowTop,
    };
  };

  const handleNavItemMouseEnter = (item: NavItem, e: React.MouseEvent<HTMLElement>) => {
    if (!collapsed) return;
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    
    let subItems: any[] | undefined = undefined;
    if (item.name === 'Tickets' && canSeeTicketSubmenu) {
      subItems = ticketSubItems;
    } else if (item.name === 'Tareas' && canSeeTasks) {
      subItems = taskSubItems;
    } else if (item.name === 'Inventario' && canSeeInventario) {
      subItems = invSubItems;
    } else if (item.name === 'Conocimiento') {
      subItems = [
        { key: 'knowledge', label: 'Base de Conocimiento', icon: BookOpen, path: '/knowledge' },
        ...(canSeeCorreoDirectory ? [{ key: 'correos', label: 'Directorio de Correo', icon: Mail, path: '/knowledge/correos' }] : [])
      ];
    }

    setHoveredAction(null);
    setHoveredModule({ item, rect, subItems });
  };

  const handleNavItemMouseLeave = () => {
    if (!collapsed) return;
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredModule(null);
    }, 150);
  };

  // Conexión global al WebSocket de notificaciones de chat (tiempo real)
  useEffect(() => {
    if (!token) return;
    connect(token);
    return () => disconnect();
  }, [token, connect, disconnect]);

  // Reproduce el tono de notificación (estilo Messenger) si la preferencia está activa.
  const playNotificationSound = () => {
    const prefs = user?.id ? JSON.parse(localStorage.getItem(`notif_prefs_${user.id}`) || '{}') : {};
    playNotificationTone(prefs.sound !== false);
  };

  // Toast instantáneo cuando llega un mensaje nuevo de chat
  const toast = useToast();
  useEffect(() => {
    if (!lastEvent) return;
    playNotificationSound();
    toast({
      variant: 'info',
      title: `Nuevo mensaje de ${lastEvent.remitenteNombre || 'un usuario'}`,
      message: `${lastEvent.ticketCodigo ?? 'Ticket'}: ${(lastEvent.contenido || '').slice(0, 90)}`,
    });
  }, [lastEvent]);

  // Notificación de ticket en tiempo real: refresca la campana y muestra un aviso
  useEffect(() => {
    if (!lastAppNotification) return;
    fetchNotifications();
    if (lastAppNotification.titulo) {
      playNotificationSound();
      toast({
        variant: 'info',
        title: lastAppNotification.titulo,
        message: lastAppNotification.mensaje || '',
      });
    }
  }, [lastAppNotification]); // eslint-disable-line react-hooks/exhaustive-deps

  // Carga inicial del feed; el resto de novedades llegan por WebSocket en tiempo real.
  useEffect(() => {
    fetchTickets();
    fetchNotifications();
  }, [fetchTickets, fetchNotifications]);

  // Título de la pestaña del navegador con el número de mensajes sin leer
  useEffect(() => {
    document.title = totalUnread > 0 ? `(${totalUnread}) HelpDesk PRO` : 'HelpDesk PRO';
  }, [totalUnread]);

  // Heartbeat de presencia: mantiene actualizada la última actividad del usuario
  useEffect(() => {
    const beat = () => api.post('/auth/heartbeat').catch(() => {});
    beat();
    const interval = setInterval(beat, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setSidebarOpen(false);
    setNotifOpen(false);
    setTicketsSubOpen(location.pathname.startsWith('/tickets'));
    setTasksSubOpen(location.pathname.startsWith('/tareas'));
    setInvSubOpen(location.pathname.startsWith('/inventario'));
    setKnowledgeSubOpen(location.pathname.startsWith('/knowledge'));
  }, [location.pathname]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!notifOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [notifOpen]);

  useEffect(() => {
    if (!chatOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (chatRef.current && !chatRef.current.contains(e.target as Node)) {
        setChatOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [chatOpen]);

  const newTicketsCount = tickets.filter((t) => t.estado === 'NUEVO').length;

  const timeAgo = (dateStr: string | null) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'hace un momento';
    if (min < 60) return `hace ${min} min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `hace ${h} h`;
    const d = Math.floor(h / 24);
    return `hace ${d} día${d !== 1 ? 's' : ''}`;
  };

  const notifConfig: Record<AppNotification['type'], { icon: React.ElementType; classes: string }> = {
    TICKET_CREATED: { icon: TicketPlus, classes: 'bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400' },
    PASSWORD_CHANGED: { icon: KeyRound, classes: 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400' },
    USER_PENDING: { icon: UserPlus, classes: 'bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400' },
    TASK_ASSIGNED: { icon: ListTodo, classes: 'bg-teal-100 text-teal-600 dark:bg-teal-500/15 dark:text-teal-400' },
    TASK_COMPLETED: { icon: CheckCircle2, classes: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400' },
  };

  const handleNotifClick = (n: AppNotification) => {
    setNotifOpen(false);
    if (n.type === 'TICKET_CREATED' && n.refId) {
      navigate(`/tickets/${n.refId}`);
    } else if (n.type === 'TASK_ASSIGNED' || n.type === 'TASK_COMPLETED') {
      navigate('/tareas');
    } else if (hasPermission('USER_MANAGE')) {
      navigate('/users');
    }
  };

  // Activar / Rechazar cuentas pendientes desde la notificación
  const { activatePendingUser, rejectPendingUser } = useNotificationsStore();
  const [processingNotif, setProcessingNotif] = useState<number | null>(null);

  const handleActivateUser = async (id: number) => {
    setProcessingNotif(id);
    try {
      await activatePendingUser(id);
      toast({ variant: 'success', title: 'Cuenta activada', message: 'Se envió el correo de confirmación al usuario.' });
    } catch {
      toast({ variant: 'error', title: 'Error', message: 'No se pudo activar la cuenta. Intenta de nuevo.' });
    } finally {
      setProcessingNotif(null);
    }
  };

  const handleRejectUser = async (id: number) => {
    setProcessingNotif(id);
    try {
      await rejectPendingUser(id);
      toast({ variant: 'success', title: 'Registro rechazado', message: 'Se eliminó la cuenta y se notificó al usuario por correo.' });
    } catch {
      toast({ variant: 'error', title: 'Error', message: 'No se pudo rechazar el registro. Intenta de nuevo.' });
    } finally {
      setProcessingNotif(null);
    }
  };

  // Notificaciones separadas por categoría: tickets / tareas / seguridad / usuarios
  const notifCounts = {
    tickets: notifications.filter((n) => n.type === 'TICKET_CREATED').length,
    tareas: notifications.filter((n) => n.type === 'TASK_ASSIGNED' || n.type === 'TASK_COMPLETED').length,
    seguridad: notifications.filter((n) => n.type === 'PASSWORD_CHANGED').length,
    usuarios: notifications.filter((n) => n.type === 'USER_PENDING').length,
  };
  const visibleNotifFilters = [
    { key: 'todos' as const, label: 'Todos', count: notifications.length },
    { key: 'tickets' as const, label: 'Tickets', count: notifCounts.tickets },
    ...(notifCounts.tareas > 0 ? [{ key: 'tareas' as const, label: 'Tareas', count: notifCounts.tareas }] : []),
    ...(notifCounts.seguridad > 0 ? [{ key: 'seguridad' as const, label: 'Contraseñas', count: notifCounts.seguridad }] : []),
    ...(notifCounts.usuarios > 0 ? [{ key: 'usuarios' as const, label: 'Usuarios Nuevos', count: notifCounts.usuarios }] : []),
  ];
  const filteredNotifications = notifications.filter((n) => {
    if (notifFilter === 'todos') return true;
    if (notifFilter === 'tickets') return n.type === 'TICKET_CREATED';
    if (notifFilter === 'tareas') return n.type === 'TASK_ASSIGNED' || n.type === 'TASK_COMPLETED';
    if (notifFilter === 'seguridad') return n.type === 'PASSWORD_CHANGED';
    return n.type === 'USER_PENDING';
  });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // El cliente (CLIENTE/USUARIO sin permisos de staff) solo gestiona sus tickets
  const isClientOnly =
    (hasRole('CLIENTE') || hasRole('USUARIO')) &&
    !isAdmin() &&
    !hasPermission('TICKET_ASSIGN') &&
    !hasPermission('TICKET_VIEW_ALL');

  // El acceso a cada menú depende EXCLUSIVAMENTE de los permisos configurados
  // en "Roles y Permisos" (no de atajos por rol), para que los cambios del
  // administrador se reflejen al iniciar sesión.

  // Gestor de Tareas: solo quien tenga TASK_MANAGE
  const canSeeTasks = hasPermission('TASK_MANAGE');

  // Submenú de Tickets (vistas recientes/resueltos/etc.): personal de soporte
  const canSeeTicketSubmenu = isAdmin() || hasPermission('TICKET_VIEW_ALL') || hasPermission('TICKET_ASSIGN');

  // Directorio de Correo Corporativo: solo roles de alto nivel
  const canSeeCorreoDirectory = isAdmin() || hasRole('SUPERVISOR');

  // Módulo de Inventario: quien tenga permiso de visualización
  const canSeeInventario = isAdmin() || hasPermission('INV_VIEW');

  const navItems: NavItem[] = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', show: !isClientOnly, gradient: 'from-sky-500 to-blue-600', shadow: 'shadow-sky-500/30' },
    { name: 'Tickets', icon: Ticket, path: '/tickets', show: true, gradient: 'from-blue-500 to-indigo-600', shadow: 'shadow-blue-500/30', badge: newTicketsCount + totalUnread },
    { name: 'Tareas', icon: ListTodo, path: '/tareas', show: canSeeTasks, gradient: 'from-teal-500 to-emerald-600', shadow: 'shadow-teal-500/30' },
    { name: 'Conocimiento', icon: BookOpen, path: '/knowledge', show: true, gradient: 'from-violet-500 to-purple-600', shadow: 'shadow-violet-500/30' },
    { name: 'Monitoreo', icon: Activity, path: '/monitoring', show: hasPermission('MONITORING_VIEW'), gradient: 'from-emerald-500 to-teal-600', shadow: 'shadow-emerald-500/30' },
    { name: 'Usuarios', icon: Users, path: '/users', show: hasPermission('USER_MANAGE'), gradient: 'from-cyan-500 to-teal-600', shadow: 'shadow-cyan-500/30' },
    { name: 'Roles', icon: Shield, path: '/roles', show: hasPermission('ROLE_MANAGE'), gradient: 'from-fuchsia-500 to-pink-600', shadow: 'shadow-fuchsia-500/30' },
    { name: 'Entidad', icon: Building2, path: '/entidades', show: hasPermission('ENTITY_MANAGE'), gradient: 'from-orange-500 to-amber-600', shadow: 'shadow-orange-500/30' },
    { name: 'Categorías', icon: Layers, path: '/categories', show: hasPermission('CATEGORY_MANAGE'), gradient: 'from-amber-500 to-yellow-600', shadow: 'shadow-amber-500/30' },
    { name: 'Plantillas', icon: FileStack, path: '/plantillas', show: hasPermission('CATEGORY_MANAGE'), gradient: 'from-violet-500 to-fuchsia-600', shadow: 'shadow-violet-500/30' },
    { name: 'Reportes', icon: FileText, path: '/reports', show: hasPermission('REPORT_VIEW'), gradient: 'from-lime-500 to-green-600', shadow: 'shadow-lime-500/30' },
    { name: 'Auditoría', icon: ScrollText, path: '/auditoria', show: isAdmin(), gradient: 'from-slate-600 to-slate-800', shadow: 'shadow-slate-600/30' },
    { name: 'Inventario', icon: Boxes, path: '/inventario', show: canSeeInventario, gradient: 'from-cyan-500 to-teal-600', shadow: 'shadow-cyan-500/30' },
    { name: 'Configuración', icon: Settings, path: '/settings', show: true, gradient: 'from-slate-500 to-slate-700', shadow: 'shadow-slate-500/30' },
  ].filter(item => item.show);

  // Menú lateral agrupado por módulos. Las secciones sin elementos visibles se omiten.
  const navSections: { title: string; items: NavItem[] }[] = [
    { title: 'Principal', items: navItems.filter((i) => ['Dashboard'].includes(i.name)) },
    { title: 'Mesa de Ayuda', items: navItems.filter((i) => ['Tickets', 'Tareas', 'Conocimiento'].includes(i.name)) },
    { title: 'Inventario y Monitoreo', items: navItems.filter((i) => ['Inventario', 'Monitoreo'].includes(i.name)) },
    {
      title: 'Administración',
      items: navItems.filter((i) =>
        ['Usuarios', 'Roles', 'Entidad', 'Categorías', 'Plantillas', 'Reportes', 'Auditoría'].includes(i.name)),
    },
    { title: 'Sistema', items: navItems.filter((i) => ['Configuración'].includes(i.name)) },
  ].filter((s) => s.items.length > 0);

  const ticketSubItems: TicketSubItem[] = [
    {
      key: 'recientes',
      label: 'Tickets Recientes',
      icon: Clock,
      query: '?vista=recientes',
      count: tickets.filter((t) => ['NUEVO', 'ASIGNADO', 'EN_PROCESO', 'EN_REVISION'].includes(t.estado)).length,
    },
    {
      key: 'resueltos',
      label: 'Tickets Resueltos',
      icon: CheckCircle2,
      query: '?vista=resueltos',
      count: tickets.filter((t) => t.estado === 'RESUELTO').length,
    },
    {
      key: 'reactivados',
      label: 'Tickets Reactivados',
      icon: RotateCcw,
      query: '?vista=reactivados',
      count: tickets.filter((t) => t.reactivado).length,
    },
    {
      key: 'cerrados',
      label: 'Tickets Cerrados',
      icon: Archive,
      query: '?vista=cerrados',
      count: tickets.filter((t) => t.estado === 'CERRADO').length,
    },
    {
      key: 'actas',
      label: 'Actas de Conformidad',
      icon: ClipboardCheck,
      path: '/tickets/actas',
    },
  ];

  // Submenú de Tareas: listado principal, calendario y diagrama de Gantt
  const taskSubItems: TaskSubItem[] = [
    { key: 'lista', label: 'Tareas Asignadas', icon: ListChecks, path: '/tareas' },
    { key: 'calendario', label: 'Calendario', icon: CalendarRange, path: '/tareas/calendario' },
    { key: 'gantt', label: 'Diagrama de Gantt', icon: ChartGantt, path: '/tareas/gantt' },
  ];

  // Submenú de Inventario: dashboard, activos, movimientos, transferencias, etc.
  const invSubItems: InvSubItem[] = [
    { key: 'dashboard', label: 'Dashboard', icon: InvDashboard, path: '/inventario' },
    { key: 'activos', label: 'Activos', icon: Package, path: '/inventario/activos' },
    { key: 'movimientos', label: 'Movimientos', icon: ArrowLeftRight, path: '/inventario/movimientos' },
    { key: 'transferencias', label: 'Transferencias', icon: PackagePlus, path: '/inventario/transferencias' },
    { key: 'mantenimientos', label: 'Mantenimientos', icon: Wrench, path: '/inventario/mantenimientos' },
    { key: 'prestamos', label: 'Préstamos', icon: ClipboardList, path: '/inventario/prestamos' },
    { key: 'historial', label: 'Historial', icon: History, path: '/inventario/historial' },
    { key: 'reportes', label: 'Reportes', icon: BarChart3, path: '/inventario/reportes' },
  ];

  const currentTitle = pageTitles[location.pathname] || 'Panel de Control';
  const isTicketDetail = /^\/tickets\/\d+$/.test(location.pathname);
  const sidebarWidth = collapsed ? 'w-[72px]' : 'w-72';

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">

      {/* Barra de progreso animada al cambiar de página */}
      <div
        key={location.pathname + location.search}
        className="fixed top-0 left-0 right-0 h-[3px] z-[60] pointer-events-none"
        aria-hidden="true"
      >
        <div className="h-full w-full origin-left bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 shadow-[0_0_12px_rgba(99,102,241,0.7)] anim-top-progress" />
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-40 transition-opacity anim-fade-in"
          onClick={() => setSidebarOpen(false)} 
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 ${sidebarWidth} bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-all duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        {/* Sidebar Header */}
        <div className="relative h-16 flex items-center justify-between px-4 border-b border-slate-200/50 dark:border-slate-800/50 shrink-0">
          {!collapsed && (
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-xl shadow-lg flex items-center justify-center text-white font-bold text-lg shrink-0">
                H
              </div>
              <h1 className="text-lg font-black tracking-tight whitespace-nowrap">
                HelpDesk <span className="text-blue-500">PRO</span>
              </h1>
            </div>
          )}
          {collapsed && (
            <div className="w-9 h-9 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-xl shadow-lg flex items-center justify-center text-white font-bold text-lg mx-auto">
              H
            </div>
          )}

          {/* Botón toggle ubicado exactamente entre el Sidebar (Menú) y el Header */}
          <button
            type="button"
            onClick={() => {
              setCollapsed(!collapsed);
              setHoveredModule(null);
              setHoveredAction(null);
            }}
            className="hidden lg:flex absolute -right-3.5 top-1/2 -translate-y-1/2 z-30 w-7 h-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/90 rounded-full shadow-md hover:shadow-lg items-center justify-center text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 hover:border-blue-400 dark:hover:border-blue-500 hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer"
            title={collapsed ? 'Expandir menú lateral' : 'Contraer menú lateral'}
            aria-label={collapsed ? 'Expandir menú lateral' : 'Contraer menú lateral'}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            )}
          </button>

          <button 
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {navSections.map((section) => (
            <div key={section.title} className="mb-2">
              {!collapsed && (
                <p className="px-3 pt-3 pb-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 select-none">
                  {section.title}
                </p>
              )}
              {collapsed && <div className="mx-3 my-2 border-t border-slate-200/70 dark:border-slate-800/70" />}
              <ul className="space-y-1">
                {section.items.map((item) => (
                  <li key={item.name}>
                <div className="relative">
                  <NavLink
                    to={item.path}
                    onMouseEnter={(e) => handleNavItemMouseEnter(item, e)}
                    onMouseLeave={handleNavItemMouseLeave}
                    onClick={(e) => {
                      setHoveredModule(null);
                      if (item.name === 'Tickets' && canSeeTicketSubmenu && !collapsed) {
                        e.preventDefault();
                        setTicketsSubOpen((o) => !o);
                        if (!location.pathname.startsWith('/tickets')) navigate('/tickets');
                      }
                      if (item.name === 'Tareas' && canSeeTasks && !collapsed) {
                        e.preventDefault();
                        setTasksSubOpen((o) => !o);
                        if (!location.pathname.startsWith('/tareas')) navigate('/tareas');
                      }
                      if (item.name === 'Inventario' && canSeeInventario && !collapsed) {
                        e.preventDefault();
                        setInvSubOpen((o) => !o);
                        if (!location.pathname.startsWith('/inventario')) navigate('/inventario');
                      }
                      if (item.name === 'Conocimiento' && !collapsed) {
                        e.preventDefault();
                        setKnowledgeSubOpen((o) => !o);
                        if (!location.pathname.startsWith('/knowledge')) navigate('/knowledge');
                      }
                    }}
                    className={({ isActive }) =>
                      `group relative flex items-center gap-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                        collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'
                      } ${
                        isActive
                          ? `bg-gradient-to-r ${item.gradient} text-white shadow-lg ${item.shadow} scale-[1.02]`
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-200 hover:translate-x-1'
                      }`
                    }
                  >
                    <item.icon className={`h-5 w-5 shrink-0 transition-transform duration-300 ${collapsed ? '' : 'group-hover:scale-110'}`} />
                    {!collapsed && (
                      <>
                        <span className="whitespace-nowrap">{item.name}</span>
                        {!!item.badge && item.badge > 0 && (
                          <span className="ml-auto min-w-[20px] h-5 px-1.5 flex items-center justify-center text-[10px] font-black text-white bg-gradient-to-r from-red-500 to-pink-500 rounded-full shadow-md shadow-red-500/30">
                            {item.badge > 99 ? '99+' : item.badge}
                          </span>
                        )}
                        {(item.name === 'Tickets' && canSeeTicketSubmenu) || (item.name === 'Tareas' && canSeeTasks) || (item.name === 'Inventario' && canSeeInventario) || item.name === 'Conocimiento' ? (
                          !collapsed && <ChevronDown className={`ml-auto h-4 w-4 transition-transform duration-300 ${
                            item.name === 'Tickets' ? (ticketsSubOpen ? 'rotate-180' : '') :
                            item.name === 'Tareas' ? (tasksSubOpen ? 'rotate-180' : '') :
                            item.name === 'Inventario' ? (invSubOpen ? 'rotate-180' : '') :
                            (knowledgeSubOpen ? 'rotate-180' : '')
                          }`} />
                        ) : null}
                      </>
                    )}
                    {collapsed && !!item.badge && item.badge > 0 && (
                      <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-gradient-to-r from-red-500 to-pink-500 border-2 border-white dark:border-slate-900" />
                    )}
                  </NavLink>
                </div>

                {/* Submenú de Tickets: Recientes / Resueltos / Reactivados / Cerrados */}
                {item.name === 'Tickets' && canSeeTicketSubmenu && !collapsed && ticketsSubOpen && (
                  <ul className="mt-1 mb-1 ml-5 pl-4 border-l-2 border-slate-200 dark:border-slate-700/60 space-y-0.5 anim-fade-in">
                    {ticketSubItems.map((sub) => {
                      const isActive = sub.path
                        ? location.pathname === sub.path
                        : location.pathname === '/tickets' && location.search === sub.query;
                      return (
                        <li key={sub.key}>
                          <button
                            onClick={() => navigate(sub.path || `/tickets${sub.query}`)}
                            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 hover:translate-x-0.5 ${
                              isActive
                                ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                          >
                            <sub.icon className="h-3.5 w-3.5 shrink-0" />
                            <span className="whitespace-nowrap">{sub.label}</span>
                            {sub.count != null && (
                              <span className={`ml-auto min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center text-[10px] font-black rounded-full ${
                                isActive
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                              }`}>
                                {sub.count}
                              </span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {/* Submenú de Tareas: Listado / Calendario / Gantt */}
                {item.name === 'Tareas' && canSeeTasks && !collapsed && tasksSubOpen && (
                  <ul className="mt-1 mb-1 ml-5 pl-4 border-l-2 border-teal-200 dark:border-teal-700/40 space-y-0.5 anim-fade-in">
                    {taskSubItems.map((sub) => {
                      const isActive = sub.path === '/tareas'
                        ? location.pathname === '/tareas'
                        : location.pathname === sub.path;
                      return (
                        <li key={sub.key}>
                          <button
                            onClick={() => navigate(sub.path)}
                            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 hover:translate-x-0.5 ${
                              isActive
                                ? 'bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400'
                                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                          >
                            <sub.icon className="h-3.5 w-3.5 shrink-0" />
                            <span className="whitespace-nowrap">{sub.label}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {/* Submenú de Inventario: Dashboard / Activos / Movimientos / etc. */}
                {item.name === 'Inventario' && canSeeInventario && !collapsed && invSubOpen && (
                  <ul className="mt-1 mb-1 ml-5 pl-4 border-l-2 border-cyan-200 dark:border-cyan-700/40 space-y-0.5 anim-fade-in">
                    {invSubItems.map((sub) => {
                      const isActive = sub.path === '/inventario'
                        ? location.pathname === '/inventario'
                        : location.pathname === sub.path;
                      return (
                        <li key={sub.key}>
                          <button
                            onClick={() => navigate(sub.path)}
                            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 hover:translate-x-0.5 ${
                              isActive
                                ? 'bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400'
                                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                          >
                            <sub.icon className="h-3.5 w-3.5 shrink-0" />
                            <span className="whitespace-nowrap">{sub.label}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {/* Submenú de Conocimiento: Base de conocimiento y Directorio de Correo Corporativo */}
                {item.name === 'Conocimiento' && !collapsed && knowledgeSubOpen && (
                  <ul className="mt-1 mb-1 ml-5 pl-4 border-l-2 border-violet-200 dark:border-violet-700/40 space-y-0.5 anim-fade-in">
                    <li>
                      <button
                        onClick={() => navigate('/knowledge')}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 hover:translate-x-0.5 ${
                          location.pathname === '/knowledge'
                            ? 'bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400'
                            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        <BookOpen className="h-3.5 w-3.5 shrink-0" />
                        <span className="whitespace-nowrap">Base de Conocimiento</span>
                      </button>
                    </li>
                    {canSeeCorreoDirectory && (
                      <li>
                        <button
                          onClick={() => navigate('/knowledge/correos')}
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 hover:translate-x-0.5 ${
                            location.pathname === '/knowledge/correos'
                              ? 'bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400'
                              : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-800 dark:hover:text-slate-200'
                          }`}
                        >
                          <Mail className="h-3.5 w-3.5 shrink-0" />
                          <span className="whitespace-nowrap">Directorio de Correo Corporativo</span>
                        </button>
                      </li>
                    )}
                  </ul>
                )}
              </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        
        {/* User Section */}
        <div className={`p-3 border-t border-slate-200/50 dark:border-slate-800/50 shrink-0 ${collapsed ? 'px-2' : ''}`}>
          {!collapsed && (
            <div className="flex items-center gap-3 mb-3 px-1">
              {profileImage ? (
                <img
                  src={profileImage}
                  alt="Foto de perfil"
                  className="w-10 h-10 shrink-0 rounded-full object-cover border-2 border-white dark:border-slate-800 shadow-sm"
                />
              ) : (
                <div className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-sm border-2 border-white dark:border-slate-800 shadow-sm">
                  {user?.nombre?.charAt(0) || 'U'}{user?.apellidos?.charAt(0) || ''}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{user?.nombre} {user?.apellidos}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
              </div>
            </div>
          )}
          {collapsed && (
            <div
              className="flex justify-center mb-2 cursor-pointer"
              onMouseEnter={(e) => {
                setHoveredModule(null);
                setHoveredAction({
                  title: `${user?.nombre || ''} ${user?.apellidos || ''}`.trim() || 'Usuario',
                  subtitle: user?.email || '',
                  rect: e.currentTarget.getBoundingClientRect(),
                });
              }}
              onMouseLeave={() => setHoveredAction(null)}
            >
              {profileImage ? (
                <img
                  src={profileImage}
                  alt="Foto de perfil"
                  className="w-9 h-9 rounded-full object-cover border-2 border-white dark:border-slate-800 shadow-sm"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-xs border-2 border-white dark:border-slate-800 shadow-sm">
                  {user?.nombre?.charAt(0) || 'U'}
                </div>
              )}
            </div>
          )}
          <button 
            onClick={handleLogout}
            onMouseEnter={(e) => {
              if (collapsed) {
                setHoveredModule(null);
                setHoveredAction({
                  title: 'Cerrar Sesión',
                  subtitle: 'Salir del sistema',
                  rect: e.currentTarget.getBoundingClientRect(),
                  isDanger: true,
                });
              }
            }}
            onMouseLeave={() => setHoveredAction(null)}
            className={`w-full flex items-center gap-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 rounded-xl hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors ${
              collapsed ? 'justify-center px-2 py-2.5' : 'justify-center px-3 py-2.5'
            }`}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && 'Cerrar Sesión'}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-800/50 grid grid-cols-[1fr_auto_1fr] items-center px-4 lg:px-6 z-10 shrink-0">
          <div className="flex items-center gap-3 justify-self-start">
            {/* Mobile hamburger */}
            <button 
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 text-center truncate max-w-[38vw] lg:max-w-lg justify-self-center px-2">
            {isTicketDetail ? 'Detalle del Ticket' : currentTitle}
          </h2>
          <div className="flex items-center gap-2 justify-self-end">
            <GlobalSearch />
            <div className="hidden md:block text-right mr-1">
              <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 leading-tight">{greeting},</p>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200 leading-tight">{user?.nombre}</p>
            </div>
            <button
              onClick={toggleTheme}
              className="p-2.5 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all"
              title={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
            >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            {/* Icono de Chat / Mensajes con badge de no leídos en tiempo real */}
            <div className="relative" ref={chatRef}>
              <button
                onClick={() => {
                  const next = !chatOpen;
                  setChatOpen(next);
                  if (next) fetchChatUnread();
                }}
                title="Mensajes de chat"
                className="relative p-2.5 text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-all"
              >
                <MessageCircle className="h-5 w-5" />
                {totalUnread > 0 && (
                  <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full shadow-lg shadow-emerald-500/30 border-2 border-white dark:border-slate-900">
                    {totalUnread > 99 ? '99+' : totalUnread}
                  </span>
                )}
              </button>

              {chatOpen && (
                <div className="absolute right-0 top-full mt-2 w-[340px] sm:w-[380px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden anim-scale-in origin-top-right">
                  <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-500/25 shrink-0">
                        <MessageCircle className="w-4 h-4 text-white" />
                      </span>
                      <div>
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white">Mensajes de chat</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {totalUnread > 0
                            ? `${totalUnread} mensaje${totalUnread !== 1 ? 's' : ''} sin leer`
                            : 'Sin mensajes pendientes'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="overflow-y-auto max-h-[380px]">
                    {recentMessages.length === 0 ? (
                      <div className="py-10 text-center">
                        <MessageCircle className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                        <p className="text-sm text-slate-500 font-medium">Sin mensajes recientes</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Los mensajes nuevos aparecerán aquí al instante</p>
                      </div>
                    ) : (
                      recentMessages.map((chat, idx) => {
                        const unread = unreadByTicket[chat.ticketId]?.noLeidos ?? 0;
                        return (
                          <button
                            key={`${chat.mensajeId ?? idx}`}
                            onClick={() => {
                              setChatOpen(false);
                              clearTicketUnread(chat.ticketId);
                              navigate(`/tickets/${chat.ticketId}`);
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-50 dark:border-slate-800/50 last:border-0 group"
                          >
                            <div className="flex items-start gap-3">
                              <div className="mt-0.5 w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0 text-white font-bold text-xs shadow-sm shadow-emerald-500/25 overflow-hidden">
                                {(chat.remitenteNombre || chat.ticketCodigo || '?').charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2 mb-0.5">
                                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                    {chat.remitenteNombre || 'Usuario'}
                                  </p>
                                  {unread > 0 && (
                                    <span className="min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center text-[10px] font-black text-white bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full shadow-sm shrink-0">
                                      {unread > 9 ? '9+' : unread}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 truncate">
                                  {chat.ticketCodigo ?? `Ticket #${chat.ticketId}`}
                                  {chat.ticketTitulo ? ` · ${chat.ticketTitulo}` : ''}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed mt-0.5">
                                  {chat.contenido || (chat.adjuntoUrl ? '📎 Archivo adjunto' : 'Mensaje')}
                                </p>
                              </div>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Notification Bell */}
            <div className="relative" ref={notifRef}>
              <button 
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative p-2.5 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all"
              >
                <Bell className="h-5 w-5" />
                {notifications.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold text-white bg-gradient-to-r from-red-500 to-pink-500 rounded-full shadow-lg shadow-red-500/30 border-2 border-white dark:border-slate-900">
                    {notifications.length > 99 ? '99+' : notifications.length}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 w-[340px] sm:w-[380px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden anim-scale-in origin-top-right">
                  <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">Notificaciones</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {notifications.length > 0
                          ? `${notifications.length} novedad${notifications.length !== 1 ? 'es' : ''}`
                          : 'Todo al día'}
                      </p>
                    </div>
                    <button
                      onClick={fetchNotifications}
                      title="Actualizar"
                      className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                  </div>
                  {/* Filtros por categoría */}
                  {notifications.length > 0 && (
                    <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex flex-wrap gap-1.5">
                      {visibleNotifFilters.map((f) => (
                        <button
                          key={f.key}
                          onClick={() => setNotifFilter(f.key)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all duration-200 ${
                            notifFilter === f.key
                              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                        >
                          {f.label}
                          <span className={`min-w-[15px] h-[15px] px-0.5 inline-flex items-center justify-center rounded-full text-[9px] font-black ${
                            notifFilter === f.key ? 'bg-white/25 text-white' : 'bg-white dark:bg-slate-900'
                          }`}>
                            {f.count}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="overflow-y-auto max-h-[380px]">
                    {filteredNotifications.length === 0 ? (
                      <div className="py-10 text-center">
                        <Bell className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                        <p className="text-sm text-slate-500 font-medium">Sin notificaciones</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Tickets, contraseñas y registros aparecerán aquí</p>
                      </div>
                    ) : (
                      filteredNotifications.map((n, idx) => {
                        const cfg = notifConfig[n.type];
                        const Icon = cfg.icon;
                        const canManageUsers = hasPermission('USER_MANAGE');
                        const isPending = n.type === 'USER_PENDING' && n.refId != null;
                        return (
                          <div
                            key={`${n.type}-${n.refId}-${idx}`}
                            className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-50 dark:border-slate-800/50 last:border-0 group"
                          >
                            <button
                              onClick={() => handleNotifClick(n)}
                              className="w-full text-left flex items-start gap-3"
                            >
                              <div className={`mt-0.5 w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${cfg.classes}`}>
                                <Icon className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2 mb-0.5">
                                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                                    {n.title}
                                  </p>
                                  {n.date && (
                                    <span className="text-[10px] font-medium text-slate-400 shrink-0">{timeAgo(n.date)}</span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                                  {n.description}
                                </p>
                              </div>
                            </button>
                            {isPending && canManageUsers && (
                              <div className="flex items-center gap-2 mt-2 pl-11">
                                <button
                                  onClick={() => handleActivateUser(n.refId!)}
                                  disabled={processingNotif === n.refId}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-[11px] font-black shadow-sm shadow-emerald-500/30 hover:-translate-y-px active:scale-95 transition-all disabled:opacity-60 disabled:translate-y-0"
                                >
                                  {processingNotif === n.refId ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                  Activar
                                </button>
                                <button
                                  onClick={() => handleRejectUser(n.refId!)}
                                  disabled={processingNotif === n.refId}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 text-[11px] font-black hover:bg-red-50 dark:hover:bg-red-500/10 active:scale-95 transition-all disabled:opacity-60"
                                >
                                  <X className="w-3 h-3" />
                                  Rechazar
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Horizontal quick nav (desktop) */}
        <div className="hidden lg:flex items-center gap-2 px-6 py-2.5 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-800/50 overflow-x-auto shrink-0">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-300 active:scale-95 ${
                  isActive
                    ? `bg-gradient-to-r ${item.gradient} text-white shadow-md ${item.shadow}`
                    : 'text-slate-500 dark:text-slate-400 bg-slate-100/70 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-200'
                }`
              }
            >
              <item.icon className="w-3.5 h-3.5" />
              {item.name}
              {!!item.badge && item.badge > 0 && (
                <span className={`ml-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center text-[9px] font-black rounded-full ${
                  location.pathname === item.path ? 'bg-white/25 text-white' : 'bg-gradient-to-r from-red-500 to-pink-500 text-white'
                }`}>
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </div>

        <div className="flex-1 overflow-auto p-4 sm:p-6">
          <div key={location.pathname} className="max-w-7xl mx-auto anim-fade-in-up">
            <Outlet />
          </div>
        </div>
      </main>

      {/* Popover flotante con diseño estilizado cuando el sidebar está colapsado */}
      {collapsed && hoveredModule && (
        <div
          style={{
            position: 'fixed',
            left: `${getTooltipPosition(hoveredModule.rect, Boolean(hoveredModule.subItems?.length)).left}px`,
            top: `${getTooltipPosition(hoveredModule.rect, Boolean(hoveredModule.subItems?.length)).top}px`,
          }}
          onMouseEnter={() => {
            if (hoverTimeoutRef.current) {
              clearTimeout(hoverTimeoutRef.current);
              hoverTimeoutRef.current = null;
            }
          }}
          onMouseLeave={handleNavItemMouseLeave}
          className="z-[100] min-w-[220px] max-w-[280px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-700/80 rounded-2xl shadow-2xl shadow-slate-900/20 dark:shadow-black/70 p-3 select-none anim-fade-in pointer-events-auto"
        >
          {/* Flecha indicadora apuntando hacia el icono del sidebar */}
          <div
            style={{
              top: `${getTooltipPosition(hoveredModule.rect, Boolean(hoveredModule.subItems?.length)).arrowTop}px`,
            }}
            className="absolute -left-1.5 -translate-y-1/2 w-3 h-3 bg-white dark:bg-slate-900 border-l border-b border-slate-200/90 dark:border-slate-700/80 rotate-45 rounded-bl-[2px]"
          />

          {/* Encabezado del Módulo */}
          <div
            onClick={() => {
              navigate(hoveredModule.item.path);
              setHoveredModule(null);
            }}
            className="flex items-center gap-3 p-1.5 -m-1 rounded-xl cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-colors group"
          >
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${hoveredModule.item.gradient} flex items-center justify-center text-white shadow-md ${hoveredModule.item.shadow} shrink-0 transition-transform group-hover:scale-105`}>
              <hoveredModule.item.icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1.5">
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                  {hoveredModule.item.name}
                </h4>
                {location.pathname.startsWith(hoveredModule.item.path) && (
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shrink-0" title="Módulo activo" />
                )}
                {!!hoveredModule.item.badge && hoveredModule.item.badge > 0 && (
                  <span className="min-w-[18px] h-4 px-1.5 flex items-center justify-center text-[10px] font-black text-white bg-gradient-to-r from-red-500 to-pink-500 rounded-full shadow-sm shrink-0">
                    {hoveredModule.item.badge > 99 ? '99+' : hoveredModule.item.badge}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {moduleDescriptions[hoveredModule.item.name] || 'Módulo del sistema'}
              </p>
            </div>
          </div>

          {/* Si tiene submenú (Tickets, Tareas, Inventario, Conocimiento) */}
          {hoveredModule.subItems && hoveredModule.subItems.length > 0 && (
            <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-0.5">
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2 py-0.5">
                Accesos directos
              </p>
              {hoveredModule.subItems.map((sub) => {
                const isActive = sub.path
                  ? location.pathname === sub.path
                  : location.pathname === '/tickets' && location.search === sub.query;
                return (
                  <button
                    key={sub.key}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(sub.path || `/tickets${sub.query}`);
                      setHoveredModule(null);
                    }}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 font-semibold'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <sub.icon className="w-3.5 h-3.5 shrink-0 opacity-70" />
                    <span className="truncate flex-1 text-left">{sub.label}</span>
                    {sub.count != null && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold">
                        {sub.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Popover flotante para acciones del pie (Perfil / Logout) */}
      {collapsed && hoveredAction && (
        <div
          style={{
            position: 'fixed',
            left: `${hoveredAction.rect.right + 12}px`,
            top: `${hoveredAction.rect.top + hoveredAction.rect.height / 2}px`,
            transform: 'translateY(-50%)',
          }}
          className={`z-[100] min-w-[180px] backdrop-blur-xl border rounded-xl shadow-2xl p-2.5 select-none anim-fade-in pointer-events-none ${
            hoveredAction.isDanger
              ? 'bg-red-950/90 text-red-100 border-red-800/60 shadow-red-950/50'
              : 'bg-white/95 dark:bg-slate-900/95 text-slate-800 dark:text-slate-100 border-slate-200/90 dark:border-slate-700/80 shadow-slate-900/20'
          }`}
        >
          <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rotate-45 rounded-bl-[2px] bg-inherit border-l border-b border-inherit" />
          <p className="text-xs font-bold leading-tight truncate">{hoveredAction.title}</p>
          {hoveredAction.subtitle && (
            <p className="text-[11px] opacity-75 leading-tight truncate mt-0.5">{hoveredAction.subtitle}</p>
          )}
        </div>
      )}
    </div>
  );
}
