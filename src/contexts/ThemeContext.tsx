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
    const saved = localStorage.getItem("admin-theme");
    return (saved as Theme) || "clean";
  });

  useEffect(() => {
    localStorage.setItem("admin-theme", theme);
    document.documentElement.classList.toggle("clean-theme", theme === "clean");
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "clean" : "dark"));

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
};
