import * as SystemUI from "expo-system-ui";
import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import { useColorScheme } from "react-native";
import { storage } from "../storage/storage";
import { darkTheme, lightTheme } from "../theme/tokens";

interface ThemeContextValue {
  theme: typeof darkTheme;
  isDark: boolean;
  themeMode: "light" | "dark";
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider = ({ children }: PropsWithChildren) => {
  const systemColorScheme = useColorScheme();
  const [storedThemeMode, setStoredThemeMode] = useState<"light" | "dark" | null>(null);
  const resolvedThemeMode = storedThemeMode ?? (systemColorScheme === "light" ? "light" : "dark");
  const theme = resolvedThemeMode === "light" ? lightTheme : darkTheme;

  useEffect(() => {
    storage.loadThemeMode().then((value) => {
      if (value === "light" || value === "dark") {
        setStoredThemeMode(value);
      }
    });
  }, []);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(theme.colors.background).catch(() => undefined);
  }, [theme.colors.background]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      isDark: theme.mode === "dark",
      themeMode: resolvedThemeMode,
      toggleTheme: () => {
        const nextMode = resolvedThemeMode === "dark" ? "light" : "dark";
        setStoredThemeMode(nextMode);
        void storage.saveThemeMode(nextMode);
      },
    }),
    [resolvedThemeMode, theme]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export const useAppTheme = () => {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useAppTheme must be used within ThemeProvider");
  }

  return context;
};
