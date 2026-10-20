'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  toggleTheme: () => {},
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // اقرأ الثيم من localStorage أو الإعدادات
    const saved = localStorage.getItem('absher_theme') as Theme | null;
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initial: Theme = saved || (systemDark ? 'dark' : 'light');

    setThemeState(initial);
    document.documentElement.setAttribute('data-theme', initial);
    setMounted(true);
  }, []);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem('absher_theme', t);
    document.documentElement.setAttribute('data-theme', t);
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  // منع flash قبل hydration
  if (!mounted) {
    return (
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              try {
                var saved = localStorage.getItem('absher_theme');
                var sysDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                var theme = saved || (sysDark ? 'dark' : 'light');
                document.documentElement.setAttribute('data-theme', theme);
              } catch(e) {}
            })();
          `,
        }}
      />
    );
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
