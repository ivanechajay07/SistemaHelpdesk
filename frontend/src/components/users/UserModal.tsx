import React, { useState, useEffect } from 'react';
import { X, UserPlus, Save } from 'lucide-react';
import type { User } from '../../store/userStore';

import { useRoleStore } from '../../store/roleStore';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  user: User | null;
}

export function UserModal({ isOpen, onClose, onSubmit, user }: UserModalProps) {
  const { roles, fetchRoles } = useRoleStore();
  
  useEffect(() => {
    if (roles.length === 0) {
      fetchRoles();
    }
  }, []);

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    nombre: '',
    apellidos: '',
    activo: true,
    roleIds: [] as number[]
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      const userRoleIds = user.roles
        .map(roleName => roles.find(r => r.name === roleName)?.id)
        .filter((id): id is number => id !== undefined);

      setFormData({
        username: user.username,
        email: user.email,
        password: '',
        nombre: user.nombre,
        apellidos: user.apellidos,
        activo: user.activo,
        roleIds: userRoleIds.length > 0 ? userRoleIds : (roles.length > 0 ? [roles[0].id] : [])
      });
    } else {
      setFormData({
        username: '',
        email: '',
        password: '',
        nombre: '',
        apellidos: '',
        activo: true,
        roleIds: roles.length > 0 ? [roles.find(r => r.name === 'TECNICO')?.id || roles[0].id] : []
      });
    }
    setErrors({});
  }, [user, isOpen, roles]);

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
      case 'password':
        if (!user && !value) return 'La contraseña es requerida';
        if (value && value.length < 6) return 'Mínimo 6 caracteres';
        if (value && value.length > 100) return 'Máximo 100 caracteres';
        return '';
      default:
        return '';
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    const fieldsToValidate = ['nombre', 'apellidos', 'username', 'email'];
    if (!user) fieldsToValidate.push('password');
    
    fieldsToValidate.forEach(key => {
      const error = validateField(key, formData.username && key === 'password' ? formData.password : (formData as any)[key]);
      if (error) newErrors[key] = error;
    });

    if (formData.roleIds.length === 0) {
      newErrors.roleIds = 'Debe seleccionar al menos un rol';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFieldChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      const error = validateField(name, value);
      setErrors(prev => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-6 bg-slate-900/70 backdrop-blur-md anim-fade-in">
      <div className="my-auto bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden anim-scale-in flex flex-col max-h-[calc(100dvh-1.5rem)] border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-500/20 rounded-lg text-blue-600 dark:text-blue-400">
              <UserPlus className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-semibold">{user ? 'Editar Usuario' : 'Nuevo Usuario'}</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4 space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-sm font-medium mb-1">Nombre</label>
              <input
                type="text"
                required
                value={formData.nombre}
                onChange={(e) => handleFieldChange('nombre', e.target.value)}
                className={`w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  errors.nombre ? 'border-red-500' : 'border-slate-200 dark:border-slate-800'
                }`}
              />
              {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Apellidos</label>
              <input
                type="text"
                required
                value={formData.apellidos}
                onChange={(e) => handleFieldChange('apellidos', e.target.value)}
                className={`w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  errors.apellidos ? 'border-red-500' : 'border-slate-200 dark:border-slate-800'
                }`}
              />
              {errors.apellidos && <p className="text-red-500 text-xs mt-1">{errors.apellidos}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Usuario (Username)</label>
              <input
                type="text"
                required
                value={formData.username}
                onChange={(e) => handleFieldChange('username', e.target.value)}
                className={`w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  errors.username ? 'border-red-500' : 'border-slate-200 dark:border-slate-800'
                }`}
              />
              {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Correo Electrónico</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => handleFieldChange('email', e.target.value)}
                className={`w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  errors.email ? 'border-red-500' : 'border-slate-200 dark:border-slate-800'
                }`}
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Contraseña {user && '(Dejar en blanco para no cambiar)'}</label>
              <input
                type="password"
                required={!user}
                value={formData.password}
                onChange={(e) => handleFieldChange('password', e.target.value)}
                className={`w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  errors.password ? 'border-red-500' : 'border-slate-200 dark:border-slate-800'
                }`}
              />
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
            </div>
    <div>
      <label className="block text-sm font-medium mb-1">Rol</label>
      <select
        value={formData.roleIds[0] || ''}
        onChange={(e) => {
          setFormData({ ...formData, roleIds: [parseInt(e.target.value)] });
          if (errors.roleIds) setErrors(prev => { const next = { ...prev }; delete next.roleIds; return next; });
        }}
        className={`w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
          errors.roleIds ? 'border-red-500' : 'border-slate-200 dark:border-slate-800'
        }`}
      >
        <option value="" disabled>Seleccione un rol</option>
        {roles.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name} - {r.description}
          </option>
        ))}
      </select>
      {errors.roleIds && <p className="text-red-500 text-xs mt-1">{errors.roleIds}</p>}
    </div>
          </div>
          
          <div className="flex items-center gap-2 pt-1">
            <input 
              type="checkbox" 
              id="activo" 
              checked={formData.activo}
              onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
            />
            <label htmlFor="activo" className="text-sm font-medium">Usuario Activo</label>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-medium transition-colors active:scale-95"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-medium transition-all shadow-md shadow-blue-500/25 disabled:opacity-50 flex items-center gap-2 active:scale-95"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Guardando...' : 'Guardar Usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
