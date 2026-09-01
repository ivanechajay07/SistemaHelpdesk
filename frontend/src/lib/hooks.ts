import { useEffect, useMemo, useState, type RefObject } from 'react';

/**
 * Paginación client-side sobre un arreglo ya filtrado.
 * Recorta la página actual automáticamente si los filtros reducen el total.
 */
export function usePagedList<T>(items: T[], initialSize = 10) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialSize);

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;

  const paged = useMemo(
    () => items.slice(start, start + pageSize),
    [items, start, pageSize]
  );

  return {
    page: safePage,
    setPage,
    pageSize,
    setPageSize,
    paged,
    total,
    totalPages,
  };
}

export function useClickOutside(
  ref: RefObject<HTMLElement | null>,
  handler: () => void
) {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }
      handler();
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
}

export const PROFILE_IMAGE_EVENT = 'profile-image-updated';

export function getProfileImage(userId?: number | null): string | null {
  if (!userId) return null;
  try {
    return localStorage.getItem(`profile_image_${userId}`);
  } catch {
    return null;
  }
}

/** Imagen de perfil del usuario (localStorage) reactiva a cambios desde Settings */
export function useProfileImage(userId?: number | null): string | null {
  const [image, setImage] = useState<string | null>(() => getProfileImage(userId));

  useEffect(() => {
    setImage(getProfileImage(userId));
    const refresh = () => setImage(getProfileImage(userId));
    window.addEventListener(PROFILE_IMAGE_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(PROFILE_IMAGE_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [userId]);

  return image;
}
