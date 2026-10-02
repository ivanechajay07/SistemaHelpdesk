import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { useNavigate } from 'react-router-dom';
import api from '../lib/axios';
import {
  Lock, Mail, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, ArrowLeft,
  UserPlus, User, ShieldCheck, Sun, Moon, Sunrise, LogIn
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-100 dark:from-slate-950 dark:via-slate-950 dark:to-indigo-950 relative overflow-hidden flex items-center transition-colors duration-500">
      {/* ===== Botón claro / oscuro ===== */}
      <button
        onClick={toggleTheme}
        title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        className="fixed top-5 right-5 z-30 p-2.5 rounded-xl bg-white/70 dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 backdrop-blur-md text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:scale-105 active:scale-95 shadow-lg transition-all duration-300"
      >
        {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>

      {/* ===== Overlay de bienvenida al iniciar sesión ===== */}
      {welcomeName && (
        <div className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-xl anim-overlay-in">
          <div className="relative w-28 h-28 mb-6">
            <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
              <defs>
                <linearGradient id="loginRing" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#60a5fa" />
                  <stop offset="100%" stopColor="#a78bfa" />
                </linearGradient>
              </defs>
              <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="6" />
              <circle cx="50" cy="50" r="44" fill="none" stroke="url(#loginRing)" strokeWidth="6" strokeLinecap="round" className="anim-ring-fill" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center text-white font-black text-2xl">
                {welcomeName.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight anim-fade-in-up">Preparando tu espacio</h2>
          <p className="mt-2 text-sm text-slate-400 anim-fade-in-up" style={{ animationDelay: '120ms' }}>
            Hola, {welcomeName}
          </p>
          <div className="flex items-center gap-1.5 mt-6">
            {[0, 1, 2].map((i) => (
              <span key={i} className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-400 to-violet-400 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">Redirigiendo al panel...</p>
        </div>
      )}

      {/* ===== Fondo animado ===== */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-[-15%] left-[-8%] w-[55vw] h-[55vw] bg-blue-500/15 dark:bg-blue-600/20 rounded-full blur-[140px] anim-blob" />
        <div className="absolute bottom-[-20%] right-[-5%] w-[45vw] h-[45vw] bg-violet-500/15 dark:bg-violet-600/20 rounded-full blur-[140px] anim-blob" style={{ animationDelay: '-7s' }} />
        <div className="absolute top-[30%] left-[45%] w-[30vw] h-[30vw] bg-fuchsia-400/10 dark:bg-fuchsia-500/10 rounded-full blur-[120px] anim-blob" style={{ animationDelay: '-13s' }} />
        <div
          className="absolute inset-0 opacity-[0.05] dark:opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(100,116,139,.4) 1px, transparent 1px), linear-gradient(90deg, rgba(100,116,139,.4) 1px, transparent 1px)',
            backgroundSize: '56px 56px',
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md mx-auto px-4 sm:px-6 py-10">

        {/* ===== Marca (centrado) ===== */}
        <div className="text-center mb-7 anim-fade-in-up">
          <div className="inline-flex p-[2px] rounded-2xl bg-gradient-to-tr from-blue-500 via-fuchsia-500 to-amber-400 anim-gradient-text shadow-lg shadow-blue-500/25 mb-3">
            <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-950 flex items-center justify-center">
              <span className="font-black text-2xl text-slate-900 dark:text-white">H</span>
            </div>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            HelpDesk <span className="text-blue-500 dark:text-blue-400">PRO</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Tu mesa de ayuda, simple y potente
          </p>
        </div>

          <div
            className="relative overflow-hidden bg-white/85 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl shadow-slate-300/40 dark:shadow-black/50 p-6 sm:p-8 anim-fade-in-up"
            style={{ animationDelay: '120ms' }}
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-fuchsia-500 to-amber-400" />
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
                      className="btn-shine anim-btn-gradient group/btn w-full flex justify-center items-center gap-2 py-3.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5 active:scale-[0.98]"
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
                      className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/20"
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
                    className="btn-shine w-full flex justify-center items-center gap-2 py-3.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-300 shadow-lg shadow-blue-500/25 hover:-translate-y-0.5 active:scale-[0.98]"
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
                      className="btn-shine w-full flex justify-center items-center gap-2 py-3.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5 active:scale-[0.98] mt-1.5"
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
                    className="btn-shine w-full flex justify-center items-center gap-2 py-3.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-300 shadow-lg shadow-blue-500/25 hover:-translate-y-0.5 active:scale-[0.98]"
                  >
                    <ArrowLeft className="w-4 h-4" /> Volver al Inicio de Sesión
                  </button>
                </div>
              )}
            </div>
          </div>

        <p className="text-center text-slate-400 dark:text-slate-600 text-xs mt-6 anim-fade-in" style={{ animationDelay: '400ms' }}>
          HelpDesk PRO · Sistema de Gestión de Soporte Técnico
        </p>
      </div>
    </div>
  );
}
