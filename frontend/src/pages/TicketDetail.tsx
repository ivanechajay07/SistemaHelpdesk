import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import api from '../lib/axios';
import { useAuthStore } from '../store/authStore';
import { useTicketStore } from '../store/ticketStore';
import type { Ticket } from '../store/ticketStore';
import ConfirmDialog, { type DialogVariant } from '../components/ui/ConfirmDialog';
import { useToast } from '../components/ui/Toast';
import { Send, ArrowLeft, Loader2, Paperclip, Bold, Italic, Underline, Strikethrough, Link as LinkIcon, Image as ImageIcon, MessageSquare, Smile, Code, List, AlignLeft, X, Lock, RotateCcw, Star, Check, CheckCheck } from 'lucide-react';
import { useChatNotificationsStore } from '../store/chatNotificationsStore';

interface Message {
  id: number;
  contenido: string;
  fechaEnvio: string;
  remitenteId: number;
  remitenteNombre: string;
  adjuntoUrl?: string;
  leido?: boolean;
}

export default function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token, user, isAdmin } = useAuthStore();
  const reactivateTicket = useTicketStore((state) => state.reactivateTicket);
  
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const stompClient = useRef<Client | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const { clearTicketUnread } = useChatNotificationsStore();
  // Mensajes recibidos mientras la pestaña está en segundo plano: se marcan como leídos al volver
  const pendingReadRef = useRef(false);

  /** Marca los mensajes del ticket como leídos (REST) y limpia el badge global. */
  const markAsRead = async () => {
    try {
      await api.post(`/tickets/${id}/messages/read`);
      clearTicketUnread(Number(id));
      pendingReadRef.current = false;
    } catch {
      /* silencioso */
    }
  };

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const [ticketRes, messagesRes] = await Promise.all([
          api.get(`/tickets/${id}`),
          api.get(`/tickets/${id}/messages`)
        ]);
        setTicket(ticketRes.data);
        setMessages(messagesRes.data);
        // Al abrir el detalle, todos los mensajes pendientes quedan leídos
        await markAsRead();
      } catch (err) {
        console.error('Error fetching ticket details', err);
        if ((err as any).response?.status === 404) {
           navigate('/tickets');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();

    const apiUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api/v1', '') : 'http://localhost:8081';
    const socket = new SockJS(`${apiUrl}/ws/chat`);
    const client = new Client({
      webSocketFactory: () => socket,
      connectHeaders: {
        Authorization: `Bearer ${token}`
      },
      onConnect: () => {
        client.subscribe(`/topic/ticket/${id}`, (message) => {
          const receivedMessage = JSON.parse(message.body);
          setMessages((prev) =>
            prev.some((m) => m.id === receivedMessage.id)
              ? prev
              : [...prev, receivedMessage]
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
      },
      onStompError: (frame) => {
        console.error('Broker reported error: ' + frame.headers['message']);
      }
    });

    client.activate();
    stompClient.current = client;

    const onVisible = () => {
      if (document.visibilityState === 'visible' && pendingReadRef.current) {
        markAsRead();
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
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
    if (isChatDisabled) return;
    if (!newMessage.trim() || !stompClient.current?.connected) return;

    const chatMessage = {
      contenido: newMessage,
      ticketId: Number(id),
      remitenteId: user?.id
    };

    stompClient.current.publish({
      destination: `/app/chat/${id}`,
      body: JSON.stringify(chatMessage)
    });

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
      const response = await api.post('/chat/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
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
      case 'ASIGNADO': return 'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400';
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
  const canReactivate = ticket?.estado === 'CERRADO' && !!user && (
    isAdmin() || ticket.usuarioId === user.id || ticket.tecnicoId === user.id
  );

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
          const res = await api.get(`/tickets/${id}`);
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
    <div className="flex flex-col gap-4 h-[calc(100vh-8rem)] max-w-5xl mx-auto w-full">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-2">
        <div className="flex items-start gap-3">
           <button onClick={() => navigate('/tickets')} className="mt-0.5 p-2 -ml-2 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors shrink-0">
              <ArrowLeft className="w-5 h-5" />
           </button>
           <div>
              <div className="flex items-center gap-2 flex-wrap">
                 <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white leading-tight">
                   {ticket?.codigo}: {ticket?.titulo}
                 </h1>
              </div>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${getStatusColor(ticket?.estado || '')}`}>
                  {ticket?.estado?.replace('_', ' ')}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${getPriorityColor(ticket?.prioridad || '')}`}>
                  {ticket?.prioridad}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {ticket?.tecnicoNombre ? `Asignado a: ${ticket.tecnicoNombre}` : 'Sin asignar'}
                </span>
              </div>
           </div>
        </div>
        {canReactivate && (
          <button
            onClick={handleReactivate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-bold rounded-xl transition-colors shadow-md shadow-cyan-500/20 shrink-0 active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            Reactivar ticket
          </button>
        )}
      </div>

      {/* Calificación del cliente (CSAT) */}
      {ticket?.calificacion != null && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-gradient-to-r from-fuchsia-50 to-violet-50 dark:from-fuchsia-500/10 dark:to-violet-500/10 border border-fuchsia-200/60 dark:border-fuchsia-500/20">
          <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-fuchsia-500 to-violet-600 flex items-center justify-center shadow-lg shadow-fuchsia-500/25 shrink-0">
            <Star className="w-5 h-5 text-white fill-white" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-wider text-fuchsia-600 dark:text-fuchsia-400">Calificación del cliente</p>
            <div className="flex items-center gap-0.5 mt-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className={`w-4 h-4 ${i <= (ticket.calificacion || 0) ? 'text-amber-400 fill-amber-400' : 'text-slate-300 dark:text-slate-600'}`} />
              ))}
              <span className="ml-2 text-xs font-bold text-slate-600 dark:text-slate-300">{ticket.calificacion}/5</span>
            </div>
            {ticket.comentarioCliente && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 italic leading-relaxed">"{ticket.comentarioCliente}"</p>
            )}
          </div>
        </div>
      )}

      {/* Chat Container */}
      <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col overflow-hidden min-h-0">
        
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-slate-50/30 dark:bg-slate-900/30">
          
          {/* System Message */}
          <div className="flex justify-center">
            <span className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full text-[11px] font-bold flex items-center gap-1.5">
              <MessageSquare className="w-3 h-3" />
              Chat iniciado · {new Date(ticket?.fechaCreacion || Date.now()).toLocaleDateString()}
            </span>
          </div>

          {messages.length === 0 && (
            <div className="text-center text-slate-400 dark:text-slate-500 mt-12">
              <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium text-sm">No hay mensajes aún</p>
              <p className="text-xs mt-1">Escribe algo para comenzar la conversación</p>
            </div>
          )}
          
          {messages.map((msg, idx) => {
            const isMe = msg.remitenteId === user?.id;
            return (
              <div key={idx} className={`flex ${isMe ? 'flex-row-reverse' : 'flex-row'} items-start gap-3`}>
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 overflow-hidden shrink-0 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold text-xs border-2 border-white dark:border-slate-900 shadow-sm">
                  {msg.remitenteNombre.charAt(0).toUpperCase()}
                </div>

                {/* Message Body */}
                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[80%] lg:max-w-[70%]`}>
                  <div className={`flex items-baseline gap-2 mb-1 ${isMe ? 'flex-row-reverse' : 'flex-row'} px-1`}>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {msg.remitenteNombre}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                      {new Date(msg.fechaEnvio).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>

                  <div className={`px-4 py-2.5 rounded-2xl shadow-sm text-sm leading-relaxed ${
                    isMe
                      ? 'bg-blue-600 text-white rounded-tr-md'
                      : 'bg-white border border-slate-200 text-slate-800 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 rounded-tl-md'
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
                               {msg.adjuntoUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? <ImageIcon className="w-4 h-4" /> : <Paperclip className="w-4 h-4" />}
                            </div>
                            <div>
                               <p className={`text-xs font-bold max-w-[160px] truncate ${isMe ? 'text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                                 {msg.adjuntoUrl.split('/').pop()?.split('_').pop() || 'Archivo adjunto'}
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
             );
           })}
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
                <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-slate-900/70 backdrop-blur-md p-3 anim-fade-in">
                  <div className="my-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-md p-4 sm:p-6 anim-scale-in">
                   <div className="flex items-center justify-between mb-5">
                     <h3 className="text-base font-bold text-slate-900 dark:text-white">Insertar enlace</h3>
                     <button onClick={() => setShowLinkDialog(false)} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><X className="w-4 h-4" /></button>
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
             <div className="flex items-end gap-3">
               <textarea 
                 id="chat-textarea"
                 value={newMessage}
                 onChange={(e) => setNewMessage(e.target.value)}
                 onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                       e.preventDefault();
                       handleSendMessage(e);
                    }
                    if (e.ctrlKey && e.key === 'b') { e.preventDefault(); insertFormatting('**', '**'); }
                    if (e.ctrlKey && e.key === 'i') { e.preventDefault(); insertFormatting('*', '*'); }
                 }}
                 placeholder="Escribe tu respuesta... (Enter para enviar, Shift+Enter para nueva línea)"
                 className="flex-1 resize-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 outline-none text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 min-h-[44px] max-h-[120px] focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
               />
               <button 
                 type="submit"
                 disabled={(!newMessage.trim() && !uploading) || uploading}
                 className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-all shadow-md shadow-blue-500/20 shrink-0 active:scale-95"
               >
                 {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
               </button>
             </div>

             <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
             </>)}
          </form>
        </div>
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
    </div>
  );
}
