import React, { useState, useEffect, useMemo } from 'react';
import { X, UserPlus, Save, Eye, EyeOff, Check, AlertCircle } from 'lucide-react';
import type { User } from '../../store/userStore';
import { useRoleStore } from '../../store/roleStore';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  user: User | null;
}

const emptyForm = {
  username: '',
  email: '',
  password: '',
  nombre: '',
  apellidos: '',
  telefono: '',
  direccion: '',
  activo: true,
  roleIds: [] as number[],
};

export function UserModal({ isOpen, onClose, onSubmit, user }: UserModalProps) {
  const { roles, fetchRoles } = useRoleStore();

  useEffect(() => {
    if (roles.length === 0) fetchRoles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [formData, setFormData] = useState({ ...emptyForm });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (user) {
      const userRoleIds = user.roles
        .map((roleName) => roles.find((r) => r.name === roleName)?.id)
        .filter((id): id is number => id !== undefined);
      setFormData({
        username: user.username,
        email: user.email,
        password: '',
        nombre: user.nombre,
        apellidos: user.apellidos,
        telefono: (user as any).telefono || '',
        direccion: (user as any).direccion || '',
        activo: user.activo,
        roleIds: userRoleIds.length > 0 ? userRoleIds : (roles.length > 0 ? [roles[0].id] : []),
      });
    } else {
      setFormData({
        ...emptyForm,
        roleIds: roles.length > 0 ? [roles.find((r) => r.name === 'TECNICO')?.id || roles[0].id] : [],
      });
    }
    setErrors({});
    setShowPassword(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isOpen, roles]);

  const passwordChecks = useMemo(() => ([
    { label: 'Mínimo 8 caracteres', ok: formData.password.length >= 8 },
    { label: 'Al menos una mayúscula', ok: /[A-Z]/.test(formData.password) },
    { label: 'Al menos una minúscula', ok: /[a-z]/.test(formData.password) },
    { label: 'Al menos un número', ok: /\d/.test(formData.password) },
  ]), [formData.password]);

  if (!isOpen) return null;

  const validateField = (name: string, value: string): string => {
    switch (name) {
      case 'nombre':
        if (!value.trim()) return 'El nombre es requerido';
        if (value.trim().length < 2) return 'Mínimo 2 caracteres';
        if (value.trim().length > 100) return 'Máximo 100 caracteres';
        return '';
      case 'apellidos':
        if (!value.trim()) return 'Los apellidos son requeridos';
        if (value.trim().length < 2) return 'Mínimo 2 caracteres';
        if (value.trim().length > 100) return 'Máximo 100 caracteres';
        return '';
      case 'username':
        if (!value.trim()) return 'El usuario es requerido';
        if (value.trim().length < 3) return 'Mínimo 3 caracteres';
        if (value.trim().length > 50) return 'Máximo 50 caracteres';
        if (!/^[a-zA-Z0-9_]+$/.test(value)) return 'Solo letras, números y guiones bajos';
        return '';
      case 'email':
        if (!value.trim()) return 'El correo es requerido';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Correo no válido';
        return '';
      case 'telefono':
        if (value && value.length > 20) return 'Máximo 20 caracteres';
        return '';
      case 'direccion':
        if (value && value.length > 200) return 'Máximo 200 caracteres';
        return '';
      case 'password':
        if (!user && !value) return 'La contraseña es requerida';
        if (value) {
          if (value.length < 8) return 'Mínimo 8 caracteres';
          if (!/[A-Z]/.test(value)) return 'Debe incluir una mayúscula';
          if (!/[a-z]/.test(value)) return 'Debe incluir una minúscula';
          if (!/\d/.test(value)) return 'Debe incluir un número';
          if (value.length > 100) return 'Máximo 100 caracteres';
        }
        return '';
      default:
        return '';
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    const fields = ['nombre', 'apellidos', 'username', 'email', 'telefono', 'direccion'];
    if (!user) fields.push('password');
    else if (formData.password) fields.push('password');

    fields.forEach((key) => {
      const error = validateField(key, (formData as any)[key] ?? '');
      if (error) newErrors[key] = error;
    });

    if (formData.roleIds.length === 0) newErrors.roleIds = 'Debe seleccionar un rol';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFieldChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      const error = validateField(name, value);
      setErrors((prev) => {
        const next = { ...prev };
        if (error) next[name] = error; else delete next[name];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch {
      // el store maneja el error
    } finally {
      setLoading(false);
    }
  };

  const inputCls = (field: string) =>
    `w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border rounded-xl text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 ${
      errors[field] ? 'border-red-400 dark:border-red-500/50' : 'border-slate-200 dark:border-slate-800'
    }`;

  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">{children}</h3>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-6 bg-slate-900/70 backdrop-blur-md anim-fade-in">
      <div className="my-auto bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden anim-scale-in flex flex-col max-h-[calc(100dvh-1.5rem)] border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-500/10 dark:to-indigo-500/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl text-white shadow-md shadow-blue-500/25">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">{user ? 'Editar Usuario' : 'Nuevo Usuario'}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">{user ? 'Actualiza los datos y el acceso' : 'Registra una nueva cuenta'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-white/60 dark:hover:bg-slate-800 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-5 space-y-5">
          {/* Datos personales */}
          <div className="space-y-3.5">
            <SectionTitle>Datos personales</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-sm font-medium mb-1.5">Nombre *</label>
                <input type="text" value={formData.nombre} onChange={(e) => handleFieldChange('nombre', e.target.value)} className={inputCls('nombre')} placeholder="Ej. Juan" />
                {errors.nombre && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.nombre}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Apellidos *</label>
                <input type="text" value={formData.apellidos} onChange={(e) => handleFieldChange('apellidos', e.target.value)} className={inputCls('apellidos')} placeholder="Ej. Pérez" />
                {errors.apellidos && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.apellidos}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Teléfono</label>
                <input type="tel" value={formData.telefono} onChange={(e) => handleFieldChange('telefono', e.target.value)} className={inputCls('telefono')} placeholder="Ej. +51 999 888 777" />
                {errors.telefono && <p className="text-red-500 text-xs mt-1">{errors.telefono}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Dirección</label>
                <input type="text" value={formData.direccion} onChange={(e) => handleFieldChange('direccion', e.target.value)} className={inputCls('direccion')} placeholder="Ej. Av. Principal 123" />
                {errors.direccion && <p className="text-red-500 text-xs mt-1">{errors.direccion}</p>}
              </div>
            </div>
          </div>

          {/* Acceso */}
          <div className="space-y-3.5 pt-1">
            <SectionTitle>Acceso</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-sm font-medium mb-1.5">Usuario (username) *</label>
                <input type="text" value={formData.username} onChange={(e) => handleFieldChange('username', e.target.value)} className={inputCls('username')} placeholder="Ej. jperez" />
                {errors.username && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.username}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Correo electrónico *</label>
                <input type="email" value={formData.email} onChange={(e) => handleFieldChange('email', e.target.value)} className={inputCls('email')} placeholder="Ej. jperez@empresa.com" />
                {errors.email && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.email}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">
                Contraseña {user ? <span className="text-slate-400 font-normal">(dejar en blanco para no cambiarla)</span> : '*'}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleFieldChange('password', e.target.value)}
                  onFocus={() => setPasswordFocused(true)}
                  className={inputCls('password') + ' pr-11'}
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.password}</p>}

              {(passwordFocused || formData.password) && (
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  {passwordChecks.map((c) => (
                    <span key={c.label} className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${c.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
                      <Check className={`w-3.5 h-3.5 ${c.ok ? '' : 'opacity-30'}`} />
                      {c.label}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={formData.activo} onChange={(e) => setFormData({ ...formData, activo: e.target.checked })} />
                <div className="w-11 h-6 bg-slate-200 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
              <div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Usuario activo</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Puede iniciar sesión y ser asignado a tickets</p>
              </div>
            </div>
          </div>

          {/* Rol */}
          <div className="space-y-3.5 pt-1">
            <SectionTitle>Rol y permisos</SectionTitle>
            <div>
              <label className="block text-sm font-medium mb-1.5">Rol *</label>
              <select
                value={formData.roleIds[0] || ''}
                onChange={(e) => {
                  setFormData({ ...formData, roleIds: [parseInt(e.target.value)] });
                  if (errors.roleIds) setErrors((prev) => { const n = { ...prev }; delete n.roleIds; return n; });
                }}
                className={inputCls('roleIds')}
              >
                <option value="" disabled>Seleccione un rol</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.name} — {r.description}</option>
                ))}
              </select>
              {errors.roleIds && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.roleIds}</p>}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button type="button" onClick={onClose} className="px-4 py-2.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-medium transition-colors active:scale-95">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold transition-all shadow-md shadow-blue-500/25 disabled:opacity-50 flex items-center gap-2 active:scale-95">
              <Save className="w-4 h-4" />
              {loading ? 'Guardando...' : (user ? 'Guardar cambios' : 'Crear usuario')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
