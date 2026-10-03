import { create } from 'zustand';

const THEME_KEY = 'theme';
const AUTO_KEY = 'themeAuto';

/**
 * Horario automático de tema:
 * - Tema oscuro de 19:00 a 06:59.
 * - Tema claro de 07:00 a 18:59.
 */
export function isNightTime(d: Date = new Date()): boolean {
  const h = d.getHours();
  return h >= 19 || h < 7;
}

interface ThemeState {
  isDark: boolean;
  /** Si está activo, el tema se ajusta solo según la hora. */
  autoSchedule: boolean;
  toggleTheme: () => void;
  setAutoSchedule: (enabled: boolean) => void;
  /** Reevalúa el tema según la hora (no hace nada si el modo automático está apagado). */
  applyScheduledTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => {
  const savedTheme = localStorage.getItem(THEME_KEY);
  const autoSchedule = localStorage.getItem(AUTO_KEY) === 'true';
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initialIsDark = autoSchedule
    ? isNightTime()
    : savedTheme
      ? savedTheme === 'dark'
      : prefersDark;

  return {
    isDark: initialIsDark,
    autoSchedule,

    toggleTheme: () =>
      set((state) => {
        // Con el horario automático activo, el tema lo controla la hora.
        if (state.autoSchedule) return state;
        const newIsDark = !state.isDark;
        localStorage.setItem(THEME_KEY, newIsDark ? 'dark' : 'light');
        return { isDark: newIsDark };
      }),

    setAutoSchedule: (enabled) => {
      localStorage.setItem(AUTO_KEY, enabled ? 'true' : 'false');
      if (enabled) {
        const dark = isNightTime();
        localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
        set({ autoSchedule: true, isDark: dark });
      } else {
        set({ autoSchedule: false });
      }
    },

    applyScheduledTheme: () => {
      if (!get().autoSchedule) return;
      const dark = isNightTime();
      if (dark !== get().isDark) {
        localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
        set({ isDark: dark });
      }
    },
  };
});
