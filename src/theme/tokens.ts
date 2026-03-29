import type { Quadrant } from "../types/decision";

export interface AppTheme {
  mode: "light" | "dark";
  colors: {
    background: string;
    backgroundTop: string;
    backgroundBottom: string;
    surface: string;
    surfaceMuted: string;
    surfaceInset: string;
    surfaceElevated: string;
    accent: string;
    accentStrong: string;
    accentWash: string;
    text: string;
    textMuted: string;
    textSoft: string;
    stroke: string;
    highlight: string;
    shadowDark: string;
    shadowLight: string;
    danger: string;
    success: string;
  };
  quadrants: Record<Quadrant, { tint: string; solid: string }>;
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  radius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
    pill: number;
  };
}

const shared = {
  spacing: {
    xs: 6,
    sm: 10,
    md: 16,
    lg: 20,
    xl: 28,
    xxl: 36,
  },
  radius: {
    sm: 12,
    md: 16,
    lg: 22,
    xl: 28,
    pill: 999,
  },
};

export const lightTheme: AppTheme = {
  mode: "light",
  colors: {
    background: "#EDF2F8",
    backgroundTop: "#F7FBFF",
    backgroundBottom: "#E1E8EF",
    surface: "#F1F6FB",
    surfaceMuted: "#E8EEF5",
    surfaceInset: "#E2E9F1",
    surfaceElevated: "#FAFBFD",
    accent: "#6E8EAB",
    accentStrong: "#3F5F7B",
    accentWash: "rgba(110, 142, 171, 0.14)",
    text: "#182534",
    textMuted: "#526579",
    textSoft: "#718398",
    stroke: "rgba(255,255,255,0.58)",
    highlight: "rgba(255,255,255,0.82)",
    shadowDark: "rgba(132, 156, 180, 0.28)",
    shadowLight: "rgba(255,255,255,0.92)",
    danger: "#B35C5C",
    success: "#5B7D67",
  },
  quadrants: {
    doNow: { tint: "rgba(112, 167, 224, 0.16)", solid: "#4F7FA8" },
    schedule: { tint: "rgba(96, 157, 150, 0.16)", solid: "#5D8D87" },
    delegate: { tint: "rgba(190, 147, 92, 0.18)", solid: "#B17A3C" },
    eliminate: { tint: "rgba(117, 133, 153, 0.16)", solid: "#6D7D90" },
  },
  ...shared,
};

export const darkTheme: AppTheme = {
  mode: "dark",
  colors: {
    background: "#0A0D11",
    backgroundTop: "#131921",
    backgroundBottom: "#090B0F",
    surface: "#141A22",
    surfaceMuted: "#10151C",
    surfaceInset: "#0D1218",
    surfaceElevated: "#1B2430",
    accent: "#7E94A9",
    accentStrong: "#D8E0E8",
    accentWash: "rgba(126, 148, 169, 0.14)",
    text: "#F3F6F8",
    textMuted: "#A8B2BC",
    textSoft: "#707B87",
    stroke: "rgba(255,255,255,0.075)",
    highlight: "rgba(255,255,255,0.06)",
    shadowDark: "rgba(0,0,0,0.42)",
    shadowLight: "rgba(255,255,255,0.02)",
    danger: "#C98282",
    success: "#8EB89F",
  },
  quadrants: {
    doNow: { tint: "rgba(163, 197, 224, 0.16)", solid: "#C4DCF2" },
    schedule: { tint: "rgba(123, 154, 188, 0.16)", solid: "#9EB9D3" },
    delegate: { tint: "rgba(184, 155, 112, 0.15)", solid: "#D1B07E" },
    eliminate: { tint: "rgba(122, 133, 147, 0.16)", solid: "#B4BDC8" },
  },
  ...shared,
};
