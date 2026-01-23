'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Language, TranslationKey, getTranslation } from '@/lib/i18n';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const [theme, setThemeState] = useState<Theme>('light');
  const [language, setLanguageState] = useState<Language>('en');
  const [mounted, setMounted] = useState(false);

  // Load saved preferences from localStorage
  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    const savedLanguage = localStorage.getItem('language') as Language | null;
    
    if (savedTheme) {
      setThemeState(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    }
    
    if (savedLanguage) {
      setLanguageState(savedLanguage);
    }
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  };

  const t = (key: TranslationKey): string => {
    return getTranslation(language, key);
  };

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <ThemeContext.Provider
        value={{
          theme: 'light',
          setTheme: () => {},
          toggleTheme: () => {},
          language: 'en',
          setLanguage: () => {},
          t: (key) => getTranslation('en', key),
        }}
      >
        {children}
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
        language,
        setLanguage,
        t,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;
