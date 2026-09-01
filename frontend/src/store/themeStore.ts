import { create } from 'zustand';

interface ThemeState {
  isDark: boolean;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set) => {
  // Check local storage or system preference on load
  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  const initialIsDark = savedTheme ? savedTheme === 'dark' : prefersDark;

  return {
    isDark: initialIsDark,
    toggleTheme: () => set((state) => {
      const newIsDark = !state.isDark;
      localStorage.setItem('theme', newIsDark ? 'dark' : 'light');
      return { isDark: newIsDark };
    })
  };
});
