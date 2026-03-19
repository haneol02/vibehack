import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

const THEMES = [
  { id: 'deep-dark', label: 'Deep Dark', emoji: '🌑' },
  { id: 'dark', label: 'Dark', emoji: '🌙' },
  { id: 'light', label: 'Light', emoji: '☀️' },
  { id: 'hacker', label: 'Hacker', emoji: '💚' },
  { id: 'cyberpunk', label: 'Cyberpunk', emoji: '🌸' },
  { id: 'solarized', label: 'Solarized', emoji: '🔵' },
  { id: 'pastel', label: 'Pastel', emoji: '🍬' },
  { id: 'ocean', label: 'Ocean', emoji: '🌊' },
  { id: 'sunset', label: 'Sunset', emoji: '🌅' },
];

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('vibehack-theme') || 'deep-dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('vibehack-theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
