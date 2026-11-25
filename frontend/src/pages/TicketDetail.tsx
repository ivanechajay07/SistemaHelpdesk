import React, { useEffect, useId, useState, useRef } from 'react';
import { useDialogA11y } from '../lib/useDialogA11y';
import { useParams, useNavigate } from 'react-router-dom';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { ticketService } from '../services/ticketService';
import { session } from '../lib/session';
import { useAuthStore } from '../store/authStore';
import { useTicketStore } from '../store/ticketStore';
import type { Ticket } from '../store/ticketStore';
import ConfirmDialog, { type DialogVariant } from '../components/ui/ConfirmDialog';
import { useToast } from '../components/ui/Toast';
import { Send, ArrowLeft, Loader2, Paperclip, Bold, Italic, Underline, Strikethrough, Link as LinkIcon, Image as ImageIcon, MessageSquare, Smile, Code, List, AlignLeft, X, Lock, RotateCcw, Star, Check, CheckCheck, ClipboardCheck, Tag, Building2, MapPin, CalendarDays, Clock } from 'lucide-react';
import Button from '../components/ui/Button';
import { useChatNotificationsStore } from '../store/chatNotificationsStore';
import ActaModal from '../components/tickets/ActaModal';
import UserAvatar from '../components/ui/UserAvatar';

interface Message {
  id: number;
  contenido: string;
  fechaEnvio: string;
  remitenteId: number;
  remitenteNombre: string;
  adjuntoUrl?: string;
  leido?: boolean;
}

/** Orden cronológico estable: por fecha y, si empatan, por id. */
const ordenarMensajes = (lista: Message[]): Message[] =>
  [...lista].sort((a, b) => {
    const fa = new Date(a.fechaEnvio).getTime() || 0;
    const fb = new Date(b.fechaEnvio).getTime() || 0;
    return fa === fb ? (a.id ?? 0) - (b.id ?? 0) : fa - fb;
  });


