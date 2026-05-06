import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Theme = "dark" | "clean";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({ theme: "dark", toggleTheme: () => {} });

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    // Migração: limpa a chave antiga para forçar default branco em quem já visitou
    try { localStorage.removeItem("admin-theme"); } catch {}
    const saved = localStorage.getItem("viu-theme-v2");
    return (saved as Theme) || "clean";
  });

  useEffect(() => {
    localStorage.setItem("viu-theme-v2", theme);
    document.documentElement.classList.toggle("dark-theme", theme === "dark");
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "clean" : "dark"));

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
};
