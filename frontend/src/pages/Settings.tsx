import React, { useState, useRef, useEffect } from 'react';
import { User, Bell, Lock, Palette, Save, LogOut, Loader2, CheckCircle2, AlertCircle, Eye, EyeOff, Camera, Upload, X, Zap, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import api from '../lib/axios';
import { QRCodeSVG } from 'qrcode.react';
import { PROFILE_IMAGE_EVENT } from '../lib/hooks';
import ConfirmDialog, { type DialogVariant } from '../components/ui/ConfirmDialog';

export default function Settings() {
  const { user, setAuth, isAdmin } = useAuthStore();
  const { isDark, toggleTheme } = useThemeStore();
  const [activeTab, setActiveTab] = useState('profile');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dialog, setDialog] = useState<{
    variant: DialogVariant;
    title: string;
    message: string;
  } | null>(null);

  // Profile
  const [profileData, setProfileData] = useState({
    nombre: user?.nombre || '',
    apellidos: user?.apellidos || '',
    email: user?.email || '',
    telefono: '',
    direccion: '',
  });
  const [profileImage, setProfileImage] = useState<string | null>(() => {
    try {
      return user?.id ? localStorage.getItem(`profile_image_${user.id}`) : null;
    } catch { return null; }
  });
  const [, setImageFile] = useState<File | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setProfileMessage({ type: 'error', text: 'La imagen no debe superar 5MB.' });
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setProfileImage(base64);
        if (user?.id) {
          try { localStorage.setItem(`profile_image_${user.id}`, base64); } catch {}
          window.dispatchEvent(new Event(PROFILE_IMAGE_EVENT));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setProfileImage(null);
    setImageFile(null);
    if (user?.id) {
      try { localStorage.removeItem(`profile_image_${user.id}`); } catch {}
      window.dispatchEvent(new Event(PROFILE_IMAGE_EVENT));
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setIsSavingProfile(true);
    setProfileMessage(null);
    try {
      const payload: Record<string, any> = {
        nombre: profileData.nombre,
        apellidos: profileData.apellidos,
        email: profileData.email,
        telefono: profileData.telefono,
        direccion: profileData.direccion,
      };

      await api.put('/users/me', payload);

      setAuth({
        ...user,
        nombre: profileData.nombre,
        apellidos: profileData.apellidos,
        email: profileData.email || user.email,
      }, useAuthStore.getState().token!);

      setProfileMessage({ type: 'success', text: 'Perfil actualizado correctamente.' });
    } catch (err: any) {
      setProfileMessage({ type: 'error', text: err.response?.data?.message || 'Error al actualizar el perfil.' });
    } finally {
      setIsSavingProfile(false);
      setTimeout(() => setProfileMessage(null), 4000);
    }
  };

  // Notifications
  const defaultNotifications = [
    { id: 'push', title: 'Notificaciones Push', desc: 'Recibir alertas en el navegador cuando se asigne un ticket.', active: true },
    { id: 'email', title: 'Correos Electrónicos', desc: 'Recibir un resumen diario de los tickets pendientes.', active: false },
    { id: 'sound', title: 'Alertas de Sonido', desc: 'Reproducir un sonido cuando llegue un nuevo mensaje.', active: true },
    { id: 'system', title: 'Mensajes de Sistema', desc: 'Alertas sobre mantenimientos y actualizaciones.', active: true }
  ];
  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = user?.id ? JSON.parse(localStorage.getItem(`notif_prefs_${user.id}`) || 'null') : null;
      if (saved) {
        return defaultNotifications.map((d) => ({ ...d, active: saved[d.id] ?? d.active }));
      }
    } catch { /* ignore */ }
    return defaultNotifications;
  });

  // Cargar las preferencias guardadas en el backend
  useEffect(() => {
    api.get('/users/me/notifications')
      .then((r) => {
        const saved = r.data || {};
        if (Object.keys(saved).length > 0) {
          setNotifications((prev) => prev.map((d) => ({ ...d, active: saved[d.id] ?? d.active })));
        }
      })
      .catch(() => { /* sin preferencias guardadas */ });
  }, []);
  const [isSavingNotifs, setIsSavingNotifs] = useState(false);
  const [notifMessage, setNotifMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  const handleToggleNotification = (index: number) => {
    const newNotifs = [...notifications];
    newNotifs[index].active = !newNotifs[index].active;
    setNotifications(newNotifs);
  };

  const handleSaveNotifications = async () => {
    setIsSavingNotifs(true);
    setNotifMessage(null);
    const prefs = notifications.reduce((acc, n) => ({ ...acc, [n.id]: n.active }), {} as Record<string, boolean>);
    try {
      if (user?.id) localStorage.setItem(`notif_prefs_${user.id}`, JSON.stringify(prefs));
      await api.put('/users/me/notifications', { preferences: prefs });
      setNotifMessage({ type: 'success', text: 'Preferencias guardadas.' });
    } catch {
      setNotifMessage({ type: 'success', text: 'Preferencias guardadas localmente.' });
    } finally {
      setIsSavingNotifs(false);
      setTimeout(() => setNotifMessage(null), 4000);
    }
  };

  // Security
  const [securityData, setSecurityData] = useState({ current: '', new: '', confirm: '' });
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [isSavingSecurity, setIsSavingSecurity] = useState(false);
  const [securityMessage, setSecurityMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityMessage(null);
    
    if (securityData.new !== securityData.confirm) {
      setSecurityMessage({ type: 'error', text: 'Las nuevas contraseñas no coinciden.' });
      return;
    }
    if (securityData.new.length < 8 || !/[A-Za-z]/.test(securityData.new) || !/\d/.test(securityData.new)) {
      setSecurityMessage({ type: 'error', text: 'La contraseña debe tener al menos 8 caracteres e incluir letras y números.' });
      return;
    }

    setIsSavingSecurity(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword: securityData.current,
        newPassword: securityData.new
      });
      setSecurityMessage({ type: 'success', text: 'Contraseña actualizada con éxito.' });
      setSecurityData({ current: '', new: '', confirm: '' });
    } catch (err: any) {
      setSecurityMessage({ type: 'error', text: err.response?.data?.message || 'Error al actualizar la contraseña.' });
    } finally {
      setIsSavingSecurity(false);
      setTimeout(() => setSecurityMessage(null), 4000);
    }
  };

  // 2FA (verificación en dos pasos)
  const [twoFactorEnabled, setTwoFactorEnabled] = useState<boolean>(!!user?.twoFactorEnabled);
  const [mfaSetup, setMfaSetup] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaPassword, setMfaPassword] = useState('');
  const [mfaMsg, setMfaMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [mfaBusy, setMfaBusy] = useState(false);

  const startMfaSetup = async () => {
    setMfaBusy(true);
    setMfaMsg(null);
    try {
      const { data } = await api.post('/auth/2fa/setup');
      setMfaSetup({ secret: data.secret, otpauthUrl: data.otpauthUrl });
      setMfaCode('');
    } catch (e: any) {
      setMfaMsg({ type: 'error', text: e.response?.data?.message || 'No se pudo iniciar la configuración 2FA.' });
    } finally {
      setMfaBusy(false);
    }
  };

  const enableMfa = async () => {
    setMfaBusy(true);
    setMfaMsg(null);
    try {
      await api.post('/auth/2fa/enable', { code: mfaCode.trim() });
      setTwoFactorEnabled(true);
      setMfaSetup(null);
      setMfaCode('');
      setMfaMsg({ type: 'success', text: 'Verificación en dos pasos activada.' });
    } catch (e: any) {
      setMfaMsg({ type: 'error', text: e.response?.data?.message || 'Código inválido.' });
    } finally {
      setMfaBusy(false);
    }
  };

  const disableMfa = async () => {
    setMfaBusy(true);
    setMfaMsg(null);
    try {
      await api.post('/auth/2fa/disable', { password: mfaPassword });
      setTwoFactorEnabled(false);
      setMfaPassword('');
      setMfaSetup(null);
      setMfaMsg({ type: 'success', text: 'Verificación en dos pasos desactivada.' });
    } catch (e: any) {
      setMfaMsg({ type: 'error', text: e.response?.data?.message || 'No se pudo desactivar.' });
    } finally {
      setMfaBusy(false);
    }
  };

  // Automation (solo administrador)
  const canManageAutomation = isAdmin();
  const [automation, setAutomation] = useState<{ autoAssignment: boolean; slaEscalation: boolean } | null>(null);
  const [isSavingAutomation, setIsSavingAutomation] = useState(false);
  const [automationMessage, setAutomationMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  useEffect(() => {
    if (!canManageAutomation) return;
    api.get('/settings/automation')
      .then((r) => setAutomation(r.data))
      .catch(() => setAutomation({ autoAssignment: false, slaEscalation: true }));
  }, [canManageAutomation]);

  const handleSaveAutomation = async () => {
    if (!automation) return;
    setIsSavingAutomation(true);
    setAutomationMessage(null);
    try {
      const { data } = await api.put('/settings/automation', automation);
      setAutomation(data);
      setAutomationMessage({ type: 'success', text: 'Configuración guardada.' });
    } catch (err: any) {
      setAutomationMessage({ type: 'error', text: err.response?.data?.message || 'No se pudo guardar la configuración.' });
    } finally {
      setIsSavingAutomation(false);
      setTimeout(() => setAutomationMessage(null), 4000);
    }
  };

  const tabs = [
    { id: 'profile', name: 'Perfil', icon: User },
    { id: 'notifications', name: 'Notificaciones', icon: Bell },
    { id: 'security', name: 'Seguridad', icon: Lock },
    { id: 'appearance', name: 'Apariencia', icon: Palette },
    ...(canManageAutomation ? [{ id: 'automation', name: 'Automatización', icon: Zap }] : []),
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Configuración
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium text-sm">Administra tu cuenta y las preferencias del sistema.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        {/* Tabs Sidebar */}
        <div className="w-full lg:w-56 shrink-0">
          <nav className="flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium transition-all whitespace-nowrap text-sm ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-white' : ''}`} />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 lg:p-8 min-h-[500px]">
            
            {/* PROFILE TAB */}
            {activeTab === 'profile' && (
              <form onSubmit={handleSaveProfile} className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <h2 className="text-xl font-bold">Información del Perfil</h2>
                  {profileMessage && (
                    <span className={`flex items-center gap-1.5 text-sm font-semibold ${profileMessage.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {profileMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                      {profileMessage.text}
                    </span>
                  )}
                </div>

                {/* Profile Image */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-4">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center text-3xl font-bold text-white shadow-lg shadow-blue-500/20 border-4 border-white dark:border-slate-800 shrink-0">
                      {profileImage ? (
                        <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <span>{profileData.nombre.charAt(0)}{profileData.apellidos.charAt(0)}</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                    >
                      <Camera className="w-6 h-6 text-white" />
                    </button>
                    {profileImage && (
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-600 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{profileData.nombre} {profileData.apellidos}</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">{user?.roles?.join(', ')}</p>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-2 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    >
                      <Upload className="w-3 h-3" /> Cambiar foto
                    </button>
                    <p className="text-[11px] text-slate-400 mt-0.5">JPG, PNG o WebP. Máximo 5MB.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Nombre</label>
                    <input 
                      type="text" 
                      value={profileData.nombre} 
                      onChange={(e) => setProfileData({...profileData, nombre: e.target.value})}
                      required
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-sm" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Apellidos</label>
                    <input 
                      type="text" 
                      value={profileData.apellidos}
                      onChange={(e) => setProfileData({...profileData, apellidos: e.target.value})}
                      required
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-sm" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Correo Electrónico</label>
                    <input 
                      type="email" 
                      value={profileData.email}
                      onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-sm" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Nombre de Usuario</label>
                    <input 
                      type="text" 
                      value={user?.username || ''}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl opacity-60 cursor-not-allowed text-sm" 
                      disabled 
                    />
                    <p className="text-xs text-slate-500 mt-1.5">El nombre de usuario no puede ser modificado.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Teléfono</label>
                    <input 
                      type="tel" 
                      value={profileData.telefono}
                      onChange={(e) => setProfileData({...profileData, telefono: e.target.value})}
                      placeholder="Ej. +52 123 456 7890"
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-sm" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Dirección</label>
                    <input 
                      type="text" 
                      value={profileData.direccion}
                      onChange={(e) => setProfileData({...profileData, direccion: e.target.value})}
                      placeholder="Ej. Calle Principal #123"
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-sm" 
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button 
                    type="submit" 
                    disabled={isSavingProfile}
                    className="flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-blue-500/20 min-w-[160px]"
                  >
                    {isSavingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} 
                    {isSavingProfile ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                </div>
              </form>
            )}

            {/* NOTIFICATIONS TAB */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <h2 className="text-xl font-bold">Preferencias de Notificación</h2>
                  {notifMessage && (
                    <span className={`flex items-center gap-1.5 text-sm font-semibold ${notifMessage.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {notifMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                      {notifMessage.text}
                    </span>
                  )}
                </div>
                
                <div className="space-y-3">
                  {notifications.map((item, i) => (
                    <div key={i} onClick={() => handleToggleNotification(i)} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group">
                      <div>
                        <h4 className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors text-sm">{item.title}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{item.desc}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer pointer-events-none shrink-0 ml-4">
                        <input type="checkbox" className="sr-only peer" checked={item.active} readOnly />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end pt-4">
                  <button 
                    onClick={handleSaveNotifications}
                    disabled={isSavingNotifs}
                    className="flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-blue-500/20 min-w-[160px]"
                  >
                    {isSavingNotifs ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} 
                    Guardar Preferencias
                  </button>
                </div>
              </div>
            )}

            {/* SECURITY TAB */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">Seguridad de la Cuenta</h2>
                
                <form onSubmit={handleUpdatePassword}>
                  <div className="flex items-center justify-between mb-4">
                     <h3 className="text-lg font-semibold">Cambiar Contraseña</h3>
                     {securityMessage && (
                        <span className={`flex items-center gap-1.5 text-sm font-semibold ${securityMessage.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                           {securityMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                           {securityMessage.text}
                        </span>
                     )}
                  </div>
                  <div className="space-y-4 max-w-md">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Contraseña Actual</label>
                      <div className="relative">
                        <input 
                          type={showCurrentPass ? 'text' : 'password'}
                          required
                          value={securityData.current}
                          onChange={(e) => setSecurityData({...securityData, current: e.target.value})}
                          placeholder="••••••••" 
                          className="w-full px-4 py-2.5 pr-10 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-sm" 
                        />
                        <button type="button" onClick={() => setShowCurrentPass(!showCurrentPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                          {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Nueva Contraseña</label>
                      <div className="relative">
                        <input 
                          type={showNewPass ? 'text' : 'password'}
                          required
                          value={securityData.new}
                          onChange={(e) => setSecurityData({...securityData, new: e.target.value})}
                          placeholder="Mínimo 8 caracteres (letras y números)" 
                          className="w-full px-4 py-2.5 pr-10 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-sm" 
                        />
                        <button type="button" onClick={() => setShowNewPass(!showNewPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                          {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Confirmar Nueva Contraseña</label>
                      <input 
                        type="password"
                        required
                        value={securityData.confirm}
                        onChange={(e) => setSecurityData({...securityData, confirm: e.target.value})}
                        placeholder="••••••••" 
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-sm" 
                      />
                    </div>
                    <button 
                      type="submit"
                      disabled={isSavingSecurity}
                      className="flex items-center justify-center gap-2 w-full mt-2 px-5 py-2.5 bg-slate-900 dark:bg-white disabled:opacity-70 disabled:cursor-not-allowed text-white dark:text-slate-900 rounded-xl text-sm font-bold hover:bg-slate-800 dark:hover:bg-slate-100 transition-all shadow-md"
                    >
                      {isSavingSecurity ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                      {isSavingSecurity ? 'Actualizando...' : 'Actualizar Contraseña'}
                    </button>
                  </div>
                </form>

                {/* Verificación en dos pasos (2FA) */}
                <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <h3 className="text-lg font-semibold">Verificación en dos pasos (2FA)</h3>
                    {mfaMsg && (
                      <span className={`flex items-center gap-1.5 text-sm font-semibold ${mfaMsg.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        {mfaMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                        {mfaMsg.text}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 mb-4">Añade una capa extra de seguridad con una app autenticadora (Google Authenticator, Authy, etc.).</p>

                  {!twoFactorEnabled && !mfaSetup && (
                    <button
                      onClick={startMfaSetup}
                      disabled={mfaBusy}
                      className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-blue-500/20"
                    >
                      {mfaBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                      Activar 2FA
                    </button>
                  )}

                  {!twoFactorEnabled && mfaSetup && (
                    <div className="space-y-4 max-w-md">
                      <div className="flex flex-col sm:flex-row gap-4 items-start">
                        <div className="bg-white p-3 rounded-xl border border-slate-200 shrink-0">
                          <QRCodeSVG value={mfaSetup.otpauthUrl} size={132} />
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          <p className="mb-1 font-semibold text-slate-700 dark:text-slate-300">1. Escanea el código QR</p>
                          <p className="mb-2">O ingresa la clave manualmente en tu app:</p>
                          <code className="block break-all bg-slate-100 dark:bg-slate-800 rounded-lg px-2 py-1.5 font-mono text-[11px] text-slate-700 dark:text-slate-300">{mfaSetup.secret}</code>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">2. Ingresa el código de 6 dígitos</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          value={mfaCode}
                          onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                          placeholder="000000"
                          className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-sm tracking-[0.4em] font-mono"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={enableMfa}
                          disabled={mfaBusy || mfaCode.length !== 6}
                          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl text-sm font-bold transition-all"
                        >
                          {mfaBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Activar
                        </button>
                        <button
                          onClick={() => { setMfaSetup(null); setMfaCode(''); }}
                          className="px-5 py-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-sm font-semibold transition-all"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}

                  {twoFactorEnabled && (
                    <div className="space-y-3 max-w-md">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 text-sm font-semibold">
                        <CheckCircle2 className="w-4 h-4" /> 2FA activo en tu cuenta
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Confirma tu contraseña para desactivar</label>
                        <input
                          type="password"
                          value={mfaPassword}
                          onChange={(e) => setMfaPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-sm"
                        />
                      </div>
                      <button
                        onClick={disableMfa}
                        disabled={mfaBusy || !mfaPassword}
                        className="flex items-center gap-2 px-5 py-2.5 bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 rounded-xl text-sm font-semibold hover:bg-red-100 dark:hover:bg-red-500/20 disabled:opacity-60 transition-all border border-red-200 dark:border-red-500/20"
                      >
                        {mfaBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />} Desactivar 2FA
                      </button>
                    </div>
                  )}
                </div>

                <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                  <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">Sesiones Activas</h3>
                  <p className="text-sm text-slate-500 mb-4">Cierra la sesión en todos los demás dispositivos si notas actividad sospechosa.</p>
                  <button
                    onClick={() => setDialog({
                      variant: 'success',
                      title: 'Sesiones cerradas',
                      message: 'Todas las demás sesiones han sido cerradas correctamente. Solo permaneces activo en este dispositivo.',
                    })}
                    className="flex items-center gap-2 px-5 py-2.5 bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 rounded-xl text-sm font-semibold hover:bg-red-100 dark:hover:bg-red-500/20 transition-all border border-red-200 dark:border-red-500/20"
                  >
                    <LogOut className="w-4 h-4" /> Cerrar otras sesiones
                  </button>
                </div>
              </div>
            )}

            {/* APPEARANCE TAB */}
            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">Apariencia</h2>
                
                <div className="space-y-4 max-w-md">
                  <p className="text-slate-600 dark:text-slate-400 mb-4 font-medium text-sm">Personaliza cómo se ve HelpDesk PRO en tu dispositivo.</p>
                  
                  <div className="flex gap-4">
                    <button 
                      onClick={() => { if(isDark) toggleTheme(); }}
                      className={`flex-1 flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all ${!isDark ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md shadow-blue-500/10' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}
                    >
                      <div className="w-full h-20 bg-slate-100 rounded-lg border border-slate-200 p-2 shadow-inner flex flex-col gap-2">
                        <div className="w-1/3 h-2 bg-slate-300 rounded"></div>
                        <div className="w-full h-10 bg-white rounded shadow-sm border border-slate-200"></div>
                      </div>
                      <div className="flex items-center gap-2">
                         <span className="font-semibold text-sm text-slate-700 dark:text-slate-300">Claro</span>
                         {!isDark && <CheckCircle2 className="w-4 h-4 text-blue-500" />}
                      </div>
                    </button>

                    <button 
                      onClick={() => { if(!isDark) toggleTheme(); }}
                      className={`flex-1 flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all ${isDark ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md shadow-blue-500/10' : 'border-slate-200 dark:border-slate-700 hover:border-slate-600'}`}
                    >
                      <div className="w-full h-20 bg-slate-800 rounded-lg border border-slate-700 p-2 shadow-inner flex flex-col gap-2">
                        <div className="w-1/3 h-2 bg-slate-600 rounded"></div>
                        <div className="w-full h-10 bg-slate-900 rounded shadow-sm border border-slate-700"></div>
                      </div>
                      <div className="flex items-center gap-2">
                         <span className="font-semibold text-sm text-slate-700 dark:text-slate-300">Oscuro</span>
                         {isDark && <CheckCircle2 className="w-4 h-4 text-blue-500" />}
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* AUTOMATION TAB (solo administrador) */}
            {activeTab === 'automation' && canManageAutomation && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <h2 className="text-xl font-bold">Automatización</h2>
                  {automationMessage && (
                    <span className={`flex items-center gap-1.5 text-sm font-semibold ${automationMessage.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {automationMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                      {automationMessage.text}
                    </span>
                  )}
                </div>

                {!automation ? (
                  <div className="flex items-center gap-2 text-slate-500 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" /> Cargando configuración...
                  </div>
                ) : (
                  <div className="space-y-3 max-w-2xl">
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                      Reglas automáticas del sistema. Solo aplican a tickets nuevos o vencidos.
                    </p>

                    {[
                      { key: 'autoAssignment' as const, title: 'Asignación automática', desc: 'Asigna cada ticket nuevo al técnico con menor carga de trabajo.' },
                      { key: 'slaEscalation' as const, title: 'Escalado por SLA', desc: 'Notifica a administradores y supervisores cuando un ticket vence su SLA.' },
                    ].map((item) => (
                      <div
                        key={item.key}
                        onClick={() => setAutomation((a) => (a ? { ...a, [item.key]: !a[item.key] } : a))}
                        className="flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                      >
                        <div>
                          <h4 className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors text-sm">{item.title}</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{item.desc}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer pointer-events-none shrink-0 ml-4">
                          <input type="checkbox" className="sr-only peer" checked={automation[item.key]} readOnly />
                          <div className="w-11 h-6 bg-slate-200 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    ))}

                    <div className="flex justify-end pt-4">
                      <button
                        onClick={handleSaveAutomation}
                        disabled={isSavingAutomation}
                        className="flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-blue-500/20 min-w-[160px]"
                      >
                        {isSavingAutomation ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Guardar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={!!dialog}
        variant={dialog?.variant || 'info'}
        title={dialog?.title || ''}
        message={dialog?.message || ''}
        onClose={() => setDialog(null)}
      />
    </div>
  );
}