export default function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token, user, isAdmin } = useAuthStore();
  const reactivateTicket = useTicketStore((state) => state.reactivateTicket);
  
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [showActa, setShowActa] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const linkDialogTitleId = useId();
  const linkDialogPanelRef = useDialogA11y(showLinkDialog, () => setShowLinkDialog(false));
  const stompClient = useRef<Client | null>(null);
  const primeraConexion = useRef(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const { clearTicketUnread } = useChatNotificationsStore();
  // Mensajes recibidos mientras la pestaña está en segundo plano: se marcan como leídos al volver
  const pendingReadRef = useRef(false);

  // "Escribiendo…" y presencia (en línea)
  const [typingName, setTypingName] = useState<string | null>(null);
  const [otherOnline, setOtherOnline] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingSentRef = useRef(false);
  const typingClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const presenceClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const presenceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /** Avisa por WebSocket si el usuario está escribiendo (efímero). */
  const notifyTyping = (typing: boolean) => {
    if (!stompClient.current?.connected) return;
    stompClient.current.publish({
      destination: `/app/chat/${id}/typing`,
      body: JSON.stringify({ typing }),
    });
  };

  const handleMessageChange = (value: string) => {
    setNewMessage(value);
    if (value.trim()) {
      if (!typingSentRef.current) {
        notifyTyping(true);
        typingSentRef.current = true;
      }
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        notifyTyping(false);
        typingSentRef.current = false;
      }, 2500);
    } else if (typingSentRef.current) {
      notifyTyping(false);
      typingSentRef.current = false;
    }
  };

  /** Marca los mensajes del ticket como leídos (REST) y limpia el badge global. */
  const markAsRead = async () => {
    if (!id) return;
    try {
      await ticketService.markMessagesRead(id);
      clearTicketUnread(Number(id));
      pendingReadRef.current = false;
    } catch {
      /* silencioso */
    }
  };

  useEffect(() => {
    if (!id) return;
    const fetchDetails = async () => {
      try {
        const [ticketRes, messagesRes] = await Promise.all([
          ticketService.getById(id),
          ticketService.getMessages(id)
        ]);
        setTicket(ticketRes.data);
        setMessages(ordenarMensajes(messagesRes.data));
        // Al abrir el detalle, todos los mensajes pendientes quedan leídos
        await markAsRead();
      } catch (err) {
        console.error('Error fetching ticket details', err);
        if ((err as any).response?.status === 404) {
           navigate('/tickets');
        } else {
           setLoadError(
             (err as any).response?.data?.message ||
             'No se pudo abrir el ticket. Puede que aún no tenga un técnico asignado.'
           );
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();

    const apiUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api/v1', '') : 'http://localhost:8081';
    const socket = new SockJS(`${apiUrl}/ws/chat`);

    // Al reconectar, recuperar lo que se haya perdido mientras no había socket.
    const sincronizarMensajes = async () => {
      try {
        const { data } = await ticketService.getMessages(id);
        setMessages(ordenarMensajes(data));
      } catch {
        /* sin red: se reintenta en la próxima reconexión */
      }
    };

    const client = new Client({
      webSocketFactory: () => socket,
      connectHeaders: {
        Authorization: `Bearer ${token}`
      },
      // Reintento automático: si el celular pierde red o vuelve del segundo plano.
      reconnectDelay: 4000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      beforeConnect: () => {
        // Usa el token más reciente: el access token se renueva cada 30 min.
        const actual = session.getToken();
        if (actual) {
          client.connectHeaders = { Authorization: `Bearer ${actual}` };
        }
      },
      onConnect: () => {
        client.subscribe(`/topic/ticket/${id}`, (message) => {
          const receivedMessage = JSON.parse(message.body);
          setMessages((prev) =>
            prev.some((m) => m.id === receivedMessage.id)
              ? prev
              : ordenarMensajes([...prev, receivedMessage])
          );
          if (receivedMessage.remitenteId !== user?.id) {
            if (document.visibilityState === 'visible') {
              markAsRead();
            } else {
              pendingReadRef.current = true;
            }
          }
        });

        // Recibo de lectura en tiempo real: el otro participante vio mis mensajes
        client.subscribe(`/topic/ticket/${id}/lectura`, (frame) => {
          try {
            const receipt = JSON.parse(frame.body);
            if (receipt.lectorId && receipt.lectorId !== user?.id) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.remitenteId === user?.id && !m.leido ? { ...m, leido: true } : m
                )
              );
            }
          } catch {
            /* payload inválido */
          }
        });

        // Indicador "escribiendo…" del otro participante
        client.subscribe(`/topic/ticket/${id}/typing`, (frame) => {
          try {
            const t = JSON.parse(frame.body);
            if (!t.usuarioId || t.usuarioId === user?.id) return;
            if (t.typing) {
              setTypingName(t.usuarioNombre || 'Alguien');
              if (typingClearRef.current) clearTimeout(typingClearRef.current);
              typingClearRef.current = setTimeout(() => setTypingName(null), 4000);
            } else {
              setTypingName(null);
            }
          } catch {
            /* payload inválido */
          }
        });

        // Presencia del otro participante
        client.subscribe(`/topic/ticket/${id}/presence`, (frame) => {
          try {
            const p = JSON.parse(frame.body);
            if (!p.usuarioId || p.usuarioId === user?.id) return;
            setOtherOnline(true);
            if (presenceClearRef.current) clearTimeout(presenceClearRef.current);
            presenceClearRef.current = setTimeout(() => setOtherOnline(false), 50000);
          } catch {
            /* payload inválido */
          }
        });

        // Anunciar la presencia propia de forma periódica mientras se ve el ticket
        const announcePresence = () => {
          if (client.connected) {
            client.publish({ destination: `/app/chat/${id}/presence`, body: '{}' });
          }
        };
        announcePresence();
        presenceIntervalRef.current = setInterval(announcePresence, 25000);

        // En la primera conexión el historial ya se cargó al abrir; en las
        // reconexiones se sincroniza para no perder mensajes.
        if (primeraConexion.current) {
          primeraConexion.current = false;
        } else {
          void sincronizarMensajes();
        }
      },
      onStompError: (frame) => {
        console.error('Broker reported error: ' + frame.headers['message']);
      }
    });

    client.activate();
    stompClient.current = client;

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      if (pendingReadRef.current) {
        markAsRead();
      }
      // Al volver del segundo plano: reanudar el socket y ponerse al día.
      if (stompClient.current && !stompClient.current.connected) {
        void sincronizarMensajes();
        stompClient.current.activate();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onVisible);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onVisible);
      if (presenceIntervalRef.current) clearInterval(presenceIntervalRef.current);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (typingClearRef.current) clearTimeout(typingClearRef.current);
      if (presenceClearRef.current) clearTimeout(presenceClearRef.current);
      if (stompClient.current) {
        stompClient.current.deactivate();
      }
    };
  }, [id, token, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!showEmojiPicker) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmojiPicker]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (isChatDisabled || sending) return;
    const texto = newMessage.trim();
    if (!texto) return;

    if (stompClient.current?.connected) {
      stompClient.current.publish({
        destination: `/app/chat/${id}`,
        body: JSON.stringify({
          contenido: texto,
          ticketId: Number(id),
          remitenteId: user?.id,
        }),
      });
    } else {
      // Respaldo REST: el backend difunde a la sala igual que por WebSocket.
      setSending(true);
      ticketService.sendMessage(id!, texto)
        .then(({ data }) => {
          setMessages((prev) =>
            prev.some((m) => m.id === data.id) ? prev : ordenarMensajes([...prev, data]),
          );
        })
        .catch((err: any) => {
          toast({
            variant: 'error',
            title: 'No se pudo enviar el mensaje',
            message:
              err?.response?.data?.message ||
              'Revisa tu conexión e inténtalo de nuevo.',
          });
        })
        .finally(() => setSending(false));
    }

    // Dejar de indicar "escribiendo" al enviar
    notifyTyping(false);
    typingSentRef.current = false;
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    setNewMessage('');
  };

  const insertFormatting = (prefix: string, suffix: string = '') => {
    const textarea = document.getElementById('chat-textarea') as HTMLTextAreaElement;
    if (!textarea) {
      setNewMessage(prev => prev + prefix + suffix);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = newMessage;
    const before = text.substring(0, start);
    const selected = text.substring(start, end);
    const after = text.substring(end);

    setNewMessage(`${before}${prefix}${selected}${suffix}${after}`);
    
    setTimeout(() => {
      textarea.focus();
      const newStart = start + prefix.length;
      const newEnd = end + prefix.length;
      textarea.setSelectionRange(selected ? newEnd : newStart, selected ? newEnd : newStart);
    }, 0);
  };

  const renderMessageContent = (text: string, isMe: boolean) => {
    const parts: React.ReactNode[] = [];
    const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|__(.+?)__|~~(.+?)~~|`([^`]+)`|(\[([^\]]+)\]\(([^)]+)\))|(https?:\/\/[^\s]+))/g;
    let lastIndex = 0;
    let match;
    let key = 0;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(<span key={key++}>{text.slice(lastIndex, match.index)}</span>);
      }

      if (match[2]) {
        parts.push(<strong key={key++} className="font-extrabold">{match[2]}</strong>);
      } else if (match[3]) {
        parts.push(<em key={key++} className="italic">{match[3]}</em>);
      } else if (match[4]) {
        parts.push(<span key={key++} className="underline">{match[4]}</span>);
      } else if (match[5]) {
        parts.push(<span key={key++} className="line-through opacity-70">{match[5]}</span>);
      } else if (match[6]) {
        parts.push(
          <code key={key++} className={`px-1.5 py-0.5 rounded text-xs font-mono ${
            isMe ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-700'
          }`}>{match[6]}</code>
        );
      } else if (match[7]) {
        parts.push(
          <a key={key++} href={match[8]} target="_blank" rel="noopener noreferrer"
            className={`underline font-medium ${isMe ? 'text-white hover:text-blue-200' : 'text-blue-600 dark:text-blue-400 hover:text-blue-800'}`}>
            {match[7]}
          </a>
        );
      } else if (match[9]) {
        parts.push(
          <a key={key++} href={match[9]} target="_blank" rel="noopener noreferrer"
            className={`underline font-medium break-all ${isMe ? 'text-white hover:text-blue-200' : 'text-blue-600 dark:text-blue-400 hover:text-blue-800'}`}>
            {match[9]}
          </a>
        );
      }

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push(<span key={key++}>{text.slice(lastIndex)}</span>);
    }

    return parts.length > 0 ? parts : text;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || isChatDisabled || !stompClient.current?.connected) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await ticketService.uploadAttachment(formData);
      const fileUrl = response.data;

      const chatMessage = {
        contenido: `Archivo adjunto: ${file.name}`,
        ticketId: Number(id),
        remitenteId: user?.id,
        adjuntoUrl: fileUrl
      };

      stompClient.current.publish({
        destination: `/app/chat/${id}`,
        body: JSON.stringify(chatMessage)
      });
    } catch (error) {
      console.error('Error uploading file', error);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const getAttachmentUrl = (url: string | undefined) => {
    if (!url) return '';
    let parsedUrl = url.replace('localhost:8080', 'localhost:8081');
    if (!parsedUrl.startsWith('http')) {
      const apiUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api/v1', '') : 'http://localhost:8081';
      parsedUrl = parsedUrl.startsWith('/') ? `${apiUrl}${parsedUrl}` : `${apiUrl}/${parsedUrl}`;
    }
    return parsedUrl;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'NUEVO': return 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400';
      case 'ASIGNADO': return 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400';
      case 'EN_PROCESO': return 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400';
      case 'EN_REVISION': return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400';
      case 'RESUELTO': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400';
      case 'CERRADO': return 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400';
      default: return 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICA': return 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400';
      case 'ALTA': return 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400';
      case 'MEDIA': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-400';
      case 'BAJA': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400';
      default: return 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400';
    }
  };

  const isChatDisabled = !!ticket && ['RESUELTO', 'CERRADO', 'CANCELADO'].includes(ticket.estado);

  // Índice del último mensaje propio para mostrar el recibo de lectura
  let lastOwnMsgIndex = -1;
  messages.forEach((m, i) => {
    if (m.remitenteId === user?.id) lastOwnMsgIndex = i;
  });

  const chatDisabledMessage =
    ticket?.estado === 'RESUELTO' ? 'El chat está deshabilitado porque el ticket está resuelto.' :
    ticket?.estado === 'CANCELADO' ? 'El chat está deshabilitado porque el ticket fue cancelado.' :
    'El chat está deshabilitado porque el ticket está cerrado.';

  const chatDateLabel = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    const yest = new Date();
    yest.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Hoy';
    if (d.toDateString() === yest.toDateString()) return 'Ayer';
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  };
  const canReactivate = ticket?.estado === 'CERRADO' && !!user && (
    isAdmin() || ticket.usuarioId === user.id || ticket.tecnicoId === user.id
  );
  const canActa = !!ticket && ['RESUELTO', 'CERRADO'].includes(ticket.estado) && !!user && (
    isAdmin() || ticket.usuarioId === user.id || ticket.tecnicoId === user.id
  );

  const slaInfo = (() => {
    if (!ticket) return null;
    const estado = ticket.slaEstado;
    const rest = ticket.slaHorasRestantes;
    const tone =
      estado === 'VENCIDO'
        ? 'text-rose-600 dark:text-rose-400'
        : estado === 'POR_VENCER'
          ? 'text-amber-600 dark:text-amber-400'
          : estado === 'CUMPLIDO'
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-blue-600 dark:text-blue-400';
    const label =
      estado === 'VENCIDO'
        ? 'SLA vencido'
        : estado === 'CUMPLIDO'
          ? 'SLA cumplido'
          : typeof rest === 'number'
            ? rest >= 24
              ? `${Math.floor(rest / 24)}d ${Math.round(rest % 24)}h restantes`
              : `${Math.max(0, Math.round(rest))}h restantes`
            : ticket.fechaVencimientoSla
              ? new Date(ticket.fechaVencimientoSla).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })
              : 'Sin SLA definido';
    const bar =
      estado === 'VENCIDO'
        ? 'bg-rose-500'
        : estado === 'POR_VENCER'
          ? 'bg-amber-500'
          : estado === 'CUMPLIDO'
            ? 'bg-emerald-500'
            : 'bg-blue-500';
    const limit = ticket.slaLimiteHoras ?? null;
    const progress =
      limit && limit > 0 && typeof rest === 'number'
        ? Math.min(100, Math.max(0, Math.round(((limit - rest) / limit) * 100)))
        : null;
    return { tone, label, bar, progress };
  })();

  const infoRows: { icon: React.ElementType; label: string; value: string }[] = ticket
    ? [
        {
          icon: Tag,
          label: 'Categoría',
          value: [ticket.categoriaNombre, ticket.subcategoriaNombre].filter(Boolean).join(' · ') || '—',
        },
        { icon: Building2, label: 'Entidad', value: ticket.entidad || '—' },
        { icon: MapPin, label: 'Sede', value: ticket.sede || '—' },
        {
          icon: CalendarDays,
          label: 'Creado',
          value: ticket.fechaCreacion
            ? new Date(ticket.fechaCreacion).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })
            : '—',
        },
      ]
    : [];

  const [dialog, setDialog] = useState<{
    variant: DialogVariant;
    title: string;
    message: string;
    confirmText?: string;
    onConfirm?: () => void;
  } | null>(null);
  const toast = useToast();

  const handleReactivate = () => {
    if (!id) return;
    setDialog({
      variant: 'info',
      title: 'Reactivar ticket',
      message: 'El estado cambiará a "En Revisión" y el chat se habilitará nuevamente para ambos usuarios.',
      confirmText: 'Sí, reactivar',
      onConfirm: async () => {
        setDialog(null);
        try {
          await reactivateTicket(Number(id));
          const res = await ticketService.getById(id);
          setTicket(res.data);
          toast({
            variant: 'success',
            title: 'Ticket reactivado',
            message: 'El ticket pasó a "En Revisión" y el chat se habilitó nuevamente.',
          });
        } catch (err) {
          console.error(err);
          setDialog({
            variant: 'error',
            title: 'Error al reactivar',
            message: 'No se pudo reactivar el ticket. Verifica tu conexión e inténtalo nuevamente.',
          });
        }
      }
    });
  };

  if (loadError) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-3 max-w-md text-center px-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-500/15 flex items-center justify-center">
            <Lock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{loadError}</p>
          <button
            onClick={() => navigate('/tickets')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a tickets
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-sm text-slate-500 font-medium">Cargando ticket...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">

      {/* ===== Cabecera del ticket ===== */}
      <div className="relative overflow-hidden rounded-panel border border-slate-200/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/70 p-5 sm:p-6 shadow-sm ring-1 ring-slate-900/5 anim-fade-in-up">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 via-cyan-400 to-emerald-400" />
        <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-blue-400/10 dark:bg-blue-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3 min-w-0">
            <button
              onClick={() => navigate('/tickets')}
              aria-label="Volver a tickets"
              className="mt-0.5 p-2 -ml-1 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-black font-mono text-slate-500 dark:text-slate-400">
                  {ticket?.codigo}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide ${getStatusColor(ticket?.estado || '')}`}>
                  {ticket?.estado?.replace('_', ' ')}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide ${getPriorityColor(ticket?.prioridad || '')}`}>
                  {ticket?.prioridad}
                </span>
              </div>
              <h1 className="mt-2 text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
                {ticket?.titulo}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-white text-[9px] font-black flex items-center justify-center">
                    {(ticket?.solicitanteNombre || 'C').charAt(0)}
                  </span>
                  {ticket?.solicitanteNombre || 'Solicitante'}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[9px] font-black flex items-center justify-center">
                    {(ticket?.tecnicoNombre || 'S').charAt(0)}
                  </span>
                  {ticket?.tecnicoNombre || 'Sin asignar'}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5" />
                  {ticket?.fechaCreacion ? new Date(ticket.fechaCreacion).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {canActa && (
              <Button
                onClick={() => setShowActa(true)}
                variant="secondary"
                leftIcon={<ClipboardCheck className="w-4 h-4" />}
                className="border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-500/20"
              >
                Acta de Conformidad
              </Button>
            )}
            {canReactivate && (
              <Button
                onClick={handleReactivate}
                variant="secondary"
                leftIcon={<RotateCcw className="w-4 h-4" />}
                className="border-cyan-200 dark:border-cyan-500/30 bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-100 dark:hover:bg-cyan-500/20"
              >
                Reactivar ticket
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_350px]">

      {/* Chat Container */}
      <div className="flex h-[62dvh] min-h-[360px] max-h-[620px] flex-col overflow-hidden rounded-panel border border-slate-200/80 bg-white/90 shadow-sm ring-1 ring-slate-900/5 dark:border-slate-800 dark:bg-slate-900/80 anim-fade-in-up lg:h-[calc(100dvh-19rem)] lg:min-h-[520px] lg:max-h-[880px]">

        {/* Encabezado del chat: participante + presencia / escribiendo */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-blue-50 via-white to-white dark:from-blue-500/10 dark:via-slate-900 dark:to-slate-900 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <UserAvatar
                userId={ticket?.usuarioId === user?.id ? ticket?.tecnicoId : ticket?.usuarioId}
                name={ticket?.usuarioId === user?.id ? ticket?.tecnicoNombre : ticket?.solicitanteNombre}
                size={40}
              />
              <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 ${otherOnline ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                {ticket?.usuarioId === user?.id ? (ticket?.tecnicoNombre || 'Sin asignar') : (ticket?.solicitanteNombre || 'Cliente')}
              </p>
              <p className={`text-[11px] font-semibold flex items-center gap-1.5 ${typingName ? 'text-blue-600 dark:text-blue-400' : otherOnline ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
                {typingName ? (
                  <>
                    <span className="flex items-center gap-0.5">
                      <span className="w-1 h-1 rounded-full bg-current animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1 h-1 rounded-full bg-current animate-bounce" style={{ animationDelay: '120ms' }} />
                      <span className="w-1 h-1 rounded-full bg-current animate-bounce" style={{ animationDelay: '240ms' }} />
                    </span>
                    escribiendo…
                  </>
                ) : otherOnline ? (
                  <><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> En línea</>
                ) : (
                  <><span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" /> Desconectado</>
                )}
              </p>
            </div>
          </div>

          {ticket && (
            <div className="hidden sm:flex items-center gap-2 shrink-0">
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-mono">{ticket.codigo}</span>
              <span className="text-[10px] font-black uppercase tracking-wide px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                {ticket.estado.replace('_', ' ')}
              </span>
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-4 bg-slate-50/50 dark:bg-slate-950/30">

          {/* System Message */}
          <div className="flex justify-center">
            <span className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 rounded-full text-[11px] font-bold flex items-center gap-1.5 shadow-sm">
              <MessageSquare className="w-3 h-3" />
              Chat iniciado · {new Date(ticket?.fechaCreacion || Date.now()).toLocaleDateString()}
            </span>
          </div>

          {messages.length === 0 && (
            <div className="text-center text-slate-400 dark:text-slate-500 mt-12">
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <MessageSquare className="w-7 h-7 opacity-40" />
              </div>
              <p className="font-semibold text-sm text-slate-500 dark:text-slate-400">No hay mensajes aún</p>
              <p className="text-xs mt-1">Escribe algo para comenzar la conversación</p>
            </div>
          )}

          {messages.map((msg, idx) => {
            const isMe = msg.remitenteId === user?.id;
            const prev = messages[idx - 1];
            const showDate = !prev || new Date(prev.fechaEnvio).toDateString() !== new Date(msg.fechaEnvio).toDateString();
            return (
              <div key={idx} className="space-y-3">
                {showDate && (
                  <div className="flex justify-center">
                    <span className="px-3 py-1 rounded-full bg-slate-200/70 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-wider">
                      {chatDateLabel(msg.fechaEnvio)}
                    </span>
                  </div>
                )}
                <div className={`flex ${isMe ? 'flex-row-reverse' : 'flex-row'} items-end gap-2.5`}>
                  {/* Avatar */}
                  {!isMe && <UserAvatar userId={msg.remitenteId} name={msg.remitenteNombre} size={30} />}

                  {/* Message Body */}
                  <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[82%] lg:max-w-[70%]`}>
                    <div className={`flex items-baseline gap-2 mb-1 ${isMe ? 'flex-row-reverse' : 'flex-row'} px-1`}>
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                        {isMe ? 'Tú' : msg.remitenteNombre}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                        {new Date(msg.fechaEnvio).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>

                    <div className={`px-4 py-2.5 shadow-sm text-sm leading-relaxed ${
                      isMe
                        ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl rounded-br-md shadow-blue-500/20'
                        : 'bg-white border border-slate-200 text-slate-800 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 rounded-2xl rounded-bl-md'
                    }`}>
                      <div className="whitespace-pre-wrap break-words">{renderMessageContent(msg.contenido, isMe)}</div>

                      {/* Attachment */}
                      {msg.adjuntoUrl && (
                        <div className={`mt-2 ${msg.contenido.trim() && !msg.contenido.includes('Archivo adjunto') ? 'pt-2 border-t border-white/20 dark:border-slate-700/60' : ''}`}>
                           <a href={getAttachmentUrl(msg.adjuntoUrl)} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-2.5 p-2.5 rounded-xl transition-colors shadow-sm group ${
                             isMe
                               ? 'bg-white/10 hover:bg-white/20 border border-white/20'
                               : 'bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-400'
                           }`}>
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                isMe ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:text-blue-500'
                              } transition-colors`}>
                                 {msg.adjuntoUrl.split('?')[0].match(/\.(jpeg|jpg|gif|png|webp)$/i) ? <ImageIcon className="w-4 h-4" /> : <Paperclip className="w-4 h-4" />}
                              </div>
                              <div>
                                 <p className={`text-xs font-bold max-w-[160px] truncate ${isMe ? 'text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                                   {msg.adjuntoUrl.split('/').pop()?.split('?')[0].split('_').pop() || 'Archivo adjunto'}
                                 </p>
                                 <p className={`text-[10px] font-semibold mt-0.5 ${isMe ? 'text-white/70' : 'text-slate-500 dark:text-slate-400'}`}>Click para abrir</p>
                              </div>
                           </a>
                        </div>
                       )}
                     </div>

                     {/* Recibo de lectura del último mensaje propio */}
                     {isMe && idx === lastOwnMsgIndex && (
                       <span className={`mt-1 px-1 inline-flex items-center gap-1 text-[10px] font-bold transition-colors ${
                         msg.leido ? 'text-emerald-500 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'
                       }`}>
                         {msg.leido ? (
                           <><CheckCheck className="w-3.5 h-3.5" />Visto</>
                         ) : (
                           <><Check className="w-3.5 h-3.5" />Enviado</>
                         )}
                       </span>
                     )}
                   </div>
                 </div>
               </div>
             );
           })}
          {typingName && (
            <div className="flex items-end gap-2.5 anim-fade-in">
              <div className="w-[30px] h-[30px] rounded-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold text-xs shrink-0">
                {typingName.charAt(0).toUpperCase()}
              </div>
              <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-white border border-slate-200 dark:bg-slate-800 dark:border-slate-700 shadow-sm">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input */}
        <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0">
          <form onSubmit={handleSendMessage} className="p-3 sm:p-4">
             {isChatDisabled && (
               <div className="flex items-center justify-center gap-2 py-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
                 <Lock className="w-4 h-4 shrink-0" />
                 {chatDisabledMessage}
               </div>
             )}
             {!isChatDisabled && (<>
             {/* Toolbar */}
             <div className="flex items-center gap-0.5 text-slate-400 dark:text-slate-500 mb-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl px-2 py-1.5 border border-slate-100 dark:border-slate-700/50">
                {/* Text Formatting Group */}
                <div className="flex items-center gap-0.5">
                  <button type="button" onClick={() => insertFormatting('**', '**')} className="p-1.5 hover:bg-white dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition-all" title="Negrita (Ctrl+B)"><Bold className="w-4 h-4" /></button>
                  <button type="button" onClick={() => insertFormatting('*', '*')} className="p-1.5 hover:bg-white dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition-all" title="Cursiva (Ctrl+I)"><Italic className="w-4 h-4" /></button>
                  <button type="button" onClick={() => insertFormatting('__', '__')} className="p-1.5 hover:bg-white dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition-all" title="Subrayado"><Underline className="w-4 h-4" /></button>
                  <button type="button" onClick={() => insertFormatting('~~', '~~')} className="p-1.5 hover:bg-white dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition-all" title="Tachado"><Strikethrough className="w-4 h-4" /></button>
                </div>

                <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1.5"></div>

                {/* Structure Group */}
                <div className="flex items-center gap-0.5">
                  <button type="button" onClick={() => insertFormatting('`', '`')} className="p-1.5 hover:bg-white dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition-all" title="Código en línea"><Code className="w-4 h-4" /></button>
                  <button type="button" onClick={() => insertFormatting('\n> ', '')} className="p-1.5 hover:bg-white dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition-all" title="Cita"><AlignLeft className="w-4 h-4" /></button>
                  <button type="button" onClick={() => insertFormatting('\n- ', '')} className="p-1.5 hover:bg-white dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition-all" title="Lista"><List className="w-4 h-4" /></button>
                </div>

                <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1.5"></div>

                {/* Insert Group */}
                <div className="flex items-center gap-0.5 relative" ref={emojiPickerRef}>
                  <button type="button" onClick={() => { setLinkText(''); setLinkUrl(''); setShowLinkDialog(true); }} className="p-1.5 hover:bg-white dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition-all" title="Insertar enlace"><LinkIcon className="w-4 h-4" /></button>
                  <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className={`p-1.5 hover:bg-white dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition-all ${showEmojiPicker ? 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200' : ''}`} title="Emoticonos"><Smile className="w-4 h-4" /></button>
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="p-1.5 hover:bg-white dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition-all" title="Adjuntar archivo"><Paperclip className="w-4 h-4" /></button>

                  {/* Emoji Picker Dropdown */}
                  {showEmojiPicker && (
                    <div className="absolute bottom-full left-0 mb-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 p-3">
                      <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Emoticonos</div>
                      <div className="grid grid-cols-8 gap-0.5 max-h-48 overflow-y-auto">
                        {['😀','😃','😄','😁','😅','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚','😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🤩','🥳','😏','😒','😞','😔','😟','😕','🙁','😣','😖','😫','😩','🥺','😢','😭','😤','😠','😡','🤬','🤯','😳','😦','😧','😨','😰','😥','😓','🤗','🤔','🫣','🤭','🤫','🤥','😶','😐','😑','😬','🙄','😯','😮','😲','🥱','😴','🤤','😪','😵','🤐','🥴','🤢','🤮','🥵','🥶','🤠','🥳','🥸','😕','😟','🙁','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','👍','👎','👏','🙌','🤝','💪','❤️','🔥','⭐','✅','❌','💯','🎉','🚀','💡','📎','📌','🔗','💬','📝','🔔','⏰','⚡'].map((emoji) => (
                          <button key={emoji} type="button" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); insertFormatting(emoji); setShowEmojiPicker(false); }} className="w-8 h-8 flex items-center justify-center text-lg hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer">
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="ml-auto">
                  <span className="text-[10px] font-semibold text-slate-300 dark:text-slate-600 hidden sm:inline">Shift+Enter nueva línea</span>
                </div>
             </div>

             {/* Link Dialog */}
             {showLinkDialog && (
                <div className="modal-safe fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-slate-900/70 backdrop-blur-md p-3 anim-fade-in">
                  <div
                    ref={linkDialogPanelRef}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby={linkDialogTitleId}
                    tabIndex={-1}
                    className="my-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-md p-4 sm:p-6 anim-scale-in focus:outline-none"
                  >
                   <div className="flex items-center justify-between mb-5">
                     <h3 id={linkDialogTitleId} className="text-base font-bold text-slate-900 dark:text-white">Insertar enlace</h3>
                     <button onClick={() => setShowLinkDialog(false)} aria-label="Cerrar diálogo de enlace" className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><X className="w-4 h-4" /></button>
                   </div>
                   <div className="space-y-3">
                     <div>
                       <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Texto a mostrar</label>
                       <input type="text" value={linkText} onChange={(e) => setLinkText(e.target.value)} placeholder="Ejemplo: haz clic aquí" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition-all" />
                     </div>
                     <div>
                       <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">URL del enlace</label>
                       <input type="url" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://ejemplo.com" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition-all" />
                     </div>
                   </div>
                   <div className="flex justify-end gap-2 mt-5">
                     <button onClick={() => setShowLinkDialog(false)} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">Cancelar</button>
                     <button onClick={() => { if (linkUrl.trim()) { insertFormatting(`[${linkText || linkUrl}](${linkUrl.trim()})`); setShowLinkDialog(false); } }} disabled={!linkUrl.trim()} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors shadow-md shadow-blue-500/20">Insertar</button>
                   </div>
                 </div>
               </div>
             )}
             
             {/* Input Area */}
             <div className="flex items-end gap-2">
               <button
                 type="button"
                 onClick={() => fileInputRef.current?.click()}
                 className="p-2.5 rounded-xl text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all shrink-0"
                 title="Adjuntar archivo"
               >
                 <Paperclip className="w-5 h-5" />
               </button>
               <textarea
                 id="chat-textarea"
                 value={newMessage}
                 onChange={(e) => handleMessageChange(e.target.value)}
                 onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                       e.preventDefault();
                       handleSendMessage(e);
                    }
                    if (e.ctrlKey && e.key === 'b') { e.preventDefault(); insertFormatting('**', '**'); }
                    if (e.ctrlKey && e.key === 'i') { e.preventDefault(); insertFormatting('*', '*'); }
                 }}
                 placeholder="Escribe tu respuesta... (Enter para enviar, Shift+Enter para nueva línea)"
                 className="flex-1 resize-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-2.5 outline-none text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 min-h-[44px] max-h-[120px] focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
               />
               <button
                 type="submit"
                 disabled={(!newMessage.trim() && !uploading) || uploading}
                 className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-full transition-all shadow-lg shadow-blue-500/30 shrink-0 active:scale-95"
               >
                 {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
               </button>
             </div>

             <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
             </>)}
          </form>
        </div>
      </div>

        {/* ===== Panel de información ===== */}
        <aside className="flex flex-col gap-4 anim-fade-in-up lg:sticky lg:top-5">

          {/* Descripción */}
          <section className="rounded-card border border-slate-200/80 bg-white/90 p-4 shadow-sm ring-1 ring-slate-900/5 dark:border-slate-800 dark:bg-slate-900/70">
            <h2 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
              <AlignLeft className="h-3.5 w-3.5" /> Descripción
            </h2>
            <p className="mt-2.5 whitespace-pre-wrap text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">
              {ticket?.descripcion || 'Sin descripción registrada.'}
            </p>
          </section>

          {/* Detalles */}
          <section className="rounded-card border border-slate-200/80 bg-white/90 p-4 shadow-sm ring-1 ring-slate-900/5 dark:border-slate-800 dark:bg-slate-900/70">
            <h2 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
              <Tag className="h-3.5 w-3.5" /> Detalles
            </h2>
            <dl className="mt-3 space-y-3">
              {infoRows.map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0">
                    <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">{label}</dt>
                    <dd className="truncate text-xs font-semibold text-slate-700 dark:text-slate-200">{value}</dd>
                  </div>
                </div>
              ))}
            </dl>
          </section>

          {/* SLA */}
          <section className="rounded-card border border-slate-200/80 bg-white/90 p-4 shadow-sm ring-1 ring-slate-900/5 dark:border-slate-800 dark:bg-slate-900/70">
            <h2 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
              <Clock className="h-3.5 w-3.5" /> Acuerdo de servicio
            </h2>
            <p className={`mt-2 text-base font-black ${slaInfo?.tone ?? 'text-slate-500'}`}>{slaInfo?.label ?? '—'}</p>
            {ticket?.fechaVencimientoSla && (
              <p className="mt-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                Límite: {new Date(ticket.fechaVencimientoSla).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            )}
            {slaInfo?.progress != null && (
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div className={`h-full rounded-full transition-all ${slaInfo.bar}`} style={{ width: `${slaInfo.progress}%` }} />
              </div>
            )}
          </section>

          {/* CSAT */}
          {ticket?.calificacion != null && (
            <section className="rounded-card border border-cyan-200/70 bg-gradient-to-br from-cyan-50 to-blue-50 p-4 shadow-sm dark:border-cyan-500/20 dark:from-cyan-500/10 dark:to-blue-500/10">
              <h2 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.12em] text-cyan-600 dark:text-cyan-400">
                <Star className="h-3.5 w-3.5" /> Calificación del cliente
              </h2>
              <div className="mt-2 flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className={`h-4 w-4 ${i <= (ticket.calificacion || 0) ? 'text-amber-400 fill-amber-400' : 'text-slate-300 dark:text-slate-600'}`} />
                ))}
                <span className="ml-2 text-xs font-bold text-slate-600 dark:text-slate-300">{ticket.calificacion}/5</span>
              </div>
              {ticket.comentarioCliente && (
                <p className="mt-1.5 text-xs italic leading-relaxed text-slate-500 dark:text-slate-400">“{ticket.comentarioCliente}”</p>
              )}
            </section>
          )}
        </aside>
      </div>

      <ConfirmDialog
        isOpen={!!dialog}
        variant={dialog?.variant || 'info'}
        title={dialog?.title || ''}
        message={dialog?.message || ''}
        confirmText={dialog?.confirmText}
        onConfirm={dialog?.onConfirm}
        onClose={() => setDialog(null)}
      />

      <ActaModal isOpen={showActa} onClose={() => setShowActa(false)} ticket={ticket} />
    </div>
  );
}
