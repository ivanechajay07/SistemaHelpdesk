import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import PasswordStrength from '../components/ui/PasswordStrength';
import { QRCodeSVG } from 'qrcode.react';
import { passwordError } from '../lib/passwordPolicy';
import {
  Lock, Mail, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, ArrowLeft, Clock,
  UserPlus, User, ShieldCheck, Sun, Moon, Sunrise, LogIn,
  Headphones, Zap, BarChart3, Star, Sparkles
} from 'lucide-react';

type View = 'login' | 'mfa' | 'mfa-setup' | 'forgot' | 'register' | 'forgot-sent' | 'register-sent';

const inputCls =
  'block w-full pl-11 pr-4 py-3 rounded-xl bg-white/80 dark:bg-white/[0.06] backdrop-blur-sm border border-slate-200/90 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 caret-blue-500 shadow-sm focus:bg-white/95 dark:focus:bg-white/[0.09] focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400/60 hover:border-slate-300 hover:bg-white/90 dark:hover:border-white/20 transition-all duration-300';

const inputRegCls = (hasError: boolean) =>
  `w-full px-3 py-2.5 rounded-xl bg-white/80 dark:bg-white/[0.06] backdrop-blur-sm border ${
    hasError ? 'border-red-500/60 focus:border-red-400' : 'border-slate-200/90 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 focus:border-blue-400/50'
  } text-slate-900 dark:text-white text-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all duration-300`;

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
  const [capsLock, setCapsLock] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [welcomeName, setWelcomeName] = useState('');
  // Aviso cuando la sesión se cerró automáticamente por inactividad.
  const [sessionNotice] = useState(() =>
    new URLSearchParams(window.location.search).get('reason') === 'idle'
      ? 'Tu sesión se cerró por inactividad. Inicia sesión nuevamente.'
      : '',
  );
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('reason') === 'idle') {
      window.history.replaceState({}, '', '/login');
    }
  }, []);

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
  const [mfaSetupToken, setMfaSetupToken] = useState('');
  const [mfaSetupSecret, setMfaSetupSecret] = useState('');
  const [mfaSetupUrl, setMfaSetupUrl] = useState('');
  const [mfaSetupCode, setMfaSetupCode] = useState('');
  const [mfaSetupError, setMfaSetupError] = useState('');
  const [mfaSetupLoading, setMfaSetupLoading] = useState(false);

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
    }, data.accessToken);
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
      const { data } = await authService.verifyMfa(mfaToken, mfaCode.trim());
      finalizeLogin(data);
    } catch (err: any) {
      setMfaError(err.response?.data?.message || 'Código inválido. Intenta nuevamente.');
    } finally {
      setMfaLoading(false);
    }
  };

  const handleCompleteMfaSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setMfaSetupError('');
    setMfaSetupLoading(true);
    try {
      const { data } = await authService.completeMfaSetup(mfaSetupToken, mfaSetupCode.trim());
      finalizeLogin(data);
    } catch (err: any) {
      setMfaSetupError(err.response?.data?.message || 'Código inválido. Verifica la hora de tu dispositivo.');
    } finally {
      setMfaSetupLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await authService.login(username, password);
      if (data.mfaRequired) {
        setMfaToken(data.mfaToken);
        setMfaCode('');
        setMfaError('');
        setView('mfa');
        return;
      }
      if (data.mfaSetupRequired) {
        setMfaSetupToken(data.mfaSetupToken);
        setMfaSetupSecret(data.mfaSetupSecret);
        setMfaSetupUrl(data.mfaSetupOtpauthUrl);
        setMfaSetupCode('');
        setMfaSetupError('');
        setView('mfa-setup');
        return;
      }
      finalizeLogin(data);
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError(err.response?.data?.message || 'Credenciales inválidas. Verifica tu usuario y contraseña.');
      } else if (err.response?.status === 403) {
        setError(err.response?.data?.message || 'El servidor rechazó la solicitud. Verifica la configuración de red o contacta al administrador.');
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
      await authService.forgotPassword(forgotEmail);
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
        return passwordError(value);
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
      await authService.register({
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
      const status = err.response?.status;
      const data = err.response?.data;
      const campos = data && typeof data === 'object' ? data : null;

      if (!err.response) {
        setRegError('No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.');
      } else if (campos && typeof campos === 'object' && !campos.message) {
        // Errores de validación del backend: { email: '...', username: '...' }
        setRegErrors(campos as Record<string, string>);
        setRegError('Revisa los campos marcados.');
      } else if (status === 429) {
        setRegError('Demasiados intentos de registro. Espera un minuto e inténtalo de nuevo.');
      } else if (status === 403) {
        setRegError('El servidor rechazó la solicitud. Contacta al administrador.');
      } else {
        setRegError(data?.message || 'Error al registrar. Intenta más tarde.');
      }
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
    { icon: Zap, color: 'text-blue-500', value: '< 5 min', label: 'Respuesta SLA', pos: 'bottom-36 left-8', anim: 'anim-float-slower', delay: '-3s' },
  ];

  return (
    <div className="min-h-screen safe-top safe-bottom bg-gradient-to-br from-white via-slate-50 to-cyan-50 dark:from-slate-950 dark:via-slate-950 dark:to-blue-950/60 relative overflow-hidden flex items-center transition-colors duration-500">
      {/* ===== Botón claro / oscuro ===== */}
      <button
        onClick={toggleTheme}
        title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        style={{ top: 'calc(var(--safe-area-inset-top, env(safe-area-inset-top, 0px)) + 1.25rem)' }}
        className="fixed right-5 z-30 p-2.5 rounded-xl bg-white/70 dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 backdrop-blur-md text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:scale-105 active:scale-95 shadow-lg transition-all duration-300"
      >
        {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>

      {/* ===== Overlay de bienvenida al iniciar sesión (suave y animado) ===== */}
      {welcomeName && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-hidden bg-gradient-to-br from-white via-slate-50 to-blue-50 backdrop-blur-2xl anim-overlay-in dark:from-blue-950 dark:via-slate-950 dark:to-slate-950">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            <div className="absolute -right-20 -top-24 h-80 w-80 rounded-full bg-blue-200/50 blur-3xl anim-blob dark:bg-blue-500/10" />
            <div className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-cyan-100/60 blur-3xl anim-blob dark:bg-blue-600/10" style={{ animationDelay: '-6s' }} />
            <div className="absolute left-1/3 top-1/3 h-48 w-48 rounded-full bg-sky-100/50 blur-2xl anim-blob dark:bg-blue-700/10" style={{ animationDelay: '-11s' }} />
            {[
              { top: '28%', left: '30%', delay: '0s' },
              { top: '38%', left: '70%', delay: '-2s' },
              { top: '64%', left: '36%', delay: '-4s' },
            ].map((p, i) => (
              <span
                key={i}
                className="absolute h-1.5 w-1.5 rounded-full bg-blue-400/60 shadow-[0_0_14px_rgba(59,130,246,0.7)] anim-login-particle dark:bg-cyan-300/60"
                style={{ top: p.top, left: p.left, animationDelay: p.delay }}
              />
            ))}
          </div>

          <div className="relative w-full max-w-sm px-6 anim-scale-in">
            <div className="pointer-events-none absolute -inset-6 rounded-[40px] bg-gradient-to-br from-blue-500/20 via-cyan-400/10 to-emerald-400/20 blur-3xl" />
            <div className="relative overflow-hidden rounded-[30px] border border-white/70 bg-white/80 p-8 text-center shadow-2xl shadow-blue-900/15 ring-1 ring-slate-900/5 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/75">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 via-cyan-400 to-emerald-400" />
              <div className="pointer-events-none absolute inset-0 rounded-[30px] ring-1 ring-inset ring-white/50 dark:ring-white/10" />

              <div className="relative mx-auto flex h-24 w-24 items-center justify-center">
                <span className="absolute inset-0 rounded-[30px] bg-gradient-to-br from-blue-500/25 to-cyan-400/25 blur-lg" />
                <span className="absolute -inset-2 rounded-[34px] border border-blue-400/30 anim-ring-pulse dark:border-cyan-400/20" />
                <div className="relative flex h-20 w-20 items-center justify-center rounded-[26px] bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-400 text-3xl font-black text-white shadow-xl shadow-blue-500/30 ring-1 ring-white/30">
                  {welcomeName.charAt(0).toUpperCase()}
                </div>
              </div>

              <h2 className="relative mt-6 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                ¡Todo listo, <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">{welcomeName}</span>!
              </h2>
              <p className="relative mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
                Preparando tu espacio de trabajo...
              </p>

              <div className="relative mt-6 h-1.5 overflow-hidden rounded-full bg-slate-200/80 dark:bg-white/10">
                <div className="anim-progress h-full rounded-full bg-gradient-to-r from-blue-600 via-cyan-400 to-emerald-400" />
              </div>

              <div className="relative mt-4 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Sesión segura verificada
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== Fondo animado corporativo ===== */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-[-15%] left-[-8%] w-[55vw] h-[55vw] bg-blue-200/50 dark:bg-blue-500/10 rounded-full blur-[140px] anim-blob" />
        <div className="absolute bottom-[-20%] right-[-5%] w-[45vw] h-[45vw] bg-cyan-100/60 dark:bg-cyan-500/10 rounded-full blur-[140px] anim-blob" style={{ animationDelay: '-7s' }} />
        <div className="absolute top-[30%] left-[45%] w-[30vw] h-[30vw] bg-emerald-100/40 dark:bg-emerald-500/[0.08] rounded-full blur-[120px] anim-blob" style={{ animationDelay: '-13s' }} />
        {/* Aurora cónica en rotación lenta */}
        <div className="absolute left-1/2 top-1/2 h-[85vmax] w-[85vmax] rounded-full bg-[conic-gradient(from_90deg,rgba(37,99,235,0.16),transparent_25%,rgba(34,211,238,0.14),transparent_55%,rgba(16,185,129,0.10),transparent_82%)] opacity-70 blur-[90px] anim-login-aurora dark:opacity-40" />
        {/* Partículas flotantes */}
        {[
          { top: '18%', left: '12%', delay: '0s', size: 'h-1.5 w-1.5' },
          { top: '28%', left: '82%', delay: '-2s', size: 'h-1 w-1' },
          { top: '62%', left: '8%', delay: '-4s', size: 'h-1 w-1' },
          { top: '74%', left: '76%', delay: '-1s', size: 'h-2 w-2' },
          { top: '44%', left: '92%', delay: '-3s', size: 'h-1 w-1' },
        ].map((p, i) => (
          <span
            key={i}
            className={`absolute ${p.size} rounded-full bg-blue-500/50 shadow-[0_0_12px_rgba(59,130,246,0.65)] anim-login-particle dark:bg-cyan-300/60`}
            style={{ top: p.top, left: p.left, animationDelay: p.delay }}
          />
        ))}
        <div
          className="absolute inset-0 opacity-[0.35] dark:opacity-[0.2]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(79,70,229,.10) 1px, transparent 1px), linear-gradient(90deg, rgba(79,70,229,.10) 1px, transparent 1px)',
            backgroundSize: '56px 56px',
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 py-10 lg:py-16">

        <div className="relative overflow-hidden rounded-[2.5rem] bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-white/70 dark:border-white/10 shadow-2xl shadow-blue-900/15 dark:shadow-black/50 lg:grid lg:grid-cols-[1.05fr_1fr] anim-scale-in">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-cyan-400 to-emerald-400" />
          <div className="pointer-events-none absolute inset-0 rounded-[2.5rem] ring-1 ring-inset ring-white/50 dark:ring-white/10" />
          <div className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/25 to-transparent anim-login-sheen dark:via-cyan-200/10" />

          {/* ===== Panel de marca (degradado corporativo interactivo) ===== */}
          <section
            className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-10 xl:p-14 text-white select-none"
            onMouseMove={handleBrandMouseMove}
          >
            {/* Aurora y malla del sistema visual */}
            <div
              aria-hidden="true"
              className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_18%_12%,rgba(56,189,248,0.28),transparent_38%),radial-gradient(circle_at_82%_8%,rgba(34,211,238,0.22),transparent_42%),radial-gradient(circle_at_60%_105%,rgba(16,185,129,0.18),transparent_42%)]"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 pointer-events-none opacity-[0.10]"
              style={{
                backgroundImage:
                  'linear-gradient(rgba(255,255,255,.75) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.75) 1px, transparent 1px)',
                backgroundSize: '36px 36px',
                maskImage: 'radial-gradient(ellipse at 30% 20%, black, transparent 78%)',
              }}
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 pointer-events-none"
              style={{ background: 'radial-gradient(620px circle at var(--mx, 50%) var(--my, 50%), rgba(255,255,255,0.16), transparent 55%)' }}
            />
            <div aria-hidden="true" className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="absolute -top-24 -right-24 w-72 h-72 bg-white/20 rounded-full blur-3xl anim-blob" />
              <div className="absolute -bottom-32 -left-16 w-80 h-80 bg-blue-300/30 rounded-full blur-3xl anim-blob" style={{ animationDelay: '-6s' }} />
              <div className="absolute top-1/3 -left-10 w-40 h-40 bg-blue-200/25 rounded-full blur-2xl anim-blob" style={{ animationDelay: '-11s' }} />
            </div>

            {/* Logo */}
            <div className="relative flex items-center gap-3 anim-fade-in-up">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 via-sky-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/30 ring-1 ring-white/20">
                <span className="font-black text-sm tracking-tight text-white">HD</span>
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
                <span className="underline decoration-blue-200/70 decoration-4 underline-offset-8">conecta</span>{' '}
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
          <section className="flex w-full flex-col justify-center p-6 sm:p-10 lg:p-12">
            <div className="lg:hidden text-center mb-7 anim-fade-in-up">
              <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 via-sky-500 to-cyan-400 items-center justify-center shadow-lg shadow-blue-500/30 ring-1 ring-white/20 mb-3">
                <span className="font-black text-lg tracking-tight text-white">HD</span>
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
                  <div className="mb-7 text-center anim-fade-in-up lg:text-left">
                    <span className="inline-flex items-center gap-2 rounded-full border border-blue-200/70 bg-blue-50/70 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-blue-700 dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-300">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                      </span>
                      Acceso seguro
                    </span>
                    <h2 className="mt-3 flex items-center justify-center gap-2.5 text-3xl font-black tracking-tight text-slate-900 dark:text-white lg:justify-start">
                      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/25">
                        <GreetingIcon className="h-5 w-5" />
                      </span>
                      {greeting}
                    </h2>
                    <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                      Ingresa a tu cuenta para continuar <span className="text-blue-500/70">·</span> tu espacio de trabajo te espera
                    </p>
                  </div>

                  {sessionNotice && (
                    <div className="mb-5 flex items-start gap-2.5 p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-700 dark:text-amber-300 text-sm">
                      <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{sessionNotice}</span>
                    </div>
                  )}

                  {error && (
                    <div key={error} className="mb-5 flex items-start gap-2.5 p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 dark:text-red-300 text-sm anim-shake">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      {error}
                    </div>
                  )}

                  <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                      <label htmlFor="login-username" className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Usuario o Correo
                      </label>
                      <div className="group relative rounded-xl transition-all duration-300 focus-within:shadow-[0_0_0_4px_rgba(59,130,246,0.10),0_0_28px_-8px_rgba(59,130,246,0.45)]">
                        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-3.5 transition-transform duration-300 group-focus-within:-rotate-3 group-focus-within:scale-110">
                          <Mail className="h-5 w-5 text-slate-500 transition-colors group-focus-within:text-blue-500 dark:text-slate-400" />
                        </div>
                        <input
                          id="login-username"
                          type="text"
                          name="username"
                          autoComplete="username"
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
                      <label htmlFor="login-password" className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Contraseña
                      </label>
                      <div className="group relative rounded-xl transition-all duration-300 focus-within:shadow-[0_0_0_4px_rgba(59,130,246,0.10),0_0_28px_-8px_rgba(59,130,246,0.45)]">
                        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-3.5 transition-transform duration-300 group-focus-within:-rotate-3 group-focus-within:scale-110">
                          <Lock className="h-5 w-5 text-slate-500 transition-colors group-focus-within:text-blue-500 dark:text-slate-400" />
                        </div>
                        <input
                          id="login-password"
                          type={showPassword ? 'text' : 'password'}
                          name="password"
                          autoComplete="current-password"
                          className={`${inputCls} pr-11`}
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          onKeyUp={(e) => setCapsLock(e.getModifierState('CapsLock'))}
                          onKeyDown={(e) => setCapsLock(e.getModifierState('CapsLock'))}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                          className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 transition-all hover:scale-110 hover:text-slate-600 active:scale-95 dark:text-slate-500 dark:hover:text-slate-200"
                          tabIndex={-1}
                        >
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                      {capsLock && (
                        <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400 anim-fade-in">
                          <AlertCircle className="h-3.5 w-3.5" /> Bloq Mayús está activado
                        </p>
                      )}
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
                      aria-busy={loading}
                      className="btn-shine anim-btn-gradient group/btn relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 via-blue-600 to-cyan-500 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-500/40 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-blue-500/60 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {loading ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Verificando credenciales...</>
                      ) : (
                        <>
                          <LogIn className="w-4 h-4 transition-transform duration-300 group-hover/btn:translate-x-0.5" />
                          Iniciar Sesión
                          <span className="ml-1 hidden h-5 items-center rounded-md border border-white/25 bg-white/10 px-1.5 text-[10px] font-black text-white/80 sm:inline-flex">
                            ↵
                          </span>
                        </>
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

              {/* === CONFIGURACIÓN OBLIGATORIA 2FA (ADMIN) === */}
              {view === 'mfa-setup' && (
                <>
                  <div className="mb-6 text-center lg:text-left">
                    <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/25">
                      <ShieldCheck className="h-6 w-6" />
                    </div>
                    <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                      Protege tu cuenta
                    </h2>
                    <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                      Como administrador debes configurar Google Authenticator antes de entrar.
                    </p>
                  </div>

                  <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
                    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-950">
                      {mfaSetupUrl ? (
                        <QRCodeSVG value={mfaSetupUrl} size={148} aria-label="Código QR para Google Authenticator" />
                      ) : (
                        <div className="flex h-[148px] w-[148px] items-center justify-center text-xs text-slate-400">Generando QR...</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                      <p><strong>1.</strong> Abre Google Authenticator, Authy o 1Password.</p>
                      <p><strong>2.</strong> Escanea el código QR.</p>
                      <p><strong>3.</strong> Ingresa el código de 6 dígitos.</p>
                      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/60">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Secreto manual</p>
                        <code className="mt-1 block break-all font-mono text-[11px] font-bold text-slate-700 dark:text-slate-200">
                          {mfaSetupSecret}
                        </code>
                      </div>
                    </div>
                  </div>

                  {mfaSetupError && (
                    <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-sm text-red-500 dark:text-red-300">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      {mfaSetupError}
                    </div>
                  )}

                  <form onSubmit={handleCompleteMfaSetup} className="mt-5 space-y-4">
                    <div>
                      <label htmlFor="mfa-setup-code" className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Código de Google Authenticator
                      </label>
                      <input
                        id="mfa-setup-code"
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        value={mfaSetupCode}
                        onChange={(e) => setMfaSetupCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="000000"
                        autoFocus
                        className={`${inputCls} text-center font-mono text-lg tracking-[0.45em]`}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={mfaSetupLoading || mfaSetupCode.length !== 6}
                      className="btn-shine flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {mfaSetupLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Activando...</> : <><ShieldCheck className="h-4 w-4" /> Activar y entrar</>}
                    </button>
                  </form>

                  <button
                    type="button"
                    onClick={() => { setView('login'); setMfaSetupError(''); setMfaSetupCode(''); }}
                    className="mt-4 w-full text-center text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    Volver al inicio de sesión
                  </button>
                </>
              )}

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
                        <div className="absolute inset-y-0 left-0 z-10 pl-3.5 flex items-center pointer-events-none">
                          <ShieldCheck className="h-5 w-5 text-slate-500 dark:text-slate-400 group-focus-within:text-blue-400 transition-colors" />
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
                      className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/30"
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
                        <div className="absolute inset-y-0 left-0 z-10 pl-3.5 flex items-center pointer-events-none">
                          <Mail className="h-5 w-5 text-slate-500 dark:text-slate-400 group-focus-within:text-amber-400 transition-colors" />
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
                    className="btn-shine w-full flex justify-center items-center gap-2 py-3.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-cyan-500 transition-all duration-300 shadow-lg shadow-blue-500/40 hover:-translate-y-0.5 active:scale-[0.98]"
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
                        <div className="absolute inset-y-0 left-0 z-10 pl-3 flex items-center pointer-events-none">
                          <Mail className="h-4 w-4 text-slate-500 dark:text-slate-400 group-focus-within:text-blue-400 transition-colors" />
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
                        <div className="absolute inset-y-0 left-0 z-10 pl-3 flex items-center pointer-events-none">
                          <User className="h-4 w-4 text-slate-500 dark:text-slate-400 group-focus-within:text-blue-400 transition-colors" />
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
                            maxLength={12}
                            autoComplete="new-password"
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
                        <PasswordStrength value={regData.password} />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Confirmar *</label>
                        <input
                          type="password"
                          required
                          maxLength={12}
                          autoComplete="new-password"
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
                      className="btn-shine w-full flex justify-center items-center gap-2 py-3.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 via-blue-600 to-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg shadow-blue-500/40 hover:shadow-blue-500/60 hover:-translate-y-0.5 active:scale-[0.98] mt-1.5"
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
                    className="btn-shine w-full flex justify-center items-center gap-2 py-3.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-cyan-500 transition-all duration-300 shadow-lg shadow-blue-500/40 hover:-translate-y-0.5 active:scale-[0.98]"
                  >
                    <ArrowLeft className="w-4 h-4" /> Volver al Inicio de Sesión
                  </button>
                </div>
              )}
            </div>
            </section>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2 anim-fade-in" style={{ animationDelay: '400ms' }}>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-white/[0.04] px-2.5 py-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
              <ShieldCheck className="w-3 h-3 text-emerald-500" /> Conexión protegida
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-white/[0.04] px-2.5 py-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
              <Clock className="w-3 h-3 text-blue-500" /> Cierre por inactividad
            </span>
          </div>
          <p className="text-center text-slate-400 dark:text-slate-600 text-[11px] mt-3">
            HelpDesk PRO · Sistema de Gestión de Soporte Técnico
          </p>
        </div>
      </div>
  );
}
