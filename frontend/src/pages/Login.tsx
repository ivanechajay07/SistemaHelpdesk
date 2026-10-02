import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { useNavigate } from 'react-router-dom';
import api from '../lib/axios';
import {
  Lock, Mail, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, ArrowLeft,
  UserPlus, User, ShieldCheck, Sun, Moon, Sunrise, LogIn,
  Headphones, Zap, BarChart3, Star, Sparkles
} from 'lucide-react';

type View = 'login' | 'mfa' | 'forgot' | 'register' | 'forgot-sent' | 'register-sent';

const inputCls =
  'block w-full pl-11 pr-4 py-3 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400/40 hover:border-slate-300 dark:hover:border-white/20 transition-all duration-300';

const inputRegCls = (hasError: boolean) =>
  `w-full px-3 py-2.5 rounded-xl bg-white dark:bg-white/5 border ${
    hasError ? 'border-red-500/60 focus:border-red-400' : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 focus:border-blue-400/40'
  } text-slate-900 dark:text-white text-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all duration-300`;

export default function Login() {
  const [view, setView] = useState<View>('login');
  const { isDark, toggleTheme } = useThemeStore();

  // Saludo segun la hora del dia
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';
  const GreetingIcon = hour < 12 ? Sunrise : hour < 19 ? Sun : Moon;

  // Login state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [welcomeName, setWelcomeName] = useState('');

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');

  // Register state
  const [regData, setRegData] = useState({
    nombre: '', apellidos: '', email: '', username: '', password: '', confirmPassword: '', telefono: '', direccion: ''
  });
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState('');
  const [regErrors, setRegErrors] = useState<Record<string, string>>({});

  const setAuth = useAuthStore((state) => state.setAuth);
  const navigate = useNavigate();

  // Precarga el panel en segundo plano para acelerar la transicion tras iniciar sesion
  useEffect(() => {
    import('./Dashboard').catch(() => {});
  }, []);
  const [mfaToken, setMfaToken] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaError, setMfaError] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);

  // Finaliza la sesión con los datos devueltos por el backend (login o verificación 2FA)
  const finalizeLogin = (data: any) => {
    const roles: string[] = data.roles || [];
    setAuth({
      id: data.id,
      username: data.username,
      email: data.email,
      nombre: data.nombre,
      apellidos: data.apellidos,
      roles,
      permissions: data.permissions || [],
    }, data.accessToken, data.refreshToken);
    setWelcomeName(data.nombre || data.username || '');
    setTimeout(() => {
      const isClientOnly =
        (roles.includes('CLIENTE') || roles.includes('USUARIO') || roles.includes('ROLE_CLIENTE') || roles.includes('ROLE_USUARIO')) &&
        !roles.includes('ADMIN') && !roles.includes('ROLE_ADMIN') &&
        !roles.includes('TECNICO') && !roles.includes('ROLE_TECNICO') &&
        !roles.includes('SUPERVISOR') && !roles.includes('ROLE_SUPERVISOR');
        navigate(isClientOnly ? '/tickets' : '/dashboard');
      }, 1100);
  };

  const handleVerifyMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    setMfaError('');
    setMfaLoading(true);
    try {
      const { data } = await api.post('/auth/2fa/verify', { mfaToken, code: mfaCode.trim() });
      finalizeLogin(data);
    } catch (err: any) {
      setMfaError(err.response?.data?.message || 'Código inválido. Intenta nuevamente.');
    } finally {
      setMfaLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { username, password });
      if (data.mfaRequired) {
        setMfaToken(data.mfaToken);
        setMfaCode('');
        setMfaError('');
        setView('mfa');
        return;
      }
      finalizeLogin(data);
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError(err.response?.data?.message || 'Credenciales inválidas. Verifica tu usuario y contraseña.');
      } else if (err.response?.status === 403) {
        setError(err.response?.data?.message || 'Tu cuenta está desactivada. Contacta al administrador.');
      } else if (err.response?.status >= 500) {
        setError('Error del servidor. Intenta nuevamente más tarde.');
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Error de conexión. Verifica tu red.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: forgotEmail });
      setView('forgot-sent');
    } catch (err: any) {
      if (err.response?.status === 404) {
        setForgotError('No se encontró una cuenta con ese correo electrónico.');
      } else {
        setForgotError(err.response?.data?.message || 'Error al procesar la solicitud. Intenta más tarde.');
      }
    } finally {
      setForgotLoading(false);
    }
  };

  const validateRegField = (name: string, value: string): string => {
    switch (name) {
      case 'nombre':
        if (!value.trim()) return 'El nombre es requerido';
        if (value.trim().length < 2) return 'El nombre debe tener al menos 2 caracteres';
        if (value.trim().length > 100) return 'El nombre no puede exceder 100 caracteres';
        return '';
      case 'apellidos':
        if (!value.trim()) return 'Los apellidos son requeridos';
        if (value.trim().length < 2) return 'Los apellidos deben tener al menos 2 caracteres';
        if (value.trim().length > 100) return 'Los apellidos no pueden exceder 100 caracteres';
        return '';
      case 'email':
        if (!value.trim()) return 'El correo electrónico es requerido';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'El correo electrónico no es válido';
        return '';
      case 'username':
        if (!value.trim()) return 'El nombre de usuario es requerido';
        if (value.trim().length < 3) return 'El nombre de usuario debe tener al menos 3 caracteres';
        if (value.trim().length > 50) return 'El nombre de usuario no puede exceder 50 caracteres';
        if (!/^[a-zA-Z0-9_]+$/.test(value)) return 'El nombre de usuario solo puede contener letras, números y guiones bajos';
        return '';
      case 'password':
        if (!value) return 'La contraseña es requerida';
        if (value.length < 6) return 'La contraseña debe tener al menos 6 caracteres';
        if (value.length > 100) return 'La contraseña no puede exceder 100 caracteres';
        if (!/[A-Z]/.test(value)) return 'La contraseña debe contener al menos una mayúscula';
        if (!/[0-9]/.test(value)) return 'La contraseña debe contener al menos un número';
        return '';
      case 'confirmPassword':
        if (!value) return 'Confirma tu contraseña';
        if (value !== regData.password) return 'Las contraseñas no coinciden';
        return '';
      case 'telefono':
        if (value && value.length > 20) return 'El teléfono no puede exceder 20 caracteres';
        if (value && !/^[+\d\s()-]+$/.test(value)) return 'El formato del teléfono no es válido';
        return '';
      case 'direccion':
        if (value && value.length > 200) return 'La dirección no puede exceder 200 caracteres';
        return '';
      default:
        return '';
    }
  };

  const validateRegForm = (): boolean => {
    const errors: Record<string, string> = {};
    Object.keys(regData).forEach(key => {
      const error = validateRegField(key, regData[key as keyof typeof regData]);
      if (error) errors[key] = error;
    });
    setRegErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRegChange = (name: string, value: string) => {
    setRegData(prev => ({ ...prev, [name]: value }));
    if (regErrors[name]) {
      const error = validateRegField(name, value);
      setRegErrors(prev => {
        const next = { ...prev };
        if (error) {
          next[name] = error;
        } else {
          delete next[name];
        }
        return next;
      });
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');

    if (!validateRegForm()) {
      return;
    }

    setRegLoading(true);
    try {
      await api.post('/auth/register', {
        nombre: regData.nombre,
        apellidos: regData.apellidos,
        email: regData.email,
        username: regData.username,
        password: regData.password,
        telefono: regData.telefono,
        direccion: regData.direccion,
      });
      setView('register-sent');
    } catch (err: any) {
      setRegError(err.response?.data?.message || 'Error al registrar. Intenta más tarde.');
    } finally {
      setRegLoading(false);
    }
  };

  const resetForms = () => {
    setError('');
    setForgotError('');
    setRegError('');
    setRegErrors({});
    setForgotEmail('');
    setRegData({ nombre: '', apellidos: '', email: '', username: '', password: '', confirmPassword: '', telefono: '', direccion: '' });
  };

  // Destello que sigue al cursor sobre el panel azul/celeste (efecto interactivo)
  const handleBrandMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - rect.left}px`);
    el.style.setProperty('--my', `${e.clientY - rect.top}px`);
  };

  const brandFeatures = [
    { icon: Headphones, text: 'Mesa de ayuda 24/7 con tickets y SLAs automatizados' },
    { icon: BarChart3, text: 'Métricas y reportes en tiempo real' },
    { icon: ShieldCheck, text: 'Seguridad con roles y permisos por usuario' },
  ];

  const brandStats = [
    { value: '98%', label: 'Satisfacción' },
    { value: '24/7', label: 'Soporte' },
    { value: '+1.2k', label: 'Tickets' },
  ];

  const floatCards = [
    { icon: Star, color: 'text-amber-400', value: '4.9', label: 'Valoración', pos: 'top-24 right-8', anim: 'anim-float-slow', delay: '0s' },
    { icon: Zap, color: 'text-sky-500', value: '< 5 min', label: 'Respuesta SLA', pos: 'bottom-36 left-8', anim: 'anim-float-slower', delay: '-3s' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-blue-50 to-cyan-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 relative overflow-hidden flex items-center transition-colors duration-500">
      {/* ===== Botón claro / oscuro ===== */}
      <button
        onClick={toggleTheme}
        title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        className="fixed top-5 right-5 z-30 p-2.5 rounded-xl bg-white/70 dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 backdrop-blur-md text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:scale-105 active:scale-95 shadow-lg transition-all duration-300"
      >
        {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>

      {/* ===== Overlay de bienvenida al iniciar sesión (suave y animado) ===== */}
      {welcomeName && (
        <div className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-gradient-to-br from-sky-100 via-blue-50 to-cyan-100 dark:from-blue-950 dark:via-slate-950 dark:to-slate-950 backdrop-blur-xl anim-overlay-in overflow-hidden">
          {/* Blobs suaves animados */}
          <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-24 -right-20 w-80 h-80 bg-sky-300/40 dark:bg-cyan-500/10 rounded-full blur-3xl anim-blob" />
            <div className="absolute -bottom-32 -left-16 w-96 h-96 bg-cyan-200/50 dark:bg-sky-600/10 rounded-full blur-3xl anim-blob" style={{ animationDelay: '-6s' }} />
            <div className="absolute top-1/3 left-1/4 w-48 h-48 bg-blue-200/50 dark:bg-blue-700/10 rounded-full blur-2xl anim-blob" style={{ animationDelay: '-11s' }} />
          </div>

          <div className="relative anim-float-slow">
            <div className="relative w-28 h-28">
              <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
                <defs>
                  <linearGradient id="loginRing" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#0ea5e9" />
                  </linearGradient>
                </defs>
                <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(100,116,139,0.25)" strokeWidth="6" />
                <circle cx="50" cy="50" r="44" fill="none" stroke="url(#loginRing)" strokeWidth="6" strokeLinecap="round" className="anim-ring-fill" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-lg shadow-sky-500/20 flex items-center justify-center text-slate-900 dark:text-white font-black text-2xl">
                  {welcomeName.charAt(0).toUpperCase()}
                </div>
              </div>
            </div>
          </div>

          <h2 className="relative mt-6 text-2xl font-black text-slate-900 dark:text-white tracking-tight anim-fade-in-up">
            ¡Todo listo, <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-cyan-500">{welcomeName}</span>!
          </h2>
          <p className="relative mt-2 text-sm text-slate-500 dark:text-slate-400 anim-fade-in-up" style={{ animationDelay: '120ms' }}>
            Preparando tu espacio de trabajo...
          </p>
          <div className="relative flex items-center gap-1.5 mt-6">
            {[0, 1, 2].map((i) => (
              <span key={i} className="w-2 h-2 rounded-full bg-gradient-to-r from-sky-400 to-cyan-400 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
            ))}
          </div>
          <p className="relative mt-3 text-xs text-sky-600/70 dark:text-sky-400/60">Redirigiendo al panel...</p>
        </div>
      )}

      {/* ===== Fondo animado suave azul/celeste ===== */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-[-15%] left-[-8%] w-[55vw] h-[55vw] bg-sky-300/40 dark:bg-cyan-500/10 rounded-full blur-[140px] anim-blob" />
        <div className="absolute bottom-[-20%] right-[-5%] w-[45vw] h-[45vw] bg-cyan-200/50 dark:bg-sky-600/10 rounded-full blur-[140px] anim-blob" style={{ animationDelay: '-7s' }} />
        <div className="absolute top-[30%] left-[45%] w-[30vw] h-[30vw] bg-blue-200/50 dark:bg-blue-700/10 rounded-full blur-[120px] anim-blob" style={{ animationDelay: '-13s' }} />
        <div
          className="absolute inset-0 opacity-[0.5] dark:opacity-[0.2]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(59,130,246,.14) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,.14) 1px, transparent 1px)',
            backgroundSize: '56px 56px',
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 py-10 lg:py-16">

        <div className="relative overflow-hidden rounded-[2.5rem] bg-white/85 dark:bg-slate-900/85 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 shadow-2xl shadow-sky-900/10 dark:shadow-black/50 lg:grid lg:grid-cols-[1.05fr_1fr] anim-scale-in">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-500 via-blue-500 to-cyan-400" />

          {/* ===== Panel de marca (azul/celeste degradado interactivo) ===== */}
          <section
            className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-gradient-to-br from-sky-500 via-blue-600 to-cyan-500 dark:from-sky-600 dark:via-blue-700 dark:to-cyan-600 p-10 xl:p-14 text-white select-none anim-gradient-bg"
            onMouseMove={handleBrandMouseMove}
          >
            <div
              aria-hidden="true"
              className="absolute inset-0 pointer-events-none"
              style={{ background: 'radial-gradient(620px circle at var(--mx, 50%) var(--my, 50%), rgba(255,255,255,0.28), transparent 55%)' }}
            />
            <div aria-hidden="true" className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="absolute -top-24 -right-24 w-72 h-72 bg-white/20 rounded-full blur-3xl anim-blob" />
              <div className="absolute -bottom-32 -left-16 w-80 h-80 bg-cyan-300/30 rounded-full blur-3xl anim-blob" style={{ animationDelay: '-6s' }} />
              <div className="absolute top-1/3 -left-10 w-40 h-40 bg-sky-200/25 rounded-full blur-2xl anim-blob" style={{ animationDelay: '-11s' }} />
            </div>

            {/* Logo */}
            <div className="relative flex items-center gap-3 anim-fade-in-up">
              <div className="p-[2px] rounded-2xl bg-white/90 shadow-lg shadow-blue-900/20">
                <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center">
                  <span className="font-black text-lg text-blue-600">H</span>
                </div>
              </div>
              <div>
                <p className="text-lg font-black tracking-tight leading-none">HelpDesk PRO</p>
                <p className="text-[11px] text-white/70 font-semibold mt-1">Sistema de Soporte Técnico</p>
              </div>
            </div>

            {/* Bienvenida */}
            <div className="relative mt-10">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 border border-white/25 text-[11px] font-bold uppercase tracking-wider anim-fade-in-up">
                <Sparkles className="w-3.5 h-3.5" /> Bienvenido al sistema
              </div>
              <h1 className="mt-4 text-4xl xl:text-[2.75rem] font-black leading-[1.15] tracking-tight anim-fade-in-up" style={{ animationDelay: '80ms' }}>
                Soporte técnico que{' '}
                <span className="underline decoration-cyan-200/60 decoration-4 underline-offset-8">conecta</span>{' '}
                a tu equipo
              </h1>
              <p className="mt-4 text-white/85 text-base leading-relaxed max-w-md anim-fade-in-up" style={{ animationDelay: '160ms' }}>
                Centraliza tickets, técnicos e inventario, automatiza los SLA y toma decisiones con métricas en tiempo real.
              </p>
            </div>

            {/* Features */}
            <ul className="relative mt-8 space-y-3.5 max-w-md">
              {brandFeatures.map((f, i) => (
                <li key={i} className="flex items-center gap-3 anim-fade-in-up" style={{ animationDelay: `${240 + i * 90}ms` }}>
                  <span className="w-9 h-9 rounded-xl bg-white/20 border border-white/25 flex items-center justify-center shrink-0">
                    <f.icon className="w-5 h-5" />
                  </span>
                  <span className="text-sm font-medium text-white/95">{f.text}</span>
                </li>
              ))}
            </ul>

            {/* Stats */}
            <div className="relative mt-9 grid grid-cols-3 gap-3 max-w-md">
              {brandStats.map((s, i) => (
                <div key={i} className="rounded-2xl bg-white/15 border border-white/25 backdrop-blur-sm px-3 py-3 text-center anim-fade-in-up" style={{ animationDelay: `${520 + i * 90}ms` }}>
                  <p className="font-black text-xl tabular-nums">{s.value}</p>
                  <p className="text-[10px] font-semibold text-white/80 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Tarjetas flotantes */}
            {floatCards.map((c, i) => (
              <div
                key={i}
                className={`absolute ${c.pos} ${c.anim} z-10 hidden lg:flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white/25 border border-white/40 backdrop-blur-md shadow-xl shadow-blue-900/20`}
                style={{ animationDelay: c.delay }}
              >
                <span className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shrink-0 shadow">
                  <c.icon className={`w-4 h-4 ${c.color}`} />
                </span>
                <div className="leading-tight">
                  <p className="font-black text-sm tabular-nums text-white">{c.value}</p>
                  <p className="text-[10px] font-medium text-white/80">{c.label}</p>
                </div>
              </div>
            ))}
          </section>

          {/* ===== Columna de formulario ===== */}
          <section className="w-full p-6 sm:p-10 lg:p-12">
            <div className="lg:hidden text-center mb-7 anim-fade-in-up">
              <div className="inline-flex p-[2px] rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-400 anim-gradient-text shadow-lg shadow-blue-500/25 mb-3">
                <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-950 flex items-center justify-center">
                  <span className="font-black text-2xl text-slate-900 dark:text-white">H</span>
                </div>
              </div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                HelpDesk <span className="text-blue-500 dark:text-blue-400">PRO</span>
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Tu mesa de ayuda, simple y potente</p>
            </div>

            <div key={view} className="anim-fade-in-up">

              {/* === LOGIN === */}
              {view === 'login' && (
                <>
                  <div className="mb-7 text-center lg:text-left">
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center justify-center lg:justify-start gap-2">
                      <GreetingIcon className="w-6 h-6 text-blue-500" /> {greeting}
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1.5 text-sm">Ingresa a tu cuenta para continuar</p>
                  </div>

                  {error && (
                    <div key={error} className="mb-5 flex items-start gap-2.5 p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 dark:text-red-300 text-sm anim-shake">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      {error}
                    </div>
                  )}

                  <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Usuario o Correo</label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                          <Mail className="h-5 w-5 text-slate-400 dark:text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                        </div>
                        <input
                          type="text"
                          className={inputCls}
                          placeholder="ejemplo@empresa.com"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          required
                          autoFocus
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Contraseña</label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                          <Lock className="h-5 w-5 text-slate-400 dark:text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                        </div>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          className={`${inputCls} pr-11`}
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-200 transition-colors"
                          tabIndex={-1}
                        >
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => { resetForms(); setView('forgot'); }}
                        className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 transition-colors font-semibold"
                      >
                        ¿Olvidaste tu contraseña?
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || !username || !password}
                      className="btn-shine anim-btn-gradient group/btn w-full flex justify-center items-center gap-2 py-3.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-sky-500 via-blue-500 to-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg shadow-sky-500/30 hover:shadow-sky-500/50 hover:-translate-y-0.5 active:scale-[0.98]"
                    >
                      {loading ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Ingresando...</>
                      ) : (
                        <><LogIn className="w-4 h-4 transition-transform duration-300 group-hover/btn:translate-x-0.5" /> Iniciar Sesión</>
                      )}
                    </button>
                  </form>

                  <div className="mt-6 pt-6 border-t border-slate-200/70 dark:border-white/5 text-center">
                    <p className="text-slate-500 dark:text-slate-500 text-sm">
                      ¿No tienes una cuenta?{' '}
                      <button
                        onClick={() => { resetForms(); setView('register'); }}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 font-bold transition-colors"
                      >
                        Registrarse
                      </button>
                    </p>
                  </div>
                </>
              )}

              {/* === OLVIDÉ MI CONTRASEÑA === */}
              {/* === VERIFICACIÓN 2FA === */}
              {view === 'mfa' && (
                <>
                  <div className="mb-7">
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Verificación en dos pasos</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1.5 text-sm">Ingresa el código de 6 dígitos de tu app autenticadora.</p>
                  </div>

                  {mfaError && (
                    <div className="mb-5 flex items-start gap-2.5 p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 dark:text-red-300 text-sm anim-shake">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      {mfaError}
                    </div>
                  )}

                  <form onSubmit={handleVerifyMfa} className="space-y-5">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Código de verificación</label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                          <ShieldCheck className="h-5 w-5 text-slate-400 dark:text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                        </div>
                        <input
                          type="text"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          maxLength={6}
                          value={mfaCode}
                          onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                          className={inputCls + ' tracking-[0.5em] font-mono text-center'}
                          placeholder="000000"
                          autoFocus
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={mfaLoading || mfaCode.length !== 6}
                      className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-lg shadow-sky-500/20"
                    >
                      {mfaLoading ? 'Verificando...' : 'Verificar e ingresar'}
                    </button>

                    <button
                      type="button"
                      onClick={() => { setView('login'); setMfaError(''); setMfaCode(''); }}
                      className="w-full text-center text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-medium"
                    >
                      Volver al inicio de sesión
                    </button>
                  </form>
                </>
              )}

              {view === 'forgot' && (
                <>
                  <button
                    onClick={() => { resetForms(); setView('login'); }}
                    className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-sm font-semibold mb-6 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" /> Volver al inicio de sesión
                  </button>

                  <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-14 h-14 bg-amber-500/10 border border-amber-500/20 rounded-2xl mb-3 anim-scale-in">
                      <Lock className="w-7 h-7 text-amber-500 dark:text-amber-400" />
                    </div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white">¿Olvidaste tu contraseña?</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 leading-relaxed">
                      Ingresa tu correo electrónico y te enviaremos un enlace para restablecerla.
                    </p>
                  </div>

                  {forgotError && (
                    <div key={forgotError} className="mb-4 flex items-start gap-2.5 p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 dark:text-red-300 text-sm anim-shake">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      {forgotError}
                    </div>
                  )}

                  <form onSubmit={handleForgotPassword} className="space-y-5">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Correo Electrónico</label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                          <Mail className="h-5 w-5 text-slate-400 dark:text-slate-500 group-focus-within:text-amber-400 transition-colors" />
                        </div>
                        <input
                          type="email"
                          className={inputCls}
                          placeholder="tu@correo.com"
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          required
                          autoFocus
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={forgotLoading || !forgotEmail}
                      className="btn-shine w-full flex justify-center items-center gap-2 py-3.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-amber-500 to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:-translate-y-0.5 active:scale-[0.98]"
                    >
                      {forgotLoading ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
                      ) : (
                        'Enviar Instrucciones'
                      )}
                    </button>
                  </form>
                </>
              )}

              {/* === CORREO ENVIADO (recuperación) === */}
              {view === 'forgot-sent' && (
                <div className="text-center py-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500/15 rounded-full mb-4 anim-ring-pulse">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 dark:text-emerald-400 anim-scale-in" />
                  </div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2">Correo Enviado</h2>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 leading-relaxed">
                    Si existe una cuenta con ese correo, recibirás un enlace para restablecer tu contraseña. Revisa tu bandeja de entrada.
                  </p>
                  <button
                    onClick={() => { resetForms(); setView('login'); }}
                    className="btn-shine w-full flex justify-center items-center gap-2 py-3.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-sky-500 to-cyan-500 transition-all duration-300 shadow-lg shadow-sky-500/30 hover:-translate-y-0.5 active:scale-[0.98]"
                  >
                    <ArrowLeft className="w-4 h-4" /> Volver al Inicio de Sesión
                  </button>
                </div>
              )}

              {/* === REGISTRO === */}
              {view === 'register' && (
                <>
                  <button
                    onClick={() => { resetForms(); setView('login'); }}
                    className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-sm font-semibold mb-5 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" /> Volver al inicio de sesión
                  </button>

                  <div className="text-center mb-5">
                    <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-500/10 border border-blue-500/20 rounded-2xl mb-3 anim-scale-in">
                      <UserPlus className="w-7 h-7 text-blue-500 dark:text-blue-400" />
                    </div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white">Crear Nueva Cuenta</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1.5">
                      Un administrador activará tu cuenta después del registro.
                    </p>
                  </div>

                  {regError && (
                    <div key={regError} className="mb-4 flex items-start gap-2.5 p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 dark:text-red-300 text-sm anim-shake">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      {regError}
                    </div>
                  )}

                  <form onSubmit={handleRegister} className="space-y-3.5">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Nombre *</label>
                        <input
                          type="text"
                          required
                          value={regData.nombre}
                          onChange={(e) => handleRegChange('nombre', e.target.value)}
                          className={inputRegCls(!!regErrors.nombre)}
                          placeholder="Juan"
                        />
                        {regErrors.nombre && <p className="text-red-400 text-xs mt-1">{regErrors.nombre}</p>}
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Apellidos *</label>
                        <input
                          type="text"
                          required
                          value={regData.apellidos}
                          onChange={(e) => handleRegChange('apellidos', e.target.value)}
                          className={inputRegCls(!!regErrors.apellidos)}
                          placeholder="Pérez"
                        />
                        {regErrors.apellidos && <p className="text-red-400 text-xs mt-1">{regErrors.apellidos}</p>}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Correo Electrónico *</label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Mail className="h-4 w-4 text-slate-400 dark:text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                        </div>
                        <input
                          type="email"
                          required
                          value={regData.email}
                          onChange={(e) => handleRegChange('email', e.target.value)}
                          className={`${inputRegCls(!!regErrors.email)} pl-9`}
                          placeholder="juan@correo.com"
                        />
                      </div>
                      {regErrors.email && <p className="text-red-400 text-xs mt-1">{regErrors.email}</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Nombre de Usuario *</label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <User className="h-4 w-4 text-slate-400 dark:text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                        </div>
                        <input
                          type="text"
                          required
                          value={regData.username}
                          onChange={(e) => handleRegChange('username', e.target.value)}
                          className={`${inputRegCls(!!regErrors.username)} pl-9`}
                          placeholder="juanperez"
                        />
                      </div>
                      {regErrors.username && <p className="text-red-400 text-xs mt-1">{regErrors.username}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Contraseña *</label>
                        <div className="relative">
                          <input
                            type={showRegPassword ? 'text' : 'password'}
                            required
                            value={regData.password}
                            onChange={(e) => handleRegChange('password', e.target.value)}
                            className={`${inputRegCls(!!regErrors.password)} pr-10`}
                            placeholder="••••••••"
                          />
                          <button type="button" onClick={() => setShowRegPassword(!showRegPassword)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors" tabIndex={-1}>
                            {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {regErrors.password && <p className="text-red-400 text-xs mt-1">{regErrors.password}</p>}
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Confirmar *</label>
                        <input
                          type="password"
                          required
                          value={regData.confirmPassword}
                          onChange={(e) => handleRegChange('confirmPassword', e.target.value)}
                          className={inputRegCls(!!regErrors.confirmPassword)}
                          placeholder="••••••••"
                        />
                        {regErrors.confirmPassword && <p className="text-red-400 text-xs mt-1">{regErrors.confirmPassword}</p>}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Teléfono</label>
                        <input
                          type="tel"
                          value={regData.telefono}
                          onChange={(e) => handleRegChange('telefono', e.target.value)}
                          className={inputRegCls(!!regErrors.telefono)}
                          placeholder="+52 123 456"
                        />
                        {regErrors.telefono && <p className="text-red-400 text-xs mt-1">{regErrors.telefono}</p>}
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Dirección</label>
                        <input
                          type="text"
                          value={regData.direccion}
                          onChange={(e) => handleRegChange('direccion', e.target.value)}
                          className={inputRegCls(!!regErrors.direccion)}
                          placeholder="Calle #123"
                        />
                        {regErrors.direccion && <p className="text-red-400 text-xs mt-1">{regErrors.direccion}</p>}
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={regLoading || Object.keys(regErrors).length > 0}
                      className="btn-shine w-full flex justify-center items-center gap-2 py-3.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-sky-500 via-blue-500 to-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg shadow-sky-500/30 hover:shadow-sky-500/50 hover:-translate-y-0.5 active:scale-[0.98] mt-1.5"
                    >
                      {regLoading ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Creando cuenta...</>
                      ) : (
                        <><UserPlus className="w-4 h-4" /> Crear Cuenta</>
                      )}
                    </button>
                  </form>
                </>
              )}

              {/* === REGISTRO ENVIADO === */}
              {view === 'register-sent' && (
                <div className="text-center py-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500/15 rounded-full mb-4 anim-ring-pulse">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 dark:text-emerald-400 anim-scale-in" />
                  </div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2">Solicitud Enviada</h2>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 leading-relaxed">
                    Tu cuenta fue creada exitosamente. Un administrador la revisará y activará; recibirás un aviso cuando esté lista.
                  </p>
                  <button
                    onClick={() => { resetForms(); setView('login'); }}
                    className="btn-shine w-full flex justify-center items-center gap-2 py-3.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-sky-500 to-cyan-500 transition-all duration-300 shadow-lg shadow-sky-500/30 hover:-translate-y-0.5 active:scale-[0.98]"
                  >
                    <ArrowLeft className="w-4 h-4" /> Volver al Inicio de Sesión
                  </button>
                </div>
              )}
            </div>
            </section>
          </div>

          <p className="text-center text-slate-400 dark:text-slate-600 text-xs mt-6 anim-fade-in" style={{ animationDelay: '400ms' }}>
            HelpDesk PRO · Sistema de Gestión de Soporte Técnico
          </p>
        </div>
      </div>
  );
}
