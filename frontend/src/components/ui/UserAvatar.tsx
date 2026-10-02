import { useState } from 'react';
import { User } from 'lucide-react';
import { useProfileImage } from '../../lib/hooks';

const AVATAR_GRADIENTS = [
  'from-blue-500 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-fuchsia-500 to-pink-600',
  'from-amber-500 to-orange-600',
  'from-cyan-500 to-sky-600',
  'from-violet-500 to-purple-600',
];

const API_BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace('/api/v1', '')
  : 'http://localhost:8081';

interface UserAvatarProps {
  userId?: number | null;
  name?: string | null;
  size?: number;
}

/**
 * Avatar de usuario: intenta la foto subida al backend, luego la guardada
 * localmente, y si no hay ninguna muestra las iniciales con color.
 */
export default function UserAvatar({ userId, name, size = 34 }: UserAvatarProps) {
  const localImage = useProfileImage(userId ?? undefined);
  const [serverFailed, setServerFailed] = useState(false);
  const clean = (name || '').trim();

  const serverUrl = userId && !serverFailed ? `${API_BASE}/api/v1/users/${userId}/avatar` : null;
  const src = serverUrl || localImage;

  if (!clean && !src) {
    return (
      <div
        style={{ width: size, height: size }}
        className="rounded-full border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-400 shrink-0"
        title="Sin asignar"
      >
        <User style={{ width: size * 0.5, height: size * 0.5 }} />
      </div>
    );
  }

  if (src) {
    return (
      <img
        src={src}
        alt={clean || 'Usuario'}
        style={{ width: size, height: size }}
        className="rounded-full object-cover ring-2 ring-white dark:ring-slate-900 shadow shrink-0"
        title={clean}
        onError={() => { if (serverUrl) setServerFailed(true); }}
      />
    );
  }

  const initials = clean.split(/\s+/).slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join('');
  const idx = clean.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_GRADIENTS.length;

  return (
    <div
      style={{ width: size, height: size }}
      className={`rounded-full bg-gradient-to-br ${AVATAR_GRADIENTS[idx]} flex items-center justify-center text-white font-bold ring-2 ring-white dark:ring-slate-900 shadow shrink-0`}
      title={clean}
    >
      <span style={{ fontSize: Math.max(9, size * 0.36) }}>{initials}</span>
    </div>
  );
}
