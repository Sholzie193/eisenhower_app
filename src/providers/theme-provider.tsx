import * as SystemUI from "expo-system-ui";
import { createContext, useContext, useEffect, type PropsWithChildren } from "react";
import { darkTheme } from "../theme/tokens";

interface ThemeContextValue {
  theme: typeof darkTheme;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider = ({ children }: PropsWithChildren) => {
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(darkTheme.colors.background).catch(() => undefined);
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme: darkTheme,
        isDark: true,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useAppTheme = () => {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useAppTheme must be used within ThemeProvider");
  }

  return context;
};
