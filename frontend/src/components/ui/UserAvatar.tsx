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

interface UserAvatarProps {
  userId?: number | null;
  name?: string | null;
  size?: number;
}

/**
 * Avatar de usuario: usa la foto de perfil guardada (localStorage) o iniciales
 * con un color derivado del nombre. Si no hay nombre, muestra un avatar vacío.
 */
export default function UserAvatar({ userId, name, size = 34 }: UserAvatarProps) {
  const image = useProfileImage(userId ?? undefined);
  const clean = (name || '').trim();

  if (!clean) {
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

  const initials = clean.split(/\s+/).slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join('');
  const idx = clean.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_GRADIENTS.length;

  return image ? (
    <img
      src={image}
      alt={clean}
      style={{ width: size, height: size }}
      className="rounded-full object-cover ring-2 ring-white dark:ring-slate-900 shadow shrink-0"
      title={clean}
    />
  ) : (
    <div
      style={{ width: size, height: size }}
      className={`rounded-full bg-gradient-to-br ${AVATAR_GRADIENTS[idx]} flex items-center justify-center text-white font-bold ring-2 ring-white dark:ring-slate-900 shadow shrink-0`}
      title={clean}
    >
      <span style={{ fontSize: Math.max(9, size * 0.36) }}>{initials}</span>
    </div>
  );
}
